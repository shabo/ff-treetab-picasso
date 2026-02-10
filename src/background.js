/* global browser */

// Tree Style Tab internal ID.
const TST_ID = 'treestyletab@piro.sakura.ne.jp';

const MENU_ROOT_ID = 'tabs-color-root';
const MENU_CLEAR_EMOJI_ID = 'tabs-color-clear-emoji';
const MENU_CLEAR_COLOR_ID = 'tabs-color-clear-color';
const MENU_CLEAR_BOTH_ID = 'tabs-color-clear-both';
const MENU_COLORS_ID = 'tabs-color-colors';
const MENU_EMOJIS_ID = 'tabs-color-emojis';
const MENU_COLOR_PREFIX = 'tabs-color-color-';
const MENU_SHADE_PREFIX = 'tabs-color-shade-'; // legacy (v0.1.0)
const MENU_EMOJI_MENU_PREFIX = 'tabs-color-emoji-menu-';
const EMOJI_STATE_PREFIX = 'tabs-color-emoji-';

// Keep the list stable: emoji state indices map 1:1 to CSS selectors.
// "Popular" list is intentionally subjective; we mainly want a compact, useful set.
const EMOJIS = [
  '😂', '❤️', '😍', '🤣', '😊',
  '🙏', '😭', '😘', '👍', '😅',
  '😁', '🎉', '😎', '💕', '😆',
  '🤔', '🙌', '✨', '🔥', '👀',
  '😋', '😜', '😇', '😴', '😌',
  '😔', '😒', '😏', '😩', '😡',
  '🤬', '😱', '😳', '🤗', '🤩',
  '🥳', '🥺', '😢', '😤', '👏',
  '💪', '🤝', '✅', '⭐', '💯',
  '🚀', '🙃', '😉', '🫶', '🤓'
];

// 20-color palette (hand-picked, works well as tab backgrounds).
// Keep the list stable to avoid changing colors for existing stored states.
const PALETTE = [
  { name: 'Red', hex: '#E53935', text: '#FFFFFF' },
  { name: 'Orange', hex: '#FB8C00', text: '#000000' },
  { name: 'Amber', hex: '#FFB300', text: '#000000' },
  { name: 'Yellow', hex: '#FDD835', text: '#000000' },
  { name: 'Lime', hex: '#C0CA33', text: '#000000' },
  { name: 'Green', hex: '#43A047', text: '#FFFFFF' },
  { name: 'Emerald', hex: '#00A878', text: '#FFFFFF' },
  { name: 'Teal', hex: '#00897B', text: '#FFFFFF' },
  { name: 'Cyan', hex: '#00ACC1', text: '#000000' },
  { name: 'Sky', hex: '#29B6F6', text: '#000000' },
  { name: 'Blue', hex: '#1E88E5', text: '#FFFFFF' },
  { name: 'Indigo', hex: '#3949AB', text: '#FFFFFF' },
  { name: 'Violet', hex: '#7E57C2', text: '#FFFFFF' },
  { name: 'Purple', hex: '#8E24AA', text: '#FFFFFF' },
  { name: 'Magenta', hex: '#D81B60', text: '#FFFFFF' },
  { name: 'Pink', hex: '#EC407A', text: '#000000' },
  { name: 'Rose', hex: '#F06292', text: '#000000' },
  { name: 'Brown', hex: '#6D4C41', text: '#FFFFFF' },
  { name: 'Slate', hex: '#546E7A', text: '#FFFFFF' },
  { name: 'Gray', hex: '#9E9E9E', text: '#000000' }
];

let gRegisteredToTST = false;

function clampByte(n) {
  return Math.max(0, Math.min(255, n | 0));
}

function byteToHex(n) {
  return clampByte(n).toString(16).padStart(2, '0').toUpperCase();
}

function colorState(i) {
  return `${MENU_COLOR_PREFIX}${String(i).padStart(2, '0')}`;
}

function emojiState(i) {
  return `${EMOJI_STATE_PREFIX}${String(i).padStart(2, '0')}`;
}

function emojiMenuId(i) {
  return `${MENU_EMOJI_MENU_PREFIX}${String(i).padStart(2, '0')}`;
}

function allColorStates() {
  const states = [];
  for (let i = 0; i < PALETTE.length; i++) states.push(colorState(i));
  return states;
}

function allEmojiStates() {
  const states = [];
  for (let i = 0; i < EMOJIS.length; i++) states.push(emojiState(i));
  return states;
}

function allLegacyShadeStates() {
  // These existed in the first implementation. Keep removing them for clean transitions.
  const states = [];
  for (let i = 0; i < 20; i++) states.push(`${MENU_SHADE_PREFIX}${String(i).padStart(2, '0')}`);
  return states;
}

function svgSwatchDataUrl(hex) {
  // Use a slightly rounded rectangle with a subtle border to read well on all platforms.
  const svg = `<?xml version="1.0" encoding="UTF-8"?>` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">` +
    `<rect x="1" y="3" width="14" height="10" rx="2" fill="${hex}" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>` +
    `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function generateTSTStyle() {
  const lines = [];
  lines.push('/* Injected by TST Color Tab Tree */');
  lines.push('');
  lines.push('tab-item[class*="tabs-color-color-"], tab-item[class*="tabs-color-shade-"] { transition: background-color 120ms linear; }');
  lines.push('');

  for (let i = 0; i < PALETTE.length; i++) {
    const bg = PALETTE[i].hex;
    const fg = PALETTE[i].text;
    const state = colorState(i);
    // TST paints tab backgrounds via CSS variables like --tab-surface.
    // Set variables on the tab element so all TST themes (photon/proton/sidebar) pick it up.
    lines.push(`tab-item.${state} {`);
    lines.push(`  --tab-surface: ${bg} !important;`);
    lines.push(`  --tab-surface-bgimage: none !important;`);
    lines.push(`  --tab-text: ${fg} !important;`);
    lines.push(`  --tab-text-shadow: none !important;`);
    lines.push('}');
    lines.push(`tab-item.${state} tab-item-substance {`);
    lines.push(`  background: var(--tab-surface) !important;`);
    lines.push('}');
    // Ensure active/bundled-active states don't override our variable assignments.
    lines.push(`tab-item.${state}.active, tab-item.${state}.bundled-active {`);
    lines.push(`  --tab-surface: ${bg} !important;`);
    lines.push(`  --tab-text: ${fg} !important;`);
    lines.push('}');
    lines.push('');
  }

  lines.push('');
  lines.push('/* Emoji markers (shown in Tree Style Tab sidebar only). */');
  lines.push(`tab-item[class*="${EMOJI_STATE_PREFIX}"] tab-item-substance::before {`);
  lines.push('  display: inline-flex;');
  lines.push('  align-items: center;');
  lines.push('  justify-content: center;');
  lines.push('  width: 1.35em;');
  lines.push('  margin-right: 6px;');
  lines.push('  font-size: 14px;');
  lines.push('  line-height: 1;');
  lines.push('  pointer-events: none;');
  lines.push('}');
  lines.push('');

  for (let i = 0; i < EMOJIS.length; i++) {
    const state = emojiState(i);
    const emoji = EMOJIS[i];
    lines.push(`tab-item.${state} tab-item-substance::before { content: "${emoji}"; }`);
  }

  return lines.join('\n');
}

async function tryRegisterToTST() {
  try {
    const manifest = browser.runtime.getManifest();
    await browser.runtime.sendMessage(TST_ID, {
      type: 'register-self',
      name: manifest.name,
      icons: manifest.icons,
      // We don't need notifications; we just want style injection + API access.
      listeningTypes: [],
      style: generateTSTStyle(),
      permissions: ['tabs']
    });
    gRegisteredToTST = true;
    console.log('[tst-color-tab-tree] Registered to Tree Style Tab');
    return true;
  } catch (e) {
    gRegisteredToTST = false;
    console.error('[tst-color-tab-tree] Failed to register to Tree Style Tab. Is TST installed and external addon API enabled?', e);
    return false;
  }
}

function flattenTreeItemIds(treeItem) {
  const ids = [];
  const stack = [treeItem];
  while (stack.length > 0) {
    const item = stack.pop();
    if (!item || typeof item.id !== 'number') continue;
    ids.push(item.id);
    if (Array.isArray(item.children)) {
      for (let i = item.children.length - 1; i >= 0; i--) stack.push(item.children[i]);
    }
  }
  return ids;
}

async function getSubtreeTabIdsViaTST(tabId) {
  const tree = await browser.runtime.sendMessage(TST_ID, {
    type: 'get-light-tree',
    tab: tabId
  });
  return flattenTreeItemIds(tree);
}

async function getSubtreeTabIdsFallback(tab) {
  // Best-effort fallback without TST: use openerTabId relationship within a window.
  const windowId = tab.windowId;
  const tabs = await browser.tabs.query({ windowId });
  const childrenByOpener = new Map(); // openerTabId -> [childId...]
  for (const t of tabs) {
    const opener = t.openerTabId;
    if (typeof opener !== 'number') continue;
    const arr = childrenByOpener.get(opener) || [];
    arr.push(t.id);
    childrenByOpener.set(opener, arr);
  }

  const out = [];
  const stack = [tab.id];
  while (stack.length > 0) {
    const id = stack.pop();
    out.push(id);
    const kids = childrenByOpener.get(id);
    if (kids) {
      for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
    }
  }
  return out;
}

async function applyColorToSubtree(tab, paletteIndexOrNull) {
  const tabId = tab?.id;
  if (typeof tabId !== 'number') return;

  let subtreeIds;
  let hasTST = true;
  try {
    subtreeIds = await getSubtreeTabIdsViaTST(tabId);
  } catch (_e) {
    hasTST = false;
    subtreeIds = await getSubtreeTabIdsFallback(tab);
  }

  // We can only actually color tabs in TST's sidebar (custom states + injected CSS).
  if (!hasTST) {
    console.error('[tst-color-tab-tree] Tree Style Tab API not reachable. Ensure TST is installed and allows external addons.');
    return;
  }

  const states = allColorStates().concat(allLegacyShadeStates());
  try {
    await browser.runtime.sendMessage(TST_ID, {
      type: 'remove-tab-state',
      tabs: subtreeIds,
      state: states
    });

    if (paletteIndexOrNull === null) return;

    await browser.runtime.sendMessage(TST_ID, {
      type: 'add-tab-state',
      tabs: subtreeIds,
      state: colorState(paletteIndexOrNull)
    });
  } catch (e) {
    console.error(
      '[tst-color-tab-tree] Failed to apply tab state via TST API. You may need to grant permissions in TST external addon permissions UI.',
      { registeredToTST: gRegisteredToTST, tabId, subtreeSize: subtreeIds.length },
      e
    );
  }
}

async function applyEmojiToTab(tab, emojiIndexOrNull) {
  const tabId = tab?.id;
  if (typeof tabId !== 'number') return;

  // We can only show emoji markers in TST's sidebar (custom states + injected CSS).
  try {
    await browser.runtime.sendMessage(TST_ID, {
      type: 'remove-tab-state',
      tabs: [tabId],
      state: allEmojiStates()
    });

    if (emojiIndexOrNull === null) return;

    await browser.runtime.sendMessage(TST_ID, {
      type: 'add-tab-state',
      tabs: [tabId],
      state: emojiState(emojiIndexOrNull)
    });
  } catch (e) {
    console.error(
      '[tst-color-tab-tree] Failed to apply emoji tab state via TST API. You may need to grant permissions in TST external addon permissions UI.',
      { registeredToTST: gRegisteredToTST, tabId },
      e
    );
  }
}

async function ensureMenus() {
  await browser.menus.removeAll();

  browser.menus.create({
    id: MENU_ROOT_ID,
    title: 'Color Tab Tree (TST)',
    contexts: ['tab']
  });

  browser.menus.create({
    id: MENU_CLEAR_EMOJI_ID,
    parentId: MENU_ROOT_ID,
    title: 'Clear Emoji',
    contexts: ['tab']
  });

  browser.menus.create({
    id: MENU_CLEAR_COLOR_ID,
    parentId: MENU_ROOT_ID,
    title: 'Clear Color',
    contexts: ['tab']
  });

  browser.menus.create({
    id: MENU_CLEAR_BOTH_ID,
    parentId: MENU_ROOT_ID,
    title: 'Clear Both',
    contexts: ['tab']
  });

  browser.menus.create({
    id: 'tabs-color-sep-1',
    parentId: MENU_ROOT_ID,
    type: 'separator',
    contexts: ['tab']
  });

  browser.menus.create({
    id: MENU_COLORS_ID,
    parentId: MENU_ROOT_ID,
    title: 'Colors',
    contexts: ['tab']
  });

  for (let i = 0; i < PALETTE.length; i++) {
    const color = PALETTE[i];
    browser.menus.create({
      id: `${MENU_COLOR_PREFIX}${String(i).padStart(2, '0')}`,
      parentId: MENU_COLORS_ID,
      title: `${color.name} (${color.hex})`,
      icons: {
        16: svgSwatchDataUrl(color.hex)
      },
      contexts: ['tab']
    });
  }

  browser.menus.create({
    id: MENU_EMOJIS_ID,
    parentId: MENU_ROOT_ID,
    title: 'Emojis',
    contexts: ['tab']
  });

  for (let i = 0; i < EMOJIS.length; i++) {
    browser.menus.create({
      id: emojiMenuId(i),
      parentId: MENU_EMOJIS_ID,
      title: EMOJIS[i],
      contexts: ['tab']
    });
  }
}

browser.menus.onClicked.addListener(async (info, tab) => {
  try {
    if (info.menuItemId === MENU_CLEAR_EMOJI_ID) {
      await applyEmojiToTab(tab, null);
      return;
    }

    if (info.menuItemId === MENU_CLEAR_COLOR_ID) {
      await applyColorToSubtree(tab, null);
      return;
    }

    if (info.menuItemId === MENU_CLEAR_BOTH_ID) {
      await applyEmojiToTab(tab, null);
      await applyColorToSubtree(tab, null);
      return;
    }

    if (typeof info.menuItemId !== 'string') return;
    if (info.menuItemId.startsWith(MENU_EMOJI_MENU_PREFIX)) {
      const idxStr = info.menuItemId.slice(MENU_EMOJI_MENU_PREFIX.length);
      const idx = Number.parseInt(idxStr, 10);
      if (!Number.isFinite(idx) || idx < 0 || idx >= EMOJIS.length) return;
      // Emoji must apply only to the clicked tab (not its descendants).
      await applyEmojiToTab(tab, idx);
      return;
    }

    if (!info.menuItemId.startsWith(MENU_COLOR_PREFIX)) return;
    const idxStr = info.menuItemId.slice(MENU_COLOR_PREFIX.length);
    const idx = Number.parseInt(idxStr, 10);
    if (!Number.isFinite(idx) || idx < 0 || idx >= PALETTE.length) return;

    await applyColorToSubtree(tab, idx);
  } catch (_e) {
    // Intentionally ignore errors. This addon is meant to be frictionless.
  }
});

browser.runtime.onInstalled.addListener(async () => {
  await ensureMenus();
  await tryRegisterToTST();
});

browser.runtime.onStartup.addListener(async () => {
  await ensureMenus();
  await tryRegisterToTST();
});

browser.runtime.onMessageExternal.addListener(async (message, sender) => {
  // Re-register when TST becomes ready or when permissions are changed.
  if (!sender || sender.id !== TST_ID) return;
  if (!message || (message.type !== 'ready' && message.type !== 'permissions-changed')) return;
  await tryRegisterToTST();
});

// Best-effort initialization on first load (useful during temporary addon reloads).
ensureMenus().catch(() => {});
tryRegisterToTST().catch(() => {});
