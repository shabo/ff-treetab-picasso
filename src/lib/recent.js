import { isValidEmoji } from './validate.js';

export const RECENT_MAX = 24;

export function sanitizeRecent(raw) {
  if (!Array.isArray(raw)) return [];

  const out = [];
  for (const item of raw) {
    if (!isValidEmoji(item)) continue;
    if (out.includes(item)) continue;
    out.push(item);
    if (out.length >= RECENT_MAX) break;
  }
  return out;
}

export function pushRecent(list, emoji) {
  const base = sanitizeRecent(list);
  if (!isValidEmoji(emoji)) return base;
  return [emoji, ...base.filter((e) => e !== emoji)].slice(0, RECENT_MAX);
}
