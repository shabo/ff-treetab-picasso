// Input validation shared by the background page, the picker, and stored data.

import { PALETTE } from './palette.js';

export const EMOJI_MAX_LENGTH = 64;

// C0 control characters and DEL. They have no place in a tab marker.
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

export function isValidTabId(value) {
  return Number.isInteger(value) && value >= 0;
}

export function isValidEmoji(value) {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= EMOJI_MAX_LENGTH &&
    !CONTROL_CHARS.test(value)
  );
}

export function isValidColor(value) {
  return Number.isInteger(value) && value >= 0 && value < PALETTE.length;
}

// Returns a marker with only the valid fields, or null when no field is valid.
export function sanitizeMarker(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const marker = {};
  if (isValidColor(raw.color)) marker.color = raw.color;
  if (isValidEmoji(raw.emoji)) marker.emoji = raw.emoji;
  return Object.keys(marker).length > 0 ? marker : null;
}
