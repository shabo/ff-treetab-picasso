import { describe, expect, it } from 'vitest';
import {
  COLOR_STATE_PREFIX,
  PALETTE,
  allColorStates,
  colorState,
  legacyShadeStates,
  parseColorMenuId,
  swatchDataUrl
} from '../../src/lib/palette.js';

describe('palette', () => {
  it('[TM-020] builds zero-padded state names', () => {
    expect(colorState(0)).toBe('tabs-color-color-00');
    expect(colorState(19)).toBe('tabs-color-color-19');
    expect(COLOR_STATE_PREFIX).toBe('tabs-color-color-');
  });

  it('[TM-021] parses a valid color menu id', () => {
    expect(parseColorMenuId('tabs-color-color-07')).toBe(7);
    expect(parseColorMenuId('tabs-color-color-00')).toBe(0);
    expect(parseColorMenuId('tabs-color-color-19')).toBe(19);
  });

  it.each(['tabs-color-color-20', 'tabs-color-color--01', 'tabs-color-color-xx', '', 'x'])(
    '[TM-022] rejects invalid id %j',
    (id) => {
      expect(parseColorMenuId(id)).toBeNull();
    }
  );

  it.each([5, undefined, null])('[TM-023] rejects non-string %j', (id) => {
    expect(parseColorMenuId(id)).toBeNull();
  });

  it('[TM-024] palette is stable: 20 unique #RRGGBB colors with text color and i18n key', () => {
    expect(PALETTE).toHaveLength(20);
    const hexes = PALETTE.map((c) => c.hex);
    expect(new Set(hexes).size).toBe(20);
    for (const c of PALETTE) {
      expect(c.hex).toMatch(/^#[0-9A-F]{6}$/);
      expect(c.text).toMatch(/^#(000000|FFFFFF)$/);
      expect(c.nameKey).toMatch(/^color[A-Z][a-z]+$/);
    }
    expect(PALETTE[0].hex).toBe('#E53935');
    expect(PALETTE[10].hex).toBe('#1E88E5');
    expect(PALETTE[19].hex).toBe('#9E9E9E');
    expect(Object.isFrozen(PALETTE)).toBe(true);
  });

  it('lists all color and legacy states', () => {
    expect(allColorStates()).toHaveLength(20);
    expect(allColorStates()[5]).toBe('tabs-color-color-05');
    expect(legacyShadeStates()).toHaveLength(20);
    expect(legacyShadeStates()[0]).toBe('tabs-color-shade-00');
  });

  it('builds an svg data url swatch', () => {
    const url = swatchDataUrl('#1E88E5');
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(url)).toContain('fill="#1E88E5"');
  });
});
