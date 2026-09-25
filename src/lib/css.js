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

export function buildTstStyle(markers) {
  const lines = ['/* Injected by Tree Tab Picasso */'];

  for (let i = 0; i < PALETTE.length; i++) {
    const state = colorState(i);
    const { hex, text } = PALETTE[i];
    lines.push(
      `tab-item.${state} { --tab-surface: ${hex} !important; --tab-surface-bgimage: none !important; --tab-text: ${text} !important; --tab-text-shadow: none !important; }`
    );
    lines.push(
      `tab-item.${state} tab-item-substance { background: var(--tab-surface) !important; transition: background-color 120ms linear; }`
    );
    lines.push(
      `tab-item.${state}.active, tab-item.${state}.bundled-active { --tab-surface: ${hex} !important; --tab-text: ${text} !important; }`
    );
  }

  lines.push(
    '@media (prefers-reduced-motion: reduce) { tab-item-substance { transition: none !important; } }'
  );

  const entries = markers instanceof Map ? [...markers.entries()] : Object.entries(markers);
  const sorted = entries
    .map(([key, marker]) => ({ id: Number(key), marker }))
    .filter(({ id }) => isValidTabId(id))
    .filter(({ marker }) => marker && typeof marker === 'object' && isValidEmoji(marker.emoji))
    .sort((a, b) => a.id - b.id);

  for (const { id, marker } of sorted) {
    lines.push(
      `tab-item[data-tab-id="${id}"] tab-item-substance::before { content: ${cssString(
        marker.emoji
      )}; display: inline-flex; align-items: center; justify-content: center; width: 1.35em; margin-right: 6px; font-size: 14px; line-height: 1; pointer-events: none; }`
    );
  }

  return lines.join('\n');
}
