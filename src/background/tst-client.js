import { allColorStates, legacyShadeStates, colorState } from '../lib/palette.js';
import { flattenTree } from '../lib/tree.js';

export const TST_ID = 'treestyletab@piro.sakura.ne.jp';

export function classifyError(error) {
  const text = String(error?.message ?? error);
  if (
    text.includes('Could not establish connection') ||
    text.includes('Receiving end does not exist')
  ) {
    return 'tst-missing';
  }
  return 'tst-denied';
}

function failure(reason, error) {
  return { ok: false, reason, error };
}

export function createTstClient({ browser, log = console }) {
  async function send(type, message, tabCount) {
    try {
      const value = await browser.runtime.sendMessage(TST_ID, message);
      return { ok: true, value };
    } catch (error) {
      const reason = classifyError(error);
      log.warn('TST call failed', { type, tabCount, reason, error });
      return failure(reason, error);
    }
  }

  return {
    async register(style) {
      const message = {
        type: 'register-self',
        name: browser.i18n.getMessage('extName'),
        icons: browser.runtime.getManifest().icons,
        listeningTypes: ['ready', 'permissions-changed'],
        style
      };
      return send('register-self', message, 0);
    },

    async getSubtree(tabId) {
      const message = { type: 'get-light-tree', tab: tabId };
      const reply = await send('get-light-tree', message, 1);
      if (!reply.ok) return reply;
      const value = reply.value;
      if (!value || typeof value !== 'object') {
        const error = new Error('unexpected TST reply');
        log.warn('TST get-light-tree returned non-object', { tabId });
        return failure('tst-denied', error);
      }
      return { ok: true, value: flattenTree(value) };
    },

    async setColor(tabIds, indexOrNull) {
      if (tabIds.length === 0) return { ok: true, value: null };
      const remove = {
        type: 'remove-tab-state',
        tabs: tabIds,
        state: [...allColorStates(), ...legacyShadeStates()]
      };
      const first = await send('remove-tab-state', remove, tabIds.length);
      if (!first.ok) return first;
      if (indexOrNull !== null) {
        const add = {
          type: 'add-tab-state',
          tabs: tabIds,
          state: colorState(indexOrNull)
        };
        const second = await send('add-tab-state', add, tabIds.length);
        if (!second.ok) return second;
      }
      return { ok: true, value: null };
    },

    async applyColors(byColor) {
      for (const [index, tabIds] of byColor) {
        if (tabIds.length === 0) continue;
        const message = {
          type: 'add-tab-state',
          tabs: tabIds,
          state: colorState(index)
        };
        const reply = await send('add-tab-state', message, tabIds.length);
        if (!reply.ok) return reply;
      }
      return { ok: true, value: null };
    }
  };
}
