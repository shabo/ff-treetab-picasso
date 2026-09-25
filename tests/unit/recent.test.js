import { describe, expect, it } from 'vitest';
import { pushRecent, RECENT_MAX, sanitizeRecent } from '../../src/lib/recent.js';

describe('pushRecent', () => {
  it('[TM-060] adds an emoji to an empty list', () => {
    expect(pushRecent([], 'a')).toEqual(['a']);
  });

  it('[TM-061] moves an existing emoji to the front', () => {
    expect(pushRecent(['a', 'b'], 'b')).toEqual(['b', 'a']);
  });

  it('[TM-062] drops the oldest entry when the list is full', () => {
    const full = Array.from({ length: RECENT_MAX }, (_, i) => String.fromCodePoint(0x1f600 + i));
    const next = pushRecent(full, 'z');
    expect(next.length).toBe(RECENT_MAX);
    expect(next[0]).toBe('z');
    expect(next.at(-1)).toBe(full[RECENT_MAX - 2]);
  });

  it('[TM-063] keeps 24 entries when adding to a 23-entry list', () => {
    const list = Array.from({ length: RECENT_MAX - 1 }, (_, i) =>
      String.fromCodePoint(0x1f600 + i)
    );
    const next = pushRecent(list, 'z');
    expect(next.length).toBe(RECENT_MAX);
    expect(next[0]).toBe('z');
  });

  it('[TM-064] leaves the list unchanged for invalid emoji', () => {
    expect(pushRecent(['a'], '')).toEqual(['a']);
    expect(pushRecent(['a'], null)).toEqual(['a']);
    expect(pushRecent(['a'], 'x'.repeat(65))).toEqual(['a']);
  });

  it('does not mutate the input list', () => {
    const input = ['a', 'b'];
    const output = pushRecent(input, 'c');
    expect(input).toEqual(['a', 'b']);
    expect(output).not.toBe(input);
  });
});

describe('sanitizeRecent', () => {
  it('[TM-065] sanitizes invalid inputs', () => {
    expect(sanitizeRecent('x')).toEqual([]);
    expect(sanitizeRecent(null)).toEqual([]);
    expect(sanitizeRecent([1, 'a', 'a'])).toEqual(['a']);
  });

  it('caps the result at RECENT_MAX', () => {
    const list = Array.from({ length: 30 }, (_, i) => String.fromCodePoint(0x1f600 + i));
    expect(sanitizeRecent(list).length).toBe(RECENT_MAX);
  });
});
