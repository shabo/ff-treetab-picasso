// In-memory `browser` API mock for unit tests. Every API function is a `vi.fn()` so tests can
// assert calls or override behavior with `mockImplementation` / `mockRejectedValueOnce`.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

const messages = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../../src/_locales/en/messages.json'),
    'utf8'
  )
);

export const EXTENSION_ID = 'tree-tab-picasso@local';
export const EXTENSION_ORIGIN = 'moz-extension://test-uuid/';

// Mimics browser.i18n.getMessage including named placeholders mapped to $1..$9.
export function getMessage(key, substitutions) {
  const entry = messages[key];
  if (!entry) return '';
  const subs = substitutions === undefined ? [] : [].concat(substitutions).map(String);
  let text = entry.message;
  if (entry.placeholders) {
    for (const [name, def] of Object.entries(entry.placeholders)) {
      const content = def.content.replace(/\$(\d)/g, (_, n) => subs[Number(n) - 1] ?? '');
      text = text.replace(new RegExp(`\\$${name}\\$`, 'gi'), content);
    }
  }
  return text.replace(/\$(\d)/g, (_, n) => subs[Number(n) - 1] ?? '');
}

// Event object with addListener/removeListener/hasListener and a test-only `fire`.
// `fire` calls every listener and resolves to the array of their (awaited) return values.
export function createEvent() {
  const listeners = new Set();
  return {
    addListener: vi.fn((fn) => listeners.add(fn)),
    removeListener: vi.fn((fn) => listeners.delete(fn)),
    hasListener: vi.fn((fn) => listeners.has(fn)),
    get listenerCount() {
      return listeners.size;
    },
    async fire(...args) {
      return Promise.all([...listeners].map((fn) => fn(...args)));
    }
  };
}

const noTab = (tabId) => new Error(`Invalid tab ID: ${tabId}`);

export function createBrowserMock({ tabs: initialTabs = [] } = {}) {
  // Open tabs: array of {id, windowId, ...}. Tests may replace via `setTabs`.
  let openTabs = initialTabs.map((t) => ({ windowId: 1, ...t }));
  // sessions tab values: Map<tabId, Map<key, jsonString>>
  const tabValues = new Map();
  // storage.local contents
  let storage = {};

  const isOpen = (tabId) => openTabs.some((t) => t.id === tabId);
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

  const browser = {
    runtime: {
      id: EXTENSION_ID,
      sendMessage: vi.fn(async () => undefined),
      getManifest: vi.fn(() => ({
        name: 'Tree Tab Picasso',
        version: '0.0.0-test',
        icons: { 48: 'icons/icon-48.png' }
      })),
      getURL: vi.fn((path) => `${EXTENSION_ORIGIN}${String(path).replace(/^\//, '')}`),
      onMessage: createEvent(),
      onMessageExternal: createEvent(),
      onInstalled: createEvent(),
      onStartup: createEvent()
    },
    menus: {
      create: vi.fn(() => undefined),
      removeAll: vi.fn(async () => undefined),
      onClicked: createEvent()
    },
    tabs: {
      query: vi.fn(async () => clone(openTabs)),
      create: vi.fn(async (props) => ({ id: 9999, ...props })),
      onRemoved: createEvent(),
      onCreated: createEvent()
    },
    sessions: {
      getTabValue: vi.fn(async (tabId, key) => {
        if (!isOpen(tabId)) throw noTab(tabId);
        const raw = tabValues.get(tabId)?.get(key);
        return raw === undefined ? undefined : JSON.parse(raw);
      }),
      setTabValue: vi.fn(async (tabId, key, value) => {
        if (!isOpen(tabId)) throw noTab(tabId);
        if (!tabValues.has(tabId)) tabValues.set(tabId, new Map());
        tabValues.get(tabId).set(key, JSON.stringify(value));
      }),
      removeTabValue: vi.fn(async (tabId, key) => {
        if (!isOpen(tabId)) throw noTab(tabId);
        tabValues.get(tabId)?.delete(key);
      })
    },
    storage: {
      local: {
        get: vi.fn(async (keys) => {
          if (keys === null || keys === undefined) return clone(storage);
          const list = typeof keys === 'string' ? [keys] : Array.isArray(keys) ? keys : null;
          if (list) {
            const out = {};
            for (const k of list) if (k in storage) out[k] = clone(storage[k]);
            return out;
          }
          // Object form: keys with defaults.
          const out = {};
          for (const [k, def] of Object.entries(keys))
            out[k] = k in storage ? clone(storage[k]) : def;
          return out;
        }),
        set: vi.fn(async (items) => {
          storage = { ...storage, ...clone(items) };
        }),
        remove: vi.fn(async (keys) => {
          for (const k of [].concat(keys)) delete storage[k];
        })
      }
    },
    notifications: {
      create: vi.fn(async (id) => id),
      clear: vi.fn(async () => true),
      onClicked: createEvent()
    },
    windows: {
      create: vi.fn(async (props) => ({ id: 77, ...props }))
    },
    i18n: {
      getMessage: vi.fn(getMessage),
      getUILanguage: vi.fn(() => 'en')
    }
  };

  // Test-only helpers (not part of the WebExtension API).
  const helpers = {
    setTabs(tabs) {
      openTabs = tabs.map((t) => ({ windowId: 1, ...t }));
    },
    getTabs() {
      return clone(openTabs);
    },
    // Directly read/write a stored session value (bypasses the vi.fn call log).
    peekTabValue(tabId, key) {
      const raw = tabValues.get(tabId)?.get(key);
      return raw === undefined ? undefined : JSON.parse(raw);
    },
    seedTabValue(tabId, key, value) {
      if (!tabValues.has(tabId)) tabValues.set(tabId, new Map());
      tabValues.get(tabId).set(key, JSON.stringify(value));
    },
    getStorage() {
      return clone(storage);
    },
    seedStorage(items) {
      storage = { ...storage, ...clone(items) };
    }
  };

  return Object.assign(browser, { __test: helpers });
}
