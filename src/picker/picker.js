import data from '../emoji-data.js';
import { nextIndex, columnsFor } from './picker-nav.js';
import { isValidTabId } from '../lib/validate.js';
import { sanitizeRecent } from '../lib/recent.js';

const RECENT_KEY = 'picasso-recent-emojis-v1';
const ALL_KEY = 'all';
const RECENT_GROUP = 'recent';
const CELL_WIDTH = 44; // 40px cell + 4px gap

export async function start({
  browser = globalThis.browser,
  doc = document,
  win = window,
  log = console
} = {}) {
  if (!browser) return;

  applyI18n(browser, doc);

  const searchParams = new URLSearchParams(win.location.search);
  const tabId = Number(searchParams.get('tabId'));

  const errorEl = doc.getElementById('error');
  const searchEl = doc.getElementById('q');
  const clearEl = doc.getElementById('clear');

  if (!isValidTabId(tabId)) {
    errorEl.hidden = false;
    errorEl.textContent = browser.i18n.getMessage('pickerMissingTab');
    searchEl.disabled = true;
    clearEl.disabled = true;
    return;
  }

  let recent = [];
  try {
    const stored = await browser.storage.local.get(RECENT_KEY);
    recent = sanitizeRecent(stored?.[RECENT_KEY]);
  } catch (err) {
    log.error('Failed to load recent emojis', err);
  }

  const model = buildModel(data);
  const groups = buildGroups(browser, model, recent);

  let selectedKey = recent.length > 0 ? RECENT_GROUP : ALL_KEY;
  let query = '';
  let activeCellIndex = 0;
  let columns = 8;
  let renderedEntries = [];

  const groupsEl = doc.getElementById('groups');
  const gridEl = doc.getElementById('grid');
  const metaEl = doc.getElementById('meta');

  function currentEntries() {
    if (selectedKey === ALL_KEY) return model.all;
    const g = groups.find((x) => x.key === selectedKey);
    return g ? g.emojis : model.all;
  }

  function filteredEntries() {
    const entries = currentEntries();
    const q = normalizeQuery(query);
    if (!q) return entries;
    return entries.filter((e) => matches(e, q));
  }

  function renderGroups() {
    groupsEl.textContent = '';
    for (const g of groups) {
      const b = doc.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(g.key === selectedKey));
      b.setAttribute('tabindex', g.key === selectedKey ? '0' : '-1');
      b.textContent = g.label;
      b.addEventListener('click', () => {
        selectedKey = g.key;
        activeCellIndex = 0;
        renderGroups();
        renderGrid();
      });
      groupsEl.appendChild(b);
    }
  }

  function computeColumns() {
    const gridWidth = gridEl.clientWidth;
    columns = gridWidth > 0 ? columnsFor(gridWidth, CELL_WIDTH) : 8;
    gridEl.style.setProperty('--picker-columns', String(columns));
  }

  function renderGrid() {
    renderedEntries = filteredEntries();
    metaEl.textContent = renderedEntries.length
      ? browser.i18n.getMessage('pickerCount', [String(renderedEntries.length)])
      : browser.i18n.getMessage('pickerEmpty');

    gridEl.textContent = '';
    if (renderedEntries.length === 0) return;

    computeColumns();
    activeCellIndex = Math.min(activeCellIndex, renderedEntries.length - 1);

    const frag = doc.createDocumentFragment();
    let rowEl = null;
    for (let i = 0; i < renderedEntries.length; i++) {
      if (i % columns === 0) {
        rowEl = doc.createElement('div');
        rowEl.setAttribute('role', 'row');
        frag.appendChild(rowEl);
      }
      const e = renderedEntries[i];
      const b = doc.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'gridcell');
      b.setAttribute('aria-label', e.label);
      b.setAttribute('title', e.label);
      b.setAttribute('tabindex', i === activeCellIndex ? '0' : '-1');
      b.textContent = e.emoji;
      b.addEventListener('click', () => pick(e.emoji));
      rowEl.appendChild(b);
    }
    gridEl.appendChild(frag);
  }

  function moveFocus(key) {
    const newIndex = nextIndex(activeCellIndex, key, renderedEntries.length, columns);
    if (newIndex === activeCellIndex) return;
    const cells = gridEl.querySelectorAll('[role="gridcell"]');
    if (cells[activeCellIndex]) cells[activeCellIndex].setAttribute('tabindex', '-1');
    activeCellIndex = newIndex;
    if (cells[activeCellIndex]) {
      cells[activeCellIndex].setAttribute('tabindex', '0');
      cells[activeCellIndex].focus();
    }
  }

  gridEl.addEventListener('keydown', (event) => {
    if (
      event.key === 'ArrowRight' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowDown' ||
      event.key === 'ArrowUp' ||
      event.key === 'Home' ||
      event.key === 'End'
    ) {
      event.preventDefault();
      moveFocus(event.key);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (renderedEntries[activeCellIndex]) {
        pick(renderedEntries[activeCellIndex].emoji);
      }
    }
  });

  groupsEl.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    const tabs = [...groupsEl.querySelectorAll('[role="tab"]')];
    const idx = tabs.findIndex((t) => t.getAttribute('tabindex') === '0');
    const nextIdx =
      event.key === 'ArrowUp' ? Math.max(0, idx - 1) : Math.min(tabs.length - 1, idx + 1);
    if (idx >= 0) tabs[idx].setAttribute('tabindex', '-1');
    tabs[nextIdx].setAttribute('tabindex', '0');
    tabs[nextIdx].focus();
  });

  // ArrowDown in the search field jumps into the grid.
  searchEl.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown') return;
    const cell = gridEl.querySelector('[role="gridcell"][tabindex="0"]');
    if (!cell) return;
    event.preventDefault();
    cell.focus();
  });

  win.addEventListener?.('resize', () => {
    const before = columns;
    computeColumns();
    if (columns !== before) renderGrid();
  });

  searchEl.addEventListener('input', () => {
    query = searchEl.value;
    activeCellIndex = 0;
    renderGrid();
  });

  clearEl.addEventListener('click', () => pick(null));

  doc.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      win.close();
    }
  });

  async function pick(emoji) {
    try {
      const res = await browser.runtime.sendMessage({
        type: 'picasso:set-emoji',
        tabId,
        emoji
      });
      if (res?.ok) {
        win.close();
      } else {
        errorEl.hidden = false;
        errorEl.textContent = browser.i18n.getMessage('pickerSaveError');
      }
    } catch (err) {
      log.error('Failed to save emoji', err);
      errorEl.hidden = false;
      errorEl.textContent = browser.i18n.getMessage('pickerSaveError');
    }
  }

  renderGroups();
  renderGrid();
  searchEl.focus();
}

function applyI18n(browser, doc) {
  for (const el of doc.querySelectorAll('[data-i18n]')) {
    el.textContent = browser.i18n.getMessage(el.dataset.i18n);
  }
  for (const el of doc.querySelectorAll('[data-i18n-placeholder]')) {
    el.setAttribute('placeholder', browser.i18n.getMessage(el.dataset.i18nPlaceholder));
  }
  for (const el of doc.querySelectorAll('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', browser.i18n.getMessage(el.dataset.i18nAriaLabel));
  }
}

function buildModel(data) {
  const groups = Array.isArray(data?.groups) ? data.groups : [];
  const outGroups = [];
  for (const g of groups) {
    const emojis = Array.isArray(g.emojis) ? g.emojis : [];
    outGroups.push({
      key: String(g.key),
      label: String(g.label || g.key),
      emojis
    });
  }
  const all = [];
  for (const g of outGroups) for (const e of g.emojis) all.push(e);
  return { groups: outGroups, all };
}

function buildGroups(browser, model, recent) {
  const groups = [];
  if (recent.length > 0) {
    const byEmoji = new Map(model.all.map((e) => [e.emoji, e]));
    groups.push({
      key: RECENT_GROUP,
      label: browser.i18n.getMessage('pickerRecent'),
      emojis: recent.map((emoji) => byEmoji.get(emoji) ?? { emoji, label: emoji, tags: [] })
    });
  }
  groups.push({
    key: ALL_KEY,
    label: browser.i18n.getMessage('pickerAll'),
    emojis: model.all
  });
  for (const g of model.groups) groups.push(g);
  return groups;
}

function normalizeQuery(q) {
  return String(q || '')
    .trim()
    .toLowerCase();
}

function matches(entry, q) {
  if (!q) return true;
  const label = String(entry.label || '').toLowerCase();
  if (label.includes(q)) return true;
  const tags = Array.isArray(entry.tags) ? entry.tags : [];
  for (const t of tags) if (String(t).toLowerCase().includes(q)) return true;
  return false;
}

if (globalThis.browser && !globalThis.__PICASSO_TEST__) {
  start().catch((err) => console.error(err));
}
