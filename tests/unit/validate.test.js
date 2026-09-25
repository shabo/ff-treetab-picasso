import { describe, expect, it } from 'vitest';
import {
  EMOJI_MAX_LENGTH,
  isValidColor,
  isValidEmoji,
  isValidTabId,
  sanitizeMarker
} from '../../src/lib/validate.js';

describe('isValidTabId', () => {
  it('[TM-001] accepts 0 (boundary min)', () => {
    expect(isValidTabId(0)).toBe(true);
  });
  it('[TM-002] accepts a normal id', () => {
    expect(isValidTabId(42)).toBe(true);
  });
  it('[TM-003] rejects -1 (below min)', () => {
    expect(isValidTabId(-1)).toBe(false);
  });
  it.each([1.5, NaN, Infinity])('[TM-004] rejects non-integer %s', (v) => {
    expect(isValidTabId(v)).toBe(false);
  });
  it.each(['42', null, undefined, {}])('[TM-005] rejects type mismatch %s', (v) => {
    expect(isValidTabId(v)).toBe(false);
  });
});

describe('isValidEmoji', () => {
  it('[TM-006] accepts an emoji', () => {
    expect(isValidEmoji('😀')).toBe(true);
  });
  it('[TM-007] accepts 1 code unit (boundary min)', () => {
    expect(isValidEmoji('a')).toBe(true);
  });
  it('[TM-008] accepts 64 code units (boundary max)', () => {
    expect(EMOJI_MAX_LENGTH).toBe(64);
    expect(isValidEmoji('a'.repeat(64))).toBe(true);
  });
  it('[TM-009] rejects 65 code units', () => {
    expect(isValidEmoji('a'.repeat(65))).toBe(false);
  });
  it('[TM-010] rejects empty string', () => {
    expect(isValidEmoji('')).toBe(false);
  });
  it.each(['a\nb', '\u0000', '\u007f', '\u001f'])('[TM-011] rejects control chars %j', (v) => {
    expect(isValidEmoji(v)).toBe(false);
  });
  it.each([123, null, []])('[TM-012] rejects type mismatch %j', (v) => {
    expect(isValidEmoji(v)).toBe(false);
  });
});

describe('isValidColor', () => {
  it.each([0, 19])('[TM-013] accepts boundary %s', (v) => {
    expect(isValidColor(v)).toBe(true);
  });
  it.each([-1, 20, 1.2, '3', null])('[TM-014] rejects %j', (v) => {
    expect(isValidColor(v)).toBe(false);
  });
});

describe('sanitizeMarker', () => {
  it('keeps valid fields', () => {
    expect(sanitizeMarker({ color: 3, emoji: '🔥' })).toEqual({ color: 3, emoji: '🔥' });
  });
  it('drops invalid fields independently', () => {
    expect(sanitizeMarker({ color: 99, emoji: '🔥' })).toEqual({ emoji: '🔥' });
    expect(sanitizeMarker({ color: 2, emoji: '' })).toEqual({ color: 2 });
  });
  it.each([null, undefined, 'x', 5, [], {}, { color: -1, emoji: 7 }])(
    'returns null when nothing valid: %j',
    (v) => {
      expect(sanitizeMarker(v)).toBeNull();
    }
  );
});
