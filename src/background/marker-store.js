import { createSerialQueue } from '../lib/queue.js';
import { isValidColor, isValidEmoji, isValidTabId, sanitizeMarker } from '../lib/validate.js';
import { LEGACY_EMOJI_KEY, MIGRATION_FLAG_KEY, planLegacyMigration } from '../lib/migration.js';

export const MARKER_KEY = 'picasso-marker-v1';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function createMarkerStore({
  browser,
  log = console,
  queue = createSerialQueue(),
  setTimeoutFn = setTimeout
}) {
  const cache = new Map();
  let initPromise = null;
  const listeners = new Set();

  function all() {
    const out = new Map();
    for (const [tabId, marker] of cache) {
      out.set(tabId, clone(marker));
    }
    return out;
  }

  function get(tabId) {
    return cache.has(tabId) ? clone(cache.get(tabId)) : null;
  }

  function notify() {
    for (const fn of listeners) {
      try {
        fn(all());
      } catch (e) {
        log.warn('marker-store listener failed', e);
      }
    }
  }

  async function runMigration() {
    const stored = await browser.storage.local.get([MIGRATION_FLAG_KEY, LEGACY_EMOJI_KEY]);
    if (stored[MIGRATION_FLAG_KEY] === true) return;

    const tabs = await browser.tabs.query({});
    const plan = planLegacyMigration(
      stored[LEGACY_EMOJI_KEY],
      tabs.map((t) => t.id)
    );

    for (const { tabId, emoji } of plan) {
      try {
        const raw = await browser.sessions.getTabValue(tabId, MARKER_KEY);
        const existing = sanitizeMarker(raw);
        await browser.sessions.setTabValue(tabId, MARKER_KEY, { ...existing, emoji });
      } catch (e) {
        log.warn('migration write failed for tab', { tabId, error: e });
      }
    }

    await browser.storage.local.remove(LEGACY_EMOJI_KEY);
    await browser.storage.local.set({ [MIGRATION_FLAG_KEY]: true });
  }

  async function buildCache() {
    const tabs = await browser.tabs.query({});
    for (const tab of tabs) {
      try {
        const raw = await browser.sessions.getTabValue(tab.id, MARKER_KEY);
        const marker = sanitizeMarker(raw);
        if (marker) cache.set(tab.id, marker);
      } catch (e) {
        log.warn('cache read failed for tab', { tabId: tab.id, error: e });
      }
    }
  }

  return {
    async init() {
      if (initPromise) return initPromise;
      initPromise = (async () => {
        await runMigration();
        await buildCache();
        notify();
      })();
      return initPromise;
    },

    get,
    all,

    async setColor(tabIds, colorOrNull) {
      if (
        !Array.isArray(tabIds) ||
        tabIds.some((id) => !isValidTabId(id)) ||
        !(colorOrNull === null || isValidColor(colorOrNull))
      ) {
        return { ok: false, error: 'invalid' };
      }

      const failed = [];
      let changed = false;

      await Promise.all(
        tabIds.map((tabId) =>
          queue.run(async () => {
            const current = cache.get(tabId) ?? null;
            let marker;
            if (colorOrNull === null) {
              if (!current) return;
              marker = { ...current };
              delete marker.color;
            } else {
              marker = { ...current, color: colorOrNull };
            }

            if (!marker || Object.keys(marker).length === 0) {
              try {
                await browser.sessions.removeTabValue(tabId, MARKER_KEY);
                if (cache.has(tabId)) {
                  cache.delete(tabId);
                  changed = true;
                }
              } catch (e) {
                log.warn('removeTabValue failed', { tabId, error: e });
                failed.push(tabId);
              }
              return;
            }

            try {
              await browser.sessions.setTabValue(tabId, MARKER_KEY, marker);
              cache.set(tabId, marker);
              changed = true;
            } catch (e) {
              log.warn('setTabValue failed', { tabId, error: e });
              failed.push(tabId);
            }
          })
        )
      );

      if (changed) notify();
      return failed.length > 0 ? { ok: false, error: 'storage', failed } : { ok: true };
    },

    async setEmoji(tabId, emojiOrNull) {
      if (!isValidTabId(tabId) || !(emojiOrNull === null || isValidEmoji(emojiOrNull))) {
        return { ok: false, error: 'invalid' };
      }

      return queue.run(async () => {
        const current = cache.get(tabId) ?? null;
        let marker;
        if (emojiOrNull === null) {
          if (!current) return { ok: true };
          marker = { ...current };
          delete marker.emoji;
        } else {
          marker = { ...current, emoji: emojiOrNull };
        }

        if (!marker || Object.keys(marker).length === 0) {
          try {
            await browser.sessions.removeTabValue(tabId, MARKER_KEY);
            cache.delete(tabId);
          } catch (e) {
            log.warn('removeTabValue failed', { tabId, error: e });
            return { ok: false, error: 'tab-gone' };
          }
        } else {
          try {
            await browser.sessions.setTabValue(tabId, MARKER_KEY, marker);
            cache.set(tabId, marker);
          } catch (e) {
            log.warn('setTabValue failed', { tabId, error: e });
            return { ok: false, error: 'tab-gone' };
          }
        }

        notify();
        return { ok: true };
      });
    },

    async clearAll() {
      const ids = [...cache.keys()];
      const failed = [];

      await Promise.all(
        ids.map((tabId) =>
          queue.run(async () => {
            try {
              await browser.sessions.removeTabValue(tabId, MARKER_KEY);
            } catch (e) {
              log.warn('clearAll remove failed', { tabId, error: e });
              failed.push(tabId);
            }
          })
        )
      );

      const had = cache.size > 0;
      cache.clear();
      if (had) notify();
      return failed.length > 0 ? { ok: false, error: 'storage' } : { ok: true };
    },

    onTabRemoved(tabId) {
      if (cache.has(tabId)) {
        cache.delete(tabId);
        notify();
      }
    },

    onTabCreated(tab, delayMs = 600) {
      const tabId = tab?.id;
      if (!isValidTabId(tabId)) return Promise.resolve();

      return new Promise((resolve) => {
        setTimeoutFn(async () => {
          try {
            const raw = await browser.sessions.getTabValue(tabId, MARKER_KEY);
            const marker = sanitizeMarker(raw);
            if (marker) {
              cache.set(tabId, marker);
              notify();
            }
          } catch (e) {
            log.warn('onCreated read failed', { tabId, error: e });
          }
          resolve();
        }, delayMs);
      });
    },

    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
