import { describe, it, expect } from 'vitest';
import { nextIndex, columnsFor } from '../../src/picker/picker-nav.js';

describe('picker-nav', () => {
  it('[TM-120] ArrowRight moves to next index', () => {
    expect(nextIndex(0, 'ArrowRight', 10, 8)).toBe(1);
  });

  it('[TM-121] ArrowRight clamps to last', () => {
    expect(nextIndex(9, 'ArrowRight', 10, 8)).toBe(9);
  });

  it('[TM-122] ArrowLeft and ArrowUp clamp to first', () => {
    expect(nextIndex(0, 'ArrowLeft', 10, 8)).toBe(0);
    expect(nextIndex(0, 'ArrowUp', 10, 8)).toBe(0);
  });

  it('[TM-123] ArrowDown clamps to last', () => {
    expect(nextIndex(3, 'ArrowDown', 10, 8)).toBe(9);
  });

  it('[TM-124] ArrowUp moves up one row', () => {
    expect(nextIndex(9, 'ArrowUp', 10, 8)).toBe(1);
  });

  it('[TM-125] Home and End jump to first and last', () => {
    expect(nextIndex(5, 'Home', 10, 8)).toBe(0);
    expect(nextIndex(5, 'End', 10, 8)).toBe(9);
  });

  it('[TM-126] count 0 returns -1 for any key', () => {
    for (const key of [
      'ArrowRight',
      'ArrowLeft',
      'ArrowDown',
      'ArrowUp',
      'Home',
      'End',
      'Unknown'
    ]) {
      expect(nextIndex(0, key, 0, 8)).toBe(-1);
    }
  });

  it('[TM-127] unknown key returns index unchanged', () => {
    expect(nextIndex(3, 'Tab', 10, 8)).toBe(3);
  });

  it('columnsFor returns at least 1 and floors the division', () => {
    expect(columnsFor(320, 40)).toBe(8);
    expect(columnsFor(319, 40)).toBe(7);
    expect(columnsFor(0, 40)).toBe(1);
    expect(columnsFor(100, 0)).toBe(1);
  });
});
