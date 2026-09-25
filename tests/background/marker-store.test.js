import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBrowserMock } from '../helpers/browser-mock.js';
import { createMarkerStore, MARKER_KEY } from '../../src/background/marker-store.js';
import { LEGACY_EMOJI_KEY, MIGRATION_FLAG_KEY } from '../../src/lib/migration.js';

describe('marker-store', () => {
  let browser;
  let log;
  let store;

  beforeEach(() => {
    browser = createBrowserMock({ tabs: [{ id: 1 }, { id: 2 }] });
    log = { warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    store = createMarkerStore({ browser, log });
  });

  it('[TM-090] setEmoji persists emoji and updates cache', async () => {
    const changed = vi.fn();
    store.onChange(changed);

    const result = await store.setEmoji(1, 'a');

    expect(result).toEqual({ ok: true });
    expect(browser.sessions.setTabValue).toHaveBeenCalledWith(1, MARKER_KEY, { emoji: 'a' });
    expect(store.get(1)).toEqual({ emoji: 'a' });
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('[TM-091] setColor then clearColor removes marker when no emoji remains', async () => {
    await store.setColor([1], 3);
    expect(store.get(1)).toEqual({ color: 3 });

    const result = await store.setColor([1], null);

    expect(result).toEqual({ ok: true });
    expect(browser.sessions.removeTabValue).toHaveBeenCalledWith(1, MARKER_KEY);
    expect(store.get(1)).toBeNull();
  });

  it('[TM-092] init builds cache from stored values and drops invalid fields', async () => {
    browser.__test.seedTabValue(1, MARKER_KEY, { color: 3, emoji: '🔥' });
    browser.__test.seedTabValue(2, MARKER_KEY, { color: 99, emoji: '' });
    const changed = vi.fn();
    store.onChange(changed);

    await store.init();

    expect(store.get(1)).toEqual({ color: 3, emoji: '🔥' });
    expect(store.get(2)).toBeNull();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('[TM-093] migration is skipped when the flag is already set', async () => {
    browser.__test.seedStorage({
      [MIGRATION_FLAG_KEY]: true,
      [LEGACY_EMOJI_KEY]: { 3: '🔥' }
    });
    browser.__test.seedTabValue(3, MARKER_KEY, { color: 2 });
    browser.__test.setTabs([{ id: 3 }]);

    await store.init();

    expect(browser.storage.local.remove).not.toHaveBeenCalled();
    expect(browser.__test.peekTabValue(3, MARKER_KEY)).toEqual({ color: 2 });
  });

  it('[TM-094] migration runs once and writes markers', async () => {
    browser.__test.seedStorage({ [LEGACY_EMOJI_KEY]: { 3: '🔥' } });
    browser.__test.setTabs([{ id: 3 }]);
    const changed = vi.fn();
    store.onChange(changed);

    const p1 = store.init();
    await p1;

    expect(browser.__test.peekTabValue(3, MARKER_KEY)).toEqual({ emoji: '🔥' });
    const storage = browser.__test.getStorage();
    expect(storage[MIGRATION_FLAG_KEY]).toBe(true);
    expect(storage[LEGACY_EMOJI_KEY]).toBeUndefined();
    expect(changed).toHaveBeenCalledTimes(1);

    const p2 = store.init();
    expect(p2).toBe(p1);
  });

  it('[TM-095] setEmoji on a closed tab returns tab-gone and logs', async () => {
    browser.__test.setTabs([]);

    const result = await store.setEmoji(1, 'a');

    expect(result).toEqual({ ok: false, error: 'tab-gone' });
    expect(log.warn).toHaveBeenCalled();
    expect(store.get(1)).toBeNull();
  });

  it('[TM-096] unawaited setEmoji and setColor both persist in order', async () => {
    const p1 = store.setEmoji(1, 'a');
    const p2 = store.setColor([1], 3);
    await Promise.all([p1, p2]);

    expect(browser.__test.peekTabValue(1, MARKER_KEY)).toEqual({ color: 3, emoji: 'a' });
    expect(store.get(1)).toEqual({ color: 3, emoji: 'a' });
  });

  it('[TM-097] onRemoved deletes the cache entry and notifies listeners', async () => {
    await store.setEmoji(1, 'a');
    const changed = vi.fn();
    store.onChange(changed);

    store.onTabRemoved(1);

    expect(store.get(1)).toBeNull();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('[TM-098] onCreated reads marker after delay and adds to cache', async () => {
    vi.useFakeTimers();
    try {
      browser.__test.setTabs([{ id: 5 }]);
      browser.__test.seedTabValue(5, MARKER_KEY, { emoji: 'x' });
      const changed = vi.fn();
      store.onChange(changed);

      const p = store.onCreated({ id: 5 });
      vi.advanceTimersByTime(600);
      await p;

      expect(store.get(5)).toEqual({ emoji: 'x' });
      expect(changed).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('[TM-099] onCreated for a tab closed before delay logs and leaves cache empty', async () => {
    vi.useFakeTimers();
    try {
      browser.__test.setTabs([{ id: 5 }]);
      browser.__test.seedTabValue(5, MARKER_KEY, { emoji: 'x' });

      const p = store.onCreated({ id: 5 });
      browser.__test.setTabs([]);
      vi.advanceTimersByTime(600);
      await p;

      expect(store.get(5)).toBeNull();
      expect(log.warn).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
