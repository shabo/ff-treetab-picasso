import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrowserMock } from '../helpers/browser-mock.js';
import { createApp } from '../../src/background/main.js';
import { MARKER_KEY } from '../../src/background/marker-store.js';
import { TST_ID } from '../../src/background/tst-client.js';
import { MENU_IDS } from '../../src/background/menus.js';

const MISSING = new Error('Could not establish connection. Receiving end does not exist.');

// TST fake: tab 1 has children 2 and 3; every other tab is a leaf.
function tstOk(browser) {
  browser.runtime.sendMessage.mockImplementation(async (id, msg) => {
    if (id !== TST_ID) return undefined;
    if (msg.type === 'get-light-tree') {
      return msg.tab === 1
        ? {
            id: 1,
            children: [
              { id: 2, children: [] },
              { id: 3, children: [] }
            ]
          }
        : { id: msg.tab, children: [] };
    }
    return true;
  });
}

const tstCalls = (browser, type) =>
  browser.runtime.sendMessage.mock.calls.filter(([id, msg]) => id === TST_ID && msg.type === type);

const log = () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn(), log: vi.fn() });

async function startApp(browser, logger = log()) {
  const app = createApp({ browser, log: logger, styleDelayMs: 0 });
  await app.start();
  return app;
}

const click = (browser, menuItemId, tabId = 1) =>
  browser.menus.onClicked.fire({ menuItemId }, { id: tabId, windowId: 1 });

describe('background main', () => {
  let browser;

  beforeEach(() => {
    browser = createBrowserMock({ tabs: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] });
    tstOk(browser);
  });

  it('[TM-110] init runs once even when onStartup and onInstalled also fire', async () => {
    await startApp(browser);
    await browser.runtime.onStartup.fire();
    await browser.runtime.onInstalled.fire({ reason: 'update' });
    expect(browser.menus.removeAll).toHaveBeenCalledTimes(1);
    expect(tstCalls(browser, 'register-self')).toHaveLength(1);
  });

  it('[TM-111] color menu colors the subtree and saves markers for each tab', async () => {
    const app = await startApp(browser);
    await click(browser, 'tabs-color-color-10');
    const add = tstCalls(browser, 'add-tab-state');
    expect(add).toHaveLength(1);
    expect(add[0][1]).toMatchObject({ tabs: [1, 2, 3], state: 'tabs-color-color-10' });
    for (const id of [1, 2, 3])
      expect(browser.__test.peekTabValue(id, MARKER_KEY)).toEqual({ color: 10 });
    expect(browser.__test.peekTabValue(4, MARKER_KEY)).toBeUndefined();
    await app.flush();
  });

  it('[TM-112] TST missing shows one notice per 30 s', async () => {
    browser.runtime.sendMessage.mockRejectedValue(MISSING);
    await startApp(browser);
    await click(browser, 'tabs-color-color-01');
    await click(browser, 'tabs-color-color-02');
    expect(browser.notifications.create).toHaveBeenCalledTimes(1);
    expect(browser.notifications.create.mock.calls[0][0]).toBe('picasso-tst-missing');
    expect(browser.__test.peekTabValue(1, MARKER_KEY)).toBeUndefined();
  });

  it('[TM-113] clear everything removes all markers and all TST states', async () => {
    browser.__test.seedTabValue(1, MARKER_KEY, { color: 2, emoji: '🔥' });
    browser.__test.seedTabValue(4, MARKER_KEY, { emoji: '😀' });
    await startApp(browser);
    await click(browser, MENU_IDS.clearEverything);
    const remove = tstCalls(browser, 'remove-tab-state').at(-1);
    expect(remove[1].tabs).toEqual([1, 2, 3, 4]);
    expect(browser.__test.peekTabValue(1, MARKER_KEY)).toBeUndefined();
    expect(browser.__test.peekTabValue(4, MARKER_KEY)).toBeUndefined();
  });

  it.each(['ready', 'permissions-changed'])(
    '[TM-114] TST "%s" re-registers and re-applies colors, one add-tab-state per color',
    async (type) => {
      browser.__test.seedTabValue(1, MARKER_KEY, { color: 2 });
      browser.__test.seedTabValue(2, MARKER_KEY, { color: 2 });
      browser.__test.seedTabValue(3, MARKER_KEY, { color: 5, emoji: '🔥' });
      await startApp(browser);
      browser.runtime.sendMessage.mockClear();
      await browser.runtime.onMessageExternal.fire({ type }, { id: TST_ID });
      expect(tstCalls(browser, 'register-self')).toHaveLength(1);
      const style = tstCalls(browser, 'register-self')[0][1].style;
      expect(style).toContain('tab-item[data-tab-id="3"]');
      const add = tstCalls(browser, 'add-tab-state').map(([, m]) => [m.state, m.tabs]);
      expect(add).toEqual(
        expect.arrayContaining([
          ['tabs-color-color-02', [1, 2]],
          ['tabs-color-color-05', [3]]
        ])
      );
      expect(add).toHaveLength(2);
    }
  );

  it('[TM-115] external messages from other add-ons are ignored', async () => {
    await startApp(browser);
    browser.runtime.sendMessage.mockClear();
    await browser.runtime.onMessageExternal.fire({ type: 'ready' }, { id: 'evil@example.com' });
    expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
  });

  describe('picasso:set-emoji', () => {
    const sender = () => ({
      id: browser.runtime.id,
      url: browser.runtime.getURL('picker/picker.html?tabId=1')
    });
    const send = async (msg, from = sender()) => {
      const [res] = await browser.runtime.onMessage.fire(msg, from);
      return res;
    };

    it.each([
      { type: 'picasso:set-emoji', tabId: -1, emoji: '🔥' },
      { type: 'picasso:set-emoji', tabId: 1, emoji: 'a'.repeat(65) },
      { type: 'picasso:set-emoji', tabId: 1, emoji: 5 },
      { type: 'picasso:set-emoji', tabId: '1', emoji: '🔥' },
      { type: 'picasso:set-emoji', tabId: 1 }
    ])('[TM-116] rejects invalid payload %j', async (msg) => {
      await startApp(browser);
      expect(await send(msg)).toEqual({ ok: false, error: 'invalid' });
      expect(browser.sessions.setTabValue).not.toHaveBeenCalled();
    });

    it('[TM-116] rejects messages from outside the extension', async () => {
      await startApp(browser);
      const res = await send(
        { type: 'picasso:set-emoji', tabId: 1, emoji: '🔥' },
        { id: 'other@example.com', url: 'https://example.com/' }
      );
      expect(res).toEqual({ ok: false, error: 'invalid' });
      expect(browser.sessions.setTabValue).not.toHaveBeenCalled();
    });

    it('ignores unknown message types', async () => {
      await startApp(browser);
      expect(await send({ type: 'something-else' })).toBeUndefined();
    });

    it('[TM-117] valid message saves marker, updates recent list, refreshes style', async () => {
      const app = await startApp(browser);
      expect(await send({ type: 'picasso:set-emoji', tabId: 1, emoji: '🔥' })).toEqual({
        ok: true
      });
      expect(browser.__test.peekTabValue(1, MARKER_KEY)).toEqual({ emoji: '🔥' });
      expect(browser.__test.getStorage()['picasso-recent-emojis-v1']).toEqual(['🔥']);
      await app.flush();
      const style = tstCalls(browser, 'register-self').at(-1)[1].style;
      expect(style).toContain('content: "🔥"');
    });

    it('[TM-117] null emoji clears the marker without touching recent list', async () => {
      browser.__test.seedTabValue(1, MARKER_KEY, { emoji: '🔥' });
      await startApp(browser);
      expect(await send({ type: 'picasso:set-emoji', tabId: 1, emoji: null })).toEqual({
        ok: true
      });
      expect(browser.__test.peekTabValue(1, MARKER_KEY)).toBeUndefined();
      expect(browser.__test.getStorage()['picasso-recent-emojis-v1']).toBeUndefined();
    });
  });

  it('[TM-118] every menu title comes from the catalog and is not empty', async () => {
    await startApp(browser);
    const titled = browser.menus.create.mock.calls
      .map(([p]) => p)
      .filter((p) => p.type !== 'separator');
    expect(titled.length).toBe(1 + 1 + 20 + 1 + 4);
    for (const p of titled) {
      expect(typeof p.title).toBe('string');
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.contexts).toEqual(['tab']);
    }
    expect(browser.i18n.getMessage).toHaveBeenCalledWith('menuRoot');
  });

  it('[TM-119] blocked picker window shows popup-blocked notice', async () => {
    browser.windows.create.mockRejectedValueOnce(new Error('blocked'));
    await startApp(browser);
    await click(browser, MENU_IDS.emojiPicker, 4);
    expect(browser.notifications.create.mock.calls[0][0]).toBe('picasso-popup-blocked');
  });

  it('opens the picker for the clicked tab', async () => {
    await startApp(browser);
    await click(browser, MENU_IDS.emojiPicker, 4);
    const props = browser.windows.create.mock.calls[0][0];
    expect(props.url).toBe(browser.runtime.getURL('picker/picker.html?tabId=4'));
    expect(props.type).toBe('popup');
  });

  it('clear color removes TST states and color markers of the subtree, keeps emoji', async () => {
    browser.__test.seedTabValue(1, MARKER_KEY, { color: 1, emoji: '🔥' });
    browser.__test.seedTabValue(2, MARKER_KEY, { color: 1 });
    await startApp(browser);
    await click(browser, MENU_IDS.clearColor);
    expect(tstCalls(browser, 'remove-tab-state').at(-1)[1].tabs).toEqual([1, 2, 3]);
    expect(browser.__test.peekTabValue(1, MARKER_KEY)).toEqual({ emoji: '🔥' });
    expect(browser.__test.peekTabValue(2, MARKER_KEY)).toBeUndefined();
  });

  it('clear both removes emoji and colors', async () => {
    browser.__test.seedTabValue(1, MARKER_KEY, { color: 1, emoji: '🔥' });
    await startApp(browser);
    await click(browser, MENU_IDS.clearBoth);
    expect(browser.__test.peekTabValue(1, MARKER_KEY)).toBeUndefined();
  });

  it('clear emoji works without TST', async () => {
    browser.__test.seedTabValue(4, MARKER_KEY, { emoji: '🔥' });
    await startApp(browser);
    browser.runtime.sendMessage.mockRejectedValue(MISSING);
    await click(browser, MENU_IDS.clearEmoji, 4);
    expect(browser.__test.peekTabValue(4, MARKER_KEY)).toBeUndefined();
  });

  it('TST missing at start-up is logged, not shown as a notice', async () => {
    browser.runtime.sendMessage.mockRejectedValue(MISSING);
    const logger = log();
    await startApp(browser, logger);
    expect(browser.notifications.create).not.toHaveBeenCalled();
    expect(logger.warn.mock.calls.length + logger.info.mock.calls.length).toBeGreaterThan(0);
  });

  it('ignores clicks without a valid tab and unknown menu ids', async () => {
    await startApp(browser);
    browser.runtime.sendMessage.mockClear();
    await browser.menus.onClicked.fire({ menuItemId: 'tabs-color-color-01' }, undefined);
    await browser.menus.onClicked.fire({ menuItemId: 'unknown' }, { id: 1 });
    expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('closed tab is removed from the cache and the style', async () => {
    browser.__test.seedTabValue(4, MARKER_KEY, { emoji: '🔥' });
    const app = await startApp(browser);
    browser.__test.setTabs([{ id: 1 }, { id: 2 }, { id: 3 }]);
    await browser.tabs.onRemoved.fire(4, { windowId: 1, isWindowClosing: false });
    await app.flush();
    const style = tstCalls(browser, 'register-self').at(-1)[1].style;
    expect(style).not.toContain('data-tab-id="4"');
  });

  it('restored tab gets its color re-applied', async () => {
    const app = await startApp(browser);
    browser.__test.setTabs([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 9 }]);
    browser.__test.seedTabValue(9, MARKER_KEY, { color: 7 });
    browser.runtime.sendMessage.mockClear();
    await app.handleTabCreated({ id: 9, windowId: 1 }, 0);
    const add = tstCalls(browser, 'add-tab-state');
    expect(add.at(-1)[1]).toMatchObject({ tabs: [9], state: 'tabs-color-color-07' });
  });
});
