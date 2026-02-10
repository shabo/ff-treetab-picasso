/* global browser */

// Tree Style Tab internal ID.
const TST_ID = 'treestyletab@piro.sakura.ne.jp';

const MENU_ROOT_ID = 'tabs-color-root';
const MENU_CLEAR_EMOJI_ID = 'tabs-color-clear-emoji';
const MENU_CLEAR_COLOR_ID = 'tabs-color-clear-color';
const MENU_CLEAR_BOTH_ID = 'tabs-color-clear-both';
const MENU_COLORS_ID = 'tabs-color-colors';
const MENU_EMOJIS_ID = 'tabs-color-emojis';
const MENU_CLEAR_EVERYTHING_ID = 'tabs-color-clear-everything';
const MENU_EMOJI_RECENT_ID = 'tabs-color-emoji-recent';
const MENU_EMOJI_FREQUENT_ID = 'tabs-color-emoji-frequent';
const MENU_EMOJI_PICKER_ID = 'tabs-color-emoji-picker';
const MENU_EMOJI_RECENT_SLOT_PREFIX = 'tabs-color-emoji-recent-slot-';
const MENU_EMOJI_FREQUENT_SLOT_PREFIX = 'tabs-color-emoji-frequent-slot-';
const MENU_EMOJI_GROUP_PREFIX = 'tabs-color-emoji-group-';
const MENU_COLOR_PREFIX = 'tabs-color-color-';
const MENU_SHADE_PREFIX = 'tabs-color-shade-'; // legacy (v0.1.0)

const EMOJI_RECENT_SLOTS = 12;
const EMOJI_FREQUENT_SLOTS = 12;
const STORAGE_EMOJI_USAGE_KEY = 'tabs-color-emoji-usage-v1';
const STORAGE_TAB_EMOJI_KEY = 'tabs-color-tab-emoji-v1';

// These match Emjoibase / iOS-ish top-level emoji groups.
const EMOJI_GROUPS = [
  { key: 'smileys-emotion', title: 'Smileys & Emotion' },
  { key: 'people-body', title: 'People & Body' },
  { key: 'component', title: 'Components' },
  { key: 'animals-nature', title: 'Animals & Nature' },
  { key: 'food-drink', title: 'Food & Drink' },
  { key: 'travel-places', title: 'Travel & Places' },
  { key: 'activities', title: 'Activities' },
  { key: 'objects', title: 'Objects' },
  { key: 'symbols', title: 'Symbols' },
  { key: 'flags', title: 'Flags' }
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
let gRecentSlotEmojis = Array(EMOJI_RECENT_SLOTS).fill(null);
let gFrequentSlotEmojis = Array(EMOJI_FREQUENT_SLOTS).fill(null);
let gEmojiCss = '';

function colorState(i) {
  return `${MENU_COLOR_PREFIX}${String(i).padStart(2, '0')}`;
}

function emojiGroupMenuId(groupKey) {
  return `${MENU_EMOJI_GROUP_PREFIX}${groupKey}`;
}

function recentSlotId(i) {
  return `${MENU_EMOJI_RECENT_SLOT_PREFIX}${String(i).padStart(2, '0')}`;
}

function frequentSlotId(i) {
  return `${MENU_EMOJI_FREQUENT_SLOT_PREFIX}${String(i).padStart(2, '0')}`;
}

async function loadEmojiUsage() {
  const obj = await browser.storage.local.get(STORAGE_EMOJI_USAGE_KEY);
  const v = obj?.[STORAGE_EMOJI_USAGE_KEY];
  const recent = Array.isArray(v?.recent) ? v.recent : [];
  const counts = (v?.counts && typeof v.counts === 'object') ? v.counts : {};
  const lastUsed = (v?.lastUsed && typeof v.lastUsed === 'object') ? v.lastUsed : {};

  const cleanRecent = [];
  for (const x of recent) {
    if (typeof x !== 'string') continue;
    if (x.length === 0 || x.length > 64) continue;
    if (cleanRecent.includes(x)) continue;
    cleanRecent.push(x);
    if (cleanRecent.length >= 60) break;
  }

  const cleanCounts = {};
  const cleanLastUsed = {};
  for (const k of Object.keys(counts)) {
    if (typeof k !== 'string' || k.length === 0 || k.length > 64) continue;
    const c = Number(counts[k] ?? 0);
    if (Number.isFinite(c) && c > 0) cleanCounts[k] = Math.floor(c);
  }
  for (const k of Object.keys(lastUsed)) {
    if (typeof k !== 'string' || k.length === 0 || k.length > 64) continue;
    const t = Number(lastUsed[k] ?? 0);
    if (Number.isFinite(t) && t > 0) cleanLastUsed[k] = Math.floor(t);
  }

  return { recent: cleanRecent, counts: cleanCounts, lastUsed: cleanLastUsed };
}

async function saveEmojiUsage(usage) {
  await browser.storage.local.set({ [STORAGE_EMOJI_USAGE_KEY]: usage });
}

function computeFrequentEmojis(usage, limit) {
  const items = [];
  for (const k of Object.keys(usage.counts || {})) {
    const count = Number(usage.counts[k] ?? 0);
    if (!Number.isFinite(count) || count <= 0) continue;
    const last = Number(usage.lastUsed?.[k] ?? 0);
    items.push({ emoji: k, count, last });
  }

  items.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.last !== a.last) return b.last - a.last;
    return a.emoji.localeCompare(b.emoji);
  });

  return items.slice(0, limit).map((x) => x.emoji);
}

async function recordEmojiUse(emoji) {
  const usage = await loadEmojiUsage();

  const now = Date.now();
  const k = String(emoji);
  usage.counts[k] = (usage.counts[k] || 0) + 1;
  usage.lastUsed[k] = now;
  usage.recent = [k].concat(usage.recent.filter((x) => x !== k)).slice(0, 60);

  await saveEmojiUsage(usage);
  return usage;
}

function allColorStates() {
  const states = [];
  for (let i = 0; i < PALETTE.length; i++) states.push(colorState(i));
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

  if (gEmojiCss) {
    lines.push('');
    lines.push('/* Emoji markers (shown in Tree Style Tab sidebar only). */');
    lines.push(gEmojiCss);
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

async function loadTabEmojiMap() {
  const obj = await browser.storage.local.get(STORAGE_TAB_EMOJI_KEY);
  const raw = obj?.[STORAGE_TAB_EMOJI_KEY];
  if (!raw || typeof raw !== 'object') return {};

  const out = {};
  for (const k of Object.keys(raw)) {
    const tabId = Number.parseInt(k, 10);
    const emoji = raw[k];
    if (!Number.isFinite(tabId) || tabId < 0) continue;
    if (typeof emoji !== 'string' || emoji.length === 0 || emoji.length > 64) continue;
    out[String(tabId)] = emoji;
  }
  return out;
}

async function saveTabEmojiMap(map) {
  await browser.storage.local.set({ [STORAGE_TAB_EMOJI_KEY]: map });
}

function buildEmojiCssFromMap(tabEmojiMap) {
  const lines = [];
  lines.push('/* Emoji markers are injected per tab id (no huge global emoji state list). */');

  for (const k of Object.keys(tabEmojiMap)) {
    const tabId = Number.parseInt(k, 10);
    if (!Number.isFinite(tabId) || tabId < 0) continue;
    const emoji = tabEmojiMap[k];
    if (typeof emoji !== 'string' || emoji.length === 0) continue;

    // JSON.stringify gives us a valid quoted string for CSS content (escapes quotes/backslashes).
    const content = JSON.stringify(emoji);
    lines.push(`tab-item[data-tab-id="${tabId}"] tab-item-substance::before {`);
    lines.push(`  content: ${content};`);
    lines.push('  display: inline-flex;');
    lines.push('  align-items: center;');
    lines.push('  justify-content: center;');
    lines.push('  width: 1.35em;');
    lines.push('  margin-right: 6px;');
    lines.push('  font-size: 14px;');
    lines.push('  line-height: 1;');
    lines.push('  pointer-events: none;');
    lines.push('}');
  }

  return lines.join('\n');
}

async function syncEmojiStyleToTST() {
  const map = await loadTabEmojiMap();
  gEmojiCss = buildEmojiCssFromMap(map);
  await tryRegisterToTST();
}

async function setEmojiForTabId(tabId, emojiOrNull) {
  if (typeof tabId !== 'number' || !Number.isFinite(tabId)) return;

  const map = await loadTabEmojiMap();
  if (emojiOrNull === null) {
    delete map[String(tabId)];
  } else {
    const emoji = String(emojiOrNull);
    if (emoji.length === 0 || emoji.length > 64) return;
    map[String(tabId)] = emoji;
  }

  await saveTabEmojiMap(map);
  await syncEmojiStyleToTST();
}

async function applyEmojiToTab(tab, emojiOrNull) {
  const tabId = tab?.id;
  if (typeof tabId !== 'number') return;
  await setEmojiForTabId(tabId, emojiOrNull);
}

async function clearEverythingAllTabs() {
  // Clear all addon-applied states across all tabs (colors) in TST sidebar
  // and remove any injected emoji markers (stored by tab id).
  let tabs;
  try {
    tabs = await browser.tabs.query({});
  } catch (_e) {
    return;
  }

  const tabIds = [];
  for (const t of tabs) if (t && typeof t.id === 'number') tabIds.push(t.id);
  if (tabIds.length === 0) return;

  const states = allColorStates().concat(allLegacyShadeStates());
  try {
    await browser.runtime.sendMessage(TST_ID, {
      type: 'remove-tab-state',
      tabs: tabIds,
      state: states
    });
  } catch (e) {
    console.error('[tst-color-tab-tree] Failed to clear states via TST API.', { registeredToTST: gRegisteredToTST, tabCount: tabIds.length }, e);
  }

  try {
    await browser.storage.local.remove([STORAGE_EMOJI_USAGE_KEY, STORAGE_TAB_EMOJI_KEY]);
  } catch (_e) {}
  await updateEmojiUsageMenus(null);
  await syncEmojiStyleToTST();
}

async function updateEmojiUsageMenus(usageOrNull) {
  const usage = usageOrNull || await loadEmojiUsage();
  const recent = (usage.recent || []).slice(0, EMOJI_RECENT_SLOTS);
  const frequent = computeFrequentEmojis(usage, EMOJI_FREQUENT_SLOTS);

  gRecentSlotEmojis = Array(EMOJI_RECENT_SLOTS).fill(null);
  gFrequentSlotEmojis = Array(EMOJI_FREQUENT_SLOTS).fill(null);

  for (let i = 0; i < EMOJI_RECENT_SLOTS; i++) {
    const emoji = recent[i];
    gRecentSlotEmojis[i] = (typeof emoji === 'string') ? emoji : null;
    const title = (typeof emoji === 'string') ? emoji : '...';
    const enabled = (typeof emoji === 'string');
    try {
      await browser.menus.update(recentSlotId(i), { title, enabled });
    } catch (_e) {}
  }

  for (let i = 0; i < EMOJI_FREQUENT_SLOTS; i++) {
    const emoji = frequent[i];
    gFrequentSlotEmojis[i] = (typeof emoji === 'string') ? emoji : null;
    const title = (typeof emoji === 'string') ? emoji : '...';
    const enabled = (typeof emoji === 'string');
    try {
      await browser.menus.update(frequentSlotId(i), { title, enabled });
    } catch (_e) {}
  }
}

function emojiPickerUrl(tabId, groupKeyOrNull) {
  const base = browser.runtime.getURL('emoji_picker.html');
  const qs = new URLSearchParams();
  qs.set('tabId', String(tabId));
  if (groupKeyOrNull) qs.set('group', String(groupKeyOrNull));
  return `${base}?${qs.toString()}`;
}

async function openEmojiPickerForTab(tab, groupKeyOrNull) {
  const tabId = tab?.id;
  if (typeof tabId !== 'number') return;

  const url = emojiPickerUrl(tabId, groupKeyOrNull);
  try {
    await browser.windows.create({
      url,
      type: 'popup',
      width: 460,
      height: 640
    });
  } catch (_e) {
    // Ignore; window creation can be blocked by user prefs.
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

  browser.menus.create({
    id: MENU_EMOJI_RECENT_ID,
    parentId: MENU_EMOJIS_ID,
    title: 'Recent',
    contexts: ['tab']
  });

  for (let i = 0; i < EMOJI_RECENT_SLOTS; i++) {
    browser.menus.create({
      id: recentSlotId(i),
      parentId: MENU_EMOJI_RECENT_ID,
      title: '...',
      enabled: false,
      contexts: ['tab']
    });
  }

  browser.menus.create({
    id: MENU_EMOJI_FREQUENT_ID,
    parentId: MENU_EMOJIS_ID,
    title: 'Frequently used',
    contexts: ['tab']
  });

  for (let i = 0; i < EMOJI_FREQUENT_SLOTS; i++) {
    browser.menus.create({
      id: frequentSlotId(i),
      parentId: MENU_EMOJI_FREQUENT_ID,
      title: '...',
      enabled: false,
      contexts: ['tab']
    });
  }

  browser.menus.create({
    id: 'tabs-color-sep-emoji-1',
    parentId: MENU_EMOJIS_ID,
    type: 'separator',
    contexts: ['tab']
  });

  browser.menus.create({
    id: MENU_EMOJI_PICKER_ID,
    parentId: MENU_EMOJIS_ID,
    title: 'Pick Emoji...',
    contexts: ['tab']
  });

  browser.menus.create({
    id: 'tabs-color-sep-emoji-2',
    parentId: MENU_EMOJIS_ID,
    type: 'separator',
    contexts: ['tab']
  });

  for (const g of EMOJI_GROUPS) {
    browser.menus.create({
      id: emojiGroupMenuId(g.key),
      parentId: MENU_EMOJIS_ID,
      title: g.title,
      contexts: ['tab']
    });
  }

  browser.menus.create({
    id: MENU_CLEAR_EVERYTHING_ID,
    parentId: MENU_ROOT_ID,
    title: '💣 Clear everything',
    contexts: ['tab']
  });
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

    if (info.menuItemId === MENU_CLEAR_EVERYTHING_ID) {
      await clearEverythingAllTabs();
      return;
    }

      if (typeof info.menuItemId !== 'string') return;

      if (info.menuItemId.startsWith(MENU_EMOJI_RECENT_SLOT_PREFIX)) {
        const slotStr = info.menuItemId.slice(MENU_EMOJI_RECENT_SLOT_PREFIX.length);
        const slot = Number.parseInt(slotStr, 10);
        if (!Number.isFinite(slot) || slot < 0 || slot >= EMOJI_RECENT_SLOTS) return;
        const emoji = gRecentSlotEmojis[slot];
        if (typeof emoji !== 'string') return;
        await applyEmojiToTab(tab, emoji);
        const usage = await recordEmojiUse(emoji);
        await updateEmojiUsageMenus(usage);
        return;
      }

      if (info.menuItemId.startsWith(MENU_EMOJI_FREQUENT_SLOT_PREFIX)) {
        const slotStr = info.menuItemId.slice(MENU_EMOJI_FREQUENT_SLOT_PREFIX.length);
        const slot = Number.parseInt(slotStr, 10);
        if (!Number.isFinite(slot) || slot < 0 || slot >= EMOJI_FREQUENT_SLOTS) return;
        const emoji = gFrequentSlotEmojis[slot];
        if (typeof emoji !== 'string') return;
        await applyEmojiToTab(tab, emoji);
        const usage = await recordEmojiUse(emoji);
        await updateEmojiUsageMenus(usage);
        return;
      }

      if (info.menuItemId === MENU_EMOJI_PICKER_ID) {
        await openEmojiPickerForTab(tab, null);
        return;
      }

      if (info.menuItemId.startsWith(MENU_EMOJI_GROUP_PREFIX)) {
        const groupKey = info.menuItemId.slice(MENU_EMOJI_GROUP_PREFIX.length);
        await openEmojiPickerForTab(tab, groupKey);
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

browser.runtime.onMessage.addListener((message, _sender) => {
  (async () => {
    if (!message || typeof message !== 'object') return;
    if (message.type !== 'tabs-color-set-emoji') return;

    const tabId = Number(message.tabId);
    if (!Number.isFinite(tabId) || tabId < 0) return;

    const emoji = message.emoji;
    if (emoji !== null && (typeof emoji !== 'string' || emoji.length === 0 || emoji.length > 64)) return;

    await setEmojiForTabId(tabId, emoji);
    if (typeof emoji === 'string') {
      const usage = await recordEmojiUse(emoji);
      await updateEmojiUsageMenus(usage);
    }
  })().catch(() => {});
});

browser.tabs.onRemoved.addListener((tabId) => {
  (async () => {
    const map = await loadTabEmojiMap();
    if (!Object.prototype.hasOwnProperty.call(map, String(tabId))) return;
    delete map[String(tabId)];
    await saveTabEmojiMap(map);
    await syncEmojiStyleToTST();
  })().catch(() => {});
});

browser.runtime.onInstalled.addListener(async () => {
  await ensureMenus();
  await updateEmojiUsageMenus(null);
  await syncEmojiStyleToTST();
});

browser.runtime.onStartup.addListener(async () => {
  await ensureMenus();
  await updateEmojiUsageMenus(null);
  await syncEmojiStyleToTST();
});

browser.runtime.onMessageExternal.addListener(async (message, sender) => {
  // Re-register when TST becomes ready or when permissions are changed.
  if (!sender || sender.id !== TST_ID) return;
  if (!message || (message.type !== 'ready' && message.type !== 'permissions-changed')) return;
  await tryRegisterToTST();
});

// Best-effort initialization on first load (useful during temporary addon reloads).
(async () => {
  await ensureMenus();
  await updateEmojiUsageMenus(null);
  await syncEmojiStyleToTST();
})().catch(() => {});
