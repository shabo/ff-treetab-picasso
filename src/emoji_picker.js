/* global browser */
/* global TABS_COLOR_EMOJI_DATA */

function $(id) {
  return document.getElementById(id);
}

function byLabel(a, b) {
  return String(a.label || '').localeCompare(String(b.label || ''));
}

function normalizeQuery(q) {
  return String(q || '').trim().toLowerCase();
}

function matches(entry, q) {
  if (!q) return true;
  const label = String(entry.label || '').toLowerCase();
  if (label.includes(q)) return true;
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  for (const t of tags) if (String(t).toLowerCase().includes(q)) return true;
  return false;
}

function parseParams() {
  const qs = new URLSearchParams(location.search);
  const tabId = Number(qs.get('tabId'));
  const group = qs.get('group');
  return {
    tabId: Number.isFinite(tabId) ? tabId : null,
    group: group ? String(group) : null
  };
}

const SKIN_TONE_STORAGE_KEY = 'tabs-color-skin-tone-v1';
// 0 = default, 1..5 map to emojibase skins array ordering.
function loadSkinTone() {
  const n = Number(localStorage.getItem(SKIN_TONE_STORAGE_KEY) || '0');
  if (!Number.isFinite(n) || n < 0 || n > 5) return 0;
  return n | 0;
}
function saveSkinTone(n) {
  localStorage.setItem(SKIN_TONE_STORAGE_KEY, String(n | 0));
}

function renderTonePicker(container, selectedTone, onChange) {
  const tones = [
    { id: 0, label: 'Default' },
    { id: 1, label: 'Light' },
    { id: 2, label: 'Med-light' },
    { id: 3, label: 'Medium' },
    { id: 4, label: 'Med-dark' },
    { id: 5, label: 'Dark' }
  ];

  container.textContent = '';
  for (const t of tones) {
    const b = document.createElement('button');
    b.className = 'tone';
    b.type = 'button';
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-checked', String(t.id === selectedTone));
    b.textContent = t.label;
    b.addEventListener('click', () => onChange(t.id));
    container.appendChild(b);
  }
}

function pickEmoji(entry, tone) {
  if (!entry || typeof entry.emoji !== 'string') return null;
  if (tone <= 0) return entry.emoji;
  const skins = Array.isArray(entry.skins) ? entry.skins : [];
  const idx = tone - 1;
  const picked = skins[idx] || entry.emoji;

  // Some emoji sequences need VS16 (FE0F) to render in emoji presentation on all platforms.
  // Emojibase skin variants sometimes omit VS16 even when the base includes it (e.g. "👍️" -> "👍🏽").
  // If VS16 exists in the base but not in the picked variant, insert it before the skin-tone modifier.
  if (picked.includes('\uFE0F')) return picked;
  if (!entry.emoji.includes('\uFE0F')) return picked;

  const cps = Array.from(picked);
  if (cps.length >= 2) {
    const last = cps[cps.length - 1].codePointAt(0);
    if (last >= 0x1F3FB && last <= 0x1F3FF) {
      cps.splice(cps.length - 1, 0, '\uFE0F');
      return cps.join('');
    }
  }

  return picked;
}

function buildModel(data) {
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  const outGroups = [];

  for (const g of groups) {
    const emojis = Array.isArray(g.emojis) ? g.emojis.slice() : [];
    emojis.sort(byLabel);
    outGroups.push({ key: String(g.key), label: String(g.label || g.key), emojis });
  }

  const all = [];
  for (const g of outGroups) for (const e of g.emojis) all.push(e);
  return { groups: outGroups, all };
}

async function sendEmoji(tabId, emojiOrNull) {
  await browser.runtime.sendMessage({
    type: 'tabs-color-set-emoji',
    tabId,
    emoji: emojiOrNull
  });
}

function renderGroups(groupsEl, groups, selectedKey, onSelect) {
  groupsEl.textContent = '';

  const mk = (key, label) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'group';
    b.setAttribute('role', 'option');
    b.setAttribute('aria-selected', String(key === selectedKey));
    b.textContent = label;
    b.addEventListener('click', () => onSelect(key));
    return b;
  };

  groupsEl.appendChild(mk('__all__', 'All'));
  for (const g of groups) groupsEl.appendChild(mk(g.key, g.label));
}

function renderGrid(gridEl, metaEl, entries, q, tone, onPick) {
  const filtered = entries.filter((e) => matches(e, q));
  metaEl.textContent = `${filtered.length} emoji`;

  gridEl.textContent = '';
  for (const e of filtered) {
    const emoji = pickEmoji(e, tone);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell';
    b.textContent = emoji;
    b.title = String(e.label || '');
    b.addEventListener('click', () => onPick(emoji));
    gridEl.appendChild(b);
  }
}

(async () => {
  const { tabId, group } = parseParams();
  if (tabId === null) {
    $('meta').textContent = 'Missing tabId';
    return;
  }

  const model = buildModel(window.TABS_COLOR_EMOJI_DATA);
  const qEl = $('q');
  const gridEl = $('grid');
  const metaEl = $('meta');
  const groupsEl = $('groups');
  const clearEl = $('clear');
  const tonesEl = $('tones');

  let selectedKey = group || '__all__';
  if (selectedKey !== '__all__' && !model.groups.find((g) => g.key === selectedKey)) selectedKey = '__all__';
  let tone = loadSkinTone();
  let q = '';

  function currentEntries() {
    if (selectedKey === '__all__') return model.all;
    const g = model.groups.find((x) => x.key === selectedKey);
    return g ? g.emojis : model.all;
  }

  async function onPick(emoji) {
    await sendEmoji(tabId, emoji);
    window.close();
  }

  function rerender() {
    renderGroups(groupsEl, model.groups, selectedKey, (k) => {
      selectedKey = k;
      rerender();
    });

    renderTonePicker(tonesEl, tone, (t) => {
      tone = t;
      saveSkinTone(tone);
      rerender();
    });

    renderGrid(gridEl, metaEl, currentEntries(), q, tone, onPick);
  }

  qEl.addEventListener('input', () => {
    q = normalizeQuery(qEl.value);
    renderGrid(gridEl, metaEl, currentEntries(), q, tone, onPick);
  });

  clearEl.addEventListener('click', async () => {
    await sendEmoji(tabId, null);
    window.close();
  });

  rerender();
  qEl.focus();
})().catch(() => {});
