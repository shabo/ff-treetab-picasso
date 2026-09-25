// Tab context menu: creation and click routing. IDs are stable since v0.1.3.

import { PALETTE, colorState, parseColorMenuId, swatchDataUrl } from '../lib/palette.js';

export const MENU_IDS = Object.freeze({
  root: 'tabs-color-root',
  colors: 'tabs-color-colors',
  emojiPicker: 'tabs-color-emoji-picker',
  separator: 'tabs-color-sep-1',
  clearEmoji: 'tabs-color-clear-emoji',
  clearColor: 'tabs-color-clear-color',
  clearBoth: 'tabs-color-clear-both',
  clearEverything: 'tabs-color-clear-everything'
});

export async function createMenus(browser) {
  const t = (key, subs) => browser.i18n.getMessage(key, subs);
  const item = (props) => browser.menus.create({ contexts: ['tab'], ...props });

  await browser.menus.removeAll();
  item({ id: MENU_IDS.root, title: t('menuRoot') });
  item({ id: MENU_IDS.colors, parentId: MENU_IDS.root, title: t('menuColors') });
  PALETTE.forEach((color, i) => {
    item({
      id: colorState(i),
      parentId: MENU_IDS.colors,
      title: t('menuColorItem', [t(color.nameKey), color.hex]),
      icons: { 16: swatchDataUrl(color.hex) }
    });
  });
  item({ id: MENU_IDS.emojiPicker, parentId: MENU_IDS.root, title: t('menuAddEmoji') });
  item({ id: MENU_IDS.separator, parentId: MENU_IDS.root, type: 'separator' });
  item({ id: MENU_IDS.clearEmoji, parentId: MENU_IDS.root, title: t('menuClearEmoji') });
  item({ id: MENU_IDS.clearColor, parentId: MENU_IDS.root, title: t('menuClearColor') });
  item({ id: MENU_IDS.clearBoth, parentId: MENU_IDS.root, title: t('menuClearBoth') });
  item({ id: MENU_IDS.clearEverything, parentId: MENU_IDS.root, title: t('menuClearEverything') });
}

const FIXED_ACTIONS = {
  [MENU_IDS.emojiPicker]: 'open-picker',
  [MENU_IDS.clearEmoji]: 'clear-emoji',
  [MENU_IDS.clearColor]: 'clear-color',
  [MENU_IDS.clearBoth]: 'clear-both',
  [MENU_IDS.clearEverything]: 'clear-everything'
};

// Maps a menus.onClicked info object to an action, or null for items we do not handle.
export function routeMenuClick(info) {
  const id = info?.menuItemId;
  if (typeof id !== 'string') return null;
  if (FIXED_ACTIONS[id]) return { kind: FIXED_ACTIONS[id] };
  const index = parseColorMenuId(id);
  return index === null ? null : { kind: 'color', index };
}
