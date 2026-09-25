import { isValidEmoji, isValidTabId } from './validate.js';
import { PALETTE, colorState } from './palette.js';

export function cssString(s) {
  let out = '"';
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp === 0x5c) {
      out += '\\\\';
    } else if (cp === 0x22) {
      out += '\\"';
    } else if (cp < 0x20 || cp === 0x7f || cp === 0x2028 || cp === 0x2029) {
      out += `\\${cp.toString(16)} `;
    } else {
      out += ch;
    }
  }
  return `${out}"`;
}

// Tree Style Tab 4 themes declare --tab-surface / --tab-text on tab-item-substance and paint
// the tab from `tab-item-substance .background`. Variables set only on tab-item are shadowed,
// so each color rule targets the substance and the background layer directly. State classes are
// present on both tab-item and tab-item-substance, so both selectors are listed.
function colorRules(state, hex, text) {
  const substance = `tab-item.${state} tab-item-substance, tab-item-substance.${state}`;
  const background =
    `tab-item.${state} tab-item-substance .background:not(.base), ` +
    `tab-item-substance.${state} .background:not(.base)`;
  return [
    `${substance} { --tab-surface: ${hex} !important; --tab-surface-regular: ${hex} !important; ` +
      `--tab-surface-hover: ${hex} !important; --tab-surface-active: ${hex} !important; ` +
      `--tab-surface-bgimage: none !important; --tab-surface-active-bgimage: none !important; ` +
      `--tab-text: ${text} !important; --tab-text-regular: ${text} !important; ` +
      `--tab-text-shadow: none !important; color: ${text} !important; }`,
    `${background} { background-color: ${hex} !important; background-image: none !important; ` +
      'transition: background-color 120ms linear; }',
    // Keep the active tab recognizable when it is colored.
    `tab-item-substance.${state}:is(.active, .bundled-active) .background:not(.base) { ` +
      `box-shadow: inset 0 0 0 2px ${text} !important; }`
  ];
}

// Drawn above `.background` (z-index 10) and below TST UI such as close buttons.
const EMOJI_DECLARATIONS =
  'display: inline-flex; align-items: center; justify-content: center; width: 1.35em; ' +
  'margin-inline-end: 6px; font-size: 14px; line-height: 1; pointer-events: none; ' +
  'position: relative; z-index: 150;';

export function buildTstStyle(markers) {
  const lines = ['/* Injected by Tree Tab Picasso */'];

  PALETTE.forEach(({ hex, text }, i) => lines.push(...colorRules(colorState(i), hex, text)));

  lines.push(
    '@media (prefers-reduced-motion: reduce) { tab-item-substance .background { transition: none !important; } }'
  );

  const entries = markers instanceof Map ? [...markers.entries()] : Object.entries(markers);
  const sorted = entries
    .map(([key, marker]) => ({ id: Number(key), marker }))
    .filter(({ id }) => isValidTabId(id))
    .filter(({ marker }) => marker && typeof marker === 'object' && isValidEmoji(marker.emoji))
    .sort((a, b) => a.id - b.id);

  for (const { id, marker } of sorted) {
    lines.push(
      `tab-item[data-tab-id="${id}"] tab-item-substance::before, ` +
        `tab-item-substance[data-tab-id="${id}"]::before { ` +
        `content: ${cssString(marker.emoji)}; ${EMOJI_DECLARATIONS} }`
    );
  }

  return lines.join('\n');
}
