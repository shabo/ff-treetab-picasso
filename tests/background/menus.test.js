import { describe, expect, it } from 'vitest';
import { createBrowserMock } from '../helpers/browser-mock.js';
import { MENU_IDS, createMenus, routeMenuClick } from '../../src/background/menus.js';

describe('menus', () => {
  it('creates the menu tree in contract order', async () => {
    const browser = createBrowserMock();
    await createMenus(browser);
    const ids = browser.menus.create.mock.calls.map(([p]) => p.id);
    expect(ids[0]).toBe(MENU_IDS.root);
    expect(ids[1]).toBe(MENU_IDS.colors);
    expect(ids.slice(2, 22)).toEqual(
      Array.from({ length: 20 }, (_, i) => `tabs-color-color-${String(i).padStart(2, '0')}`)
    );
    expect(ids.slice(22)).toEqual([
      MENU_IDS.emojiPicker,
      MENU_IDS.separator,
      MENU_IDS.clearEmoji,
      MENU_IDS.clearColor,
      MENU_IDS.clearBoth,
      MENU_IDS.clearEverything
    ]);
    const blue = browser.menus.create.mock.calls[12][0];
    expect(blue.title).toBe('Blue (#1E88E5)');
    expect(blue.icons[16]).toMatch(/^data:image\/svg\+xml/);
  });

  it.each([
    ['tabs-color-color-03', { kind: 'color', index: 3 }],
    [MENU_IDS.emojiPicker, { kind: 'open-picker' }],
    [MENU_IDS.clearEmoji, { kind: 'clear-emoji' }],
    [MENU_IDS.clearColor, { kind: 'clear-color' }],
    [MENU_IDS.clearBoth, { kind: 'clear-both' }],
    [MENU_IDS.clearEverything, { kind: 'clear-everything' }]
  ])('routes %s', (menuItemId, action) => {
    expect(routeMenuClick({ menuItemId })).toEqual(action);
  });

  it.each([MENU_IDS.root, MENU_IDS.colors, 'tabs-color-color-20', 'x', 5, undefined])(
    'returns null for %j',
    (menuItemId) => {
      expect(routeMenuClick({ menuItemId })).toBeNull();
    }
  );

  it('returns null for missing info', () => {
    expect(routeMenuClick(undefined)).toBeNull();
  });
});
