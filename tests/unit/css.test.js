import { describe, expect, it } from 'vitest';
import { buildTstStyle, cssString } from '../../src/lib/css.js';
import { colorState } from '../../src/lib/palette.js';

function stripBlockComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripCssStrings(s) {
  return stripBlockComments(s).replace(/"(?:\\.|[^"\\])*"/g, '""');
}

function braceBalance(s) {
  return [...stripCssStrings(s)].reduce((acc, c) => acc + (c === '{' ? 1 : c === '}' ? -1 : 0), 0);
}

describe('cssString', () => {
  it('[TM-032] escapes hostile emoji payloads safely', () => {
    const payloads = ['"', '\\', '*/ body{}', '</style>', 'a\nb', '\u0000', '\u007f'];
    for (const payload of payloads) {
      const escaped = cssString(payload);
      expect(escaped.startsWith('"')).toBe(true);
      expect(escaped.endsWith('"')).toBe(true);
      const inner = escaped.slice(1, -1);
      expect(inner).not.toMatch(/(?<!\\)"/);
      expect(inner).not.toMatch(/\n/);
    }
  });

  it('leaves normal emoji intact', () => {
    expect(cssString('🔥')).toBe('"🔥"');
  });
});

describe('buildTstStyle', () => {
  it('[TM-030] empty map produces 20 color rules and no emoji rules', () => {
    const style = buildTstStyle(new Map());
    expect(style).toContain('/* Injected by Tree Tab Picasso */');
    expect(style).toContain(colorState(0));
    expect(style).toContain(colorState(19));
    expect(style).toContain('--tab-surface-bgimage');
    expect(style).toContain('@media (prefers-reduced-motion: reduce)');
    expect(style).not.toContain('tab-item[data-tab-id');
  });

  it('[TM-031] single emoji marker produces one rule', () => {
    const style = buildTstStyle({ 5: { emoji: '🔥' } });
    expect(style).toContain('tab-item[data-tab-id="5"]');
    expect(style).toContain('content: "🔥"');
  });

  it('[TM-033] color-only marker produces no emoji rule', () => {
    const style = buildTstStyle(new Map([[5, { color: 3 }]]));
    expect(style).toContain(colorState(3));
    expect(style).not.toContain('tab-item[data-tab-id="5"]');
  });

  it('[TM-034] builds 1000 marker rules within the time bound', () => {
    const markers = new Map();
    for (let i = 0; i < 1000; i++) {
      markers.set(i, { emoji: String.fromCodePoint(0x1f600 + i) });
    }
    const start = performance.now();
    const style = buildTstStyle(markers);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(250);
    const matches = style.match(/tab-item\[data-tab-id=/g);
    expect(matches?.length).toBe(1000);
  });

  it('[TM-035] skips invalid tab ids and invalid emojis', () => {
    const style = buildTstStyle({
      x: { emoji: '🔥' },
      '-1': { emoji: '🔥' },
      1.5: { emoji: '🔥' },
      5: { emoji: '' },
      6: { emoji: null },
      7: { emoji: '✅' }
    });
    expect(style).toContain('tab-item[data-tab-id="7"]');
    expect(style).not.toContain('tab-item[data-tab-id="x"]');
    expect(style).not.toContain('tab-item[data-tab-id="-1"]');
    expect(style).not.toContain('tab-item[data-tab-id="5"]');
    expect(style).not.toContain('tab-item[data-tab-id="6"]');
  });

  it('sorts emoji rules by tab id ascending', () => {
    const style = buildTstStyle({ 3: { emoji: 'a' }, 1: { emoji: 'b' }, 2: { emoji: 'c' } });
    const ids = [...style.matchAll(/data-tab-id="(\d+)"/g)].map((m) => Number(m[1]));
    expect(ids).toEqual([1, 2, 3]);
  });

  it('has balanced braces outside strings', () => {
    const style = buildTstStyle(
      new Map([
        [1, { emoji: '"' }],
        [2, { emoji: '\\' }]
      ])
    );
    expect(braceBalance(style)).toBe(0);
    const noComments = stripBlockComments(style);
    const noStrings = noComments.replace(/"(?:\\.|[^"\\])*"/g, '""');
    expect(noStrings).not.toContain('*/');
  });
});

// Tree Style Tab 4.x themes declare --tab-surface / --tab-text on tab-item-substance and paint
// tab-item-substance .background from it. Rules must target those elements, not tab-item only.
function rulesFor(style, selectorPart) {
  const rules = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  for (const [, selector, body] of stripBlockComments(style).matchAll(re)) {
    if (selector.includes(selectorPart)) rules.push({ selector: selector.trim(), body });
  }
  return rules;
}

describe('buildTstStyle for Tree Style Tab 4 themes', () => {
  const style = buildTstStyle(new Map([[5, { emoji: '🔥' }]]));

  it.each([0, 10, 19])(
    '[TM-036] color %i sets surface and text variables on the substance itself',
    (i) => {
      const state = colorState(i);
      const rule = rulesFor(style, `tab-item-substance.${state}`).find((r) =>
        r.body.includes('--tab-surface:')
      );
      expect(rule, `rule for tab-item-substance.${state}`).toBeDefined();
      expect(rule.selector).toContain(`tab-item.${state} tab-item-substance`);
      expect(rule.body).toMatch(/--tab-surface:\s*#[0-9A-F]{6} !important/);
      expect(rule.body).toMatch(/--tab-text:\s*#[0-9A-F]{6} !important/);
      expect(rule.body).toMatch(/--tab-surface-bgimage:\s*none !important/);
    }
  );

  it.each([0, 10, 19])('[TM-037] color %i paints the .background layer directly', (i) => {
    const state = colorState(i);
    const rule = rulesFor(style, `tab-item-substance.${state} .background`)[0];
    expect(rule).toBeDefined();
    expect(rule.selector).toContain(':not(.base)');
    expect(rule.body).toMatch(/background-color:\s*#[0-9A-F]{6} !important/);
    expect(rule.body).toMatch(/background-image:\s*none !important/);
  });

  it('[TM-038] emoji marker sits above the tab background layer', () => {
    const rule = rulesFor(style, '[data-tab-id="5"]')[0];
    expect(rule.selector).toContain('tab-item[data-tab-id="5"] tab-item-substance::before');
    expect(rule.selector).toContain('tab-item-substance[data-tab-id="5"]::before');
    expect(rule.body).toMatch(/position:\s*relative/);
    const z = /z-index:\s*(\d+)/.exec(rule.body);
    expect(z, 'z-index').not.toBeNull();
    // TST 4: .background uses z-index 10, favicons 200.
    expect(Number(z[1])).toBeGreaterThan(10);
  });
});
