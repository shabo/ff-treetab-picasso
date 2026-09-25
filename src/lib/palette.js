// 20-color palette. The index is stored in tab markers and is part of the TST state class
// name, so the order and values MUST stay stable across releases.

export const PALETTE = Object.freeze(
  [
    { nameKey: 'colorRed', hex: '#E53935', text: '#FFFFFF' },
    { nameKey: 'colorOrange', hex: '#FB8C00', text: '#000000' },
    { nameKey: 'colorAmber', hex: '#FFB300', text: '#000000' },
    { nameKey: 'colorYellow', hex: '#FDD835', text: '#000000' },
    { nameKey: 'colorLime', hex: '#C0CA33', text: '#000000' },
    { nameKey: 'colorGreen', hex: '#43A047', text: '#FFFFFF' },
    { nameKey: 'colorEmerald', hex: '#00A878', text: '#FFFFFF' },
    { nameKey: 'colorTeal', hex: '#00897B', text: '#FFFFFF' },
    { nameKey: 'colorCyan', hex: '#00ACC1', text: '#000000' },
    { nameKey: 'colorSky', hex: '#29B6F6', text: '#000000' },
    { nameKey: 'colorBlue', hex: '#1E88E5', text: '#FFFFFF' },
    { nameKey: 'colorIndigo', hex: '#3949AB', text: '#FFFFFF' },
    { nameKey: 'colorViolet', hex: '#7E57C2', text: '#FFFFFF' },
    { nameKey: 'colorPurple', hex: '#8E24AA', text: '#FFFFFF' },
    { nameKey: 'colorMagenta', hex: '#D81B60', text: '#FFFFFF' },
    { nameKey: 'colorPink', hex: '#EC407A', text: '#000000' },
    { nameKey: 'colorRose', hex: '#F06292', text: '#000000' },
    { nameKey: 'colorBrown', hex: '#6D4C41', text: '#FFFFFF' },
    { nameKey: 'colorSlate', hex: '#546E7A', text: '#FFFFFF' },
    { nameKey: 'colorGray', hex: '#9E9E9E', text: '#000000' }
  ].map((c) => Object.freeze(c))
);

export const COLOR_STATE_PREFIX = 'tabs-color-color-';
// States from v0.1.0. Still removed on every color change so old tabs get cleaned up.
const LEGACY_SHADE_PREFIX = 'tabs-color-shade-';

const pad2 = (i) => String(i).padStart(2, '0');

export function colorState(index) {
  return `${COLOR_STATE_PREFIX}${pad2(index)}`;
}

export function allColorStates() {
  return PALETTE.map((_, i) => colorState(i));
}

export function legacyShadeStates() {
  return PALETTE.map((_, i) => `${LEGACY_SHADE_PREFIX}${pad2(i)}`);
}

// The color menu item IDs equal the state names: `tabs-color-color-NN`.
export function parseColorMenuId(id) {
  if (typeof id !== 'string' || !id.startsWith(COLOR_STATE_PREFIX)) return null;
  const digits = id.slice(COLOR_STATE_PREFIX.length);
  if (!/^\d{2}$/.test(digits)) return null;
  const index = Number(digits);
  return index < PALETTE.length ? index : null;
}

export function swatchDataUrl(hex) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">' +
    `<rect x="1" y="3" width="14" height="10" rx="2" fill="${hex}" ` +
    'stroke="rgba(0,0,0,0.35)" stroke-width="1"/></svg>';
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
