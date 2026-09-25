// Background entry point: wires the marker store, TST client, menus, and notices together.

import { buildTstStyle } from '../lib/css.js';
import { isValidEmoji, isValidTabId } from '../lib/validate.js';
import { createMarkerStore } from './marker-store.js';
import { createMenus, routeMenuClick } from './menus.js';
import { createNotifier } from './notifier.js';
import { createRecentStore } from './recent-store.js';
import { TST_ID, createTstClient } from './tst-client.js';

const PICKER_PATH = 'picker/picker.html';
const TST_RELOAD_TYPES = new Set(['ready', 'permissions-changed']);

// Map<colorIndex, tabId[]> from the marker cache, used to re-apply TST states.
function groupByColor(markers) {
  const byColor = new Map();
  for (const [tabId, marker] of markers) {
    if (marker.color === undefined) continue;
    if (!byColor.has(marker.color)) byColor.set(marker.color, []);
    byColor.get(marker.color).push(tabId);
  }
  for (const ids of byColor.values()) ids.sort((a, b) => a - b);
  return byColor;
}

export function createApp({ browser, log = console, styleDelayMs = 50 }) {
  const store = createMarkerStore({ browser, log });
  const recent = createRecentStore({ browser });
  const tst = createTstClient({ browser, log });
  const notifier = createNotifier({ browser, log });

  let initPromise = null;
  let styleTimer = null;
  let pendingStyle = null; // { promise, resolve } for the scheduled refresh
  let runningStyle = Promise.resolve();
  let notifyStyleFailure = false;

  function init() {
    initPromise ??= (async () => {
      await createMenus(browser);
      await store.init();
      store.onChange(() => requestStyle());
      const result = await registerAndReapply();
      if (!result.ok)
        log.warn('[picasso] Tree Style Tab not available at start-up:', result.reason);
    })();
    return initPromise;
  }

  async function registerAndReapply() {
    const registered = await tst.register(buildTstStyle(store.all()));
    if (!registered.ok) return registered;
    return tst.applyColors(groupByColor(store.all()));
  }

  // Debounced style refresh. `notify` marks that a user action is waiting for the result.
  function requestStyle({ notify = false } = {}) {
    notifyStyleFailure ||= notify;
    clearTimeout(styleTimer);
    if (!pendingStyle) {
      let resolve;
      const promise = new Promise((r) => (resolve = r));
      pendingStyle = { promise, resolve };
    }
    const current = pendingStyle;
    styleTimer = setTimeout(() => {
      pendingStyle = null;
      const shouldNotify = notifyStyleFailure;
      notifyStyleFailure = false;
      runningStyle = (async () => {
        const result = await tst.register(buildTstStyle(store.all()));
        if (!result.ok && shouldNotify) await notifier.notify(result.reason);
      })()
        .catch((error) => log.error('[picasso] Style refresh failed', error))
        .finally(current.resolve);
    }, styleDelayMs);
    return current.promise;
  }

  async function colorSubtree(tabId, index) {
    const subtree = await tst.getSubtree(tabId);
    if (!subtree.ok) return notifier.notify(subtree.reason);
    const applied = await tst.setColor(subtree.value, index);
    if (!applied.ok) return notifier.notify(applied.reason);
    const saved = await store.setColor(subtree.value, index);
    if (!saved.ok) log.warn('[picasso] Some tabs closed before their color was saved', saved);
    return undefined;
  }

  async function setEmoji(tabId, emoji) {
    const result = await store.setEmoji(tabId, emoji);
    if (!result.ok) return result;
    if (emoji !== null) await recent.push(emoji);
    requestStyle({ notify: true });
    return result;
  }

  async function clearEverything() {
    const tabs = await browser.tabs.query({});
    const ids = tabs.map((t) => t.id).filter(isValidTabId);
    const cleared = await tst.setColor(ids, null);
    if (!cleared.ok) await notifier.notify(cleared.reason);
    const result = await store.clearAll();
    if (!result.ok) log.error('[picasso] Could not remove all markers', result);
  }

  async function openPicker(tabId) {
    try {
      await browser.windows.create({
        url: browser.runtime.getURL(`${PICKER_PATH}?tabId=${tabId}`),
        type: 'popup',
        width: 460,
        height: 640
      });
    } catch (error) {
      log.error('[picasso] Could not open the emoji picker', error);
      await notifier.notify('popup-blocked');
    }
  }

  async function handleMenuClick(info, tab) {
    const action = routeMenuClick(info);
    if (!action || !isValidTabId(tab?.id)) return;
    await init();
    switch (action.kind) {
      case 'color':
        return colorSubtree(tab.id, action.index);
      case 'clear-color':
        return colorSubtree(tab.id, null);
      case 'clear-emoji':
        return setEmoji(tab.id, null);
      case 'clear-both':
        await setEmoji(tab.id, null);
        return colorSubtree(tab.id, null);
      case 'clear-everything':
        return clearEverything();
      case 'open-picker':
        return openPicker(tab.id);
      default:
        return undefined;
    }
  }

  function isOwnPage(sender) {
    const origin = browser.runtime.getURL('');
    return sender?.id === browser.runtime.id && String(sender?.url ?? '').startsWith(origin);
  }

  // Returns undefined for messages we do not own so other listeners can answer them.
  function handleMessage(message, sender) {
    if (message?.type !== 'picasso:set-emoji') return undefined;
    const { tabId, emoji } = message;
    const valid =
      isOwnPage(sender) && isValidTabId(tabId) && (emoji === null || isValidEmoji(emoji));
    if (!valid) return Promise.resolve({ ok: false, error: 'invalid' });
    return init().then(() => setEmoji(tabId, emoji));
  }

  async function handleExternalMessage(message, sender) {
    if (sender?.id !== TST_ID || !TST_RELOAD_TYPES.has(message?.type)) return;
    await init();
    const result = await registerAndReapply();
    if (!result.ok) log.warn('[picasso] Re-register with Tree Style Tab failed:', result.reason);
  }

  async function handleTabCreated(tab, delayMs) {
    await init();
    await store.onTabCreated(tab, delayMs);
    const marker = store.get(tab.id);
    if (marker?.color !== undefined) await tst.setColor([tab.id], marker.color);
  }

  async function start() {
    browser.menus.onClicked.addListener(handleMenuClick);
    browser.runtime.onMessage.addListener(handleMessage);
    browser.runtime.onMessageExternal.addListener(handleExternalMessage);
    browser.runtime.onInstalled.addListener(() => init());
    browser.runtime.onStartup.addListener(() => init());
    browser.tabs.onRemoved.addListener((tabId) => store.onTabRemoved(tabId));
    browser.tabs.onCreated.addListener((tab) => handleTabCreated(tab));
    await init();
  }

  return {
    start,
    handleTabCreated,
    // Test helper: wait for the scheduled or running style refresh.
    flush: () => pendingStyle?.promise ?? runningStyle
  };
}

if (globalThis.browser?.runtime?.id && !globalThis.__PICASSO_TEST__) {
  createApp({ browser: globalThis.browser })
    .start()
    .catch((error) => console.error('[picasso] Start-up failed', error));
}
