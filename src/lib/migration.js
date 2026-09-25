import { isValidEmoji } from './validate.js';

export const LEGACY_EMOJI_KEY = 'tabs-color-tab-emoji-v1';
export const MIGRATION_FLAG_KEY = 'picasso-migrated-v1';

export function planLegacyMigration(raw, openTabIds) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];

  const open =
    openTabIds instanceof Set ? openTabIds : new Set(Array.isArray(openTabIds) ? openTabIds : []);

  const out = [];
  for (const [key, value] of Object.entries(raw)) {
    if (!/^\d+$/.test(key)) continue;
    const tabId = Number(key);
    if (!open.has(tabId)) continue;
    if (!isValidEmoji(value)) continue;
    out.push({ tabId, emoji: value });
  }

  return out.sort((a, b) => a.tabId - b.tabId);
}
