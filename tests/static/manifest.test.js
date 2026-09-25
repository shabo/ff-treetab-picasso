import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PALETTE } from '../../src/lib/palette.js';

const SRC = new URL('../../src/', import.meta.url).pathname;
const read = (p) => readFileSync(join(SRC, p), 'utf8');
const manifest = JSON.parse(read('manifest.json'));
const messages = JSON.parse(read('_locales/en/messages.json'));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const sourceFiles = walk(SRC).filter(
  (f) => /\.(js|html|json)$/.test(f) && !f.endsWith('emoji-data.js') && !f.includes('_locales')
);

describe('manifest and i18n', () => {
  it('[TM-143] every referenced message key exists in the English catalog', () => {
    const patterns = [
      /__MSG_(\w+)__/g,
      /getMessage\(\s*'(\w+)'/g,
      /data-i18n(?:-[\w-]+)?="(\w+)"/g,
      /\bt\(\s*'(\w+)'/g
    ];
    const missing = [];
    let found = 0;
    for (const file of sourceFiles) {
      const text = readFileSync(file, 'utf8');
      for (const re of patterns) {
        for (const [, key] of text.matchAll(re)) {
          found++;
          if (!messages[key]) missing.push(`${file}: ${key}`);
        }
      }
    }
    expect(found).toBeGreaterThan(10);
    expect(missing).toEqual([]);
  });

  it('[TM-143] every palette color name exists in the catalog', () => {
    for (const color of PALETTE) expect(messages[color.nameKey], color.nameKey).toBeDefined();
  });

  it('[TM-143] every catalog entry has a non-empty message and description', () => {
    for (const [key, entry] of Object.entries(messages)) {
      expect(entry.message, key).toMatch(/\S/);
      expect(entry.description, key).toMatch(/\S/);
    }
  });

  it('[TM-144] permissions are exactly the ones in use; no tabs permission', () => {
    expect([...manifest.permissions].sort()).toEqual([
      'menus',
      'notifications',
      'sessions',
      'storage'
    ]);
    expect(manifest.optional_permissions).toBeUndefined();
  });

  it('declares Firefox 140+, no data collection, and a localized name', () => {
    const gecko = manifest.browser_specific_settings.gecko;
    expect(gecko.strict_min_version).toBe('140.0');
    expect(gecko.id).toBe('tree-tab-picasso@local');
    expect(gecko.data_collection_permissions).toEqual({ required: ['none'] });
    expect(manifest.name).toBe('__MSG_extName__');
    expect(manifest.default_locale).toBe('en');
    expect(manifest.background).toEqual({ page: 'background.html' });
  });

  it('manifest and package versions match', () => {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
    expect(manifest.version).toBe(pkg.version);
  });

  it('[TM-143] no network access: no fetch/XMLHttpRequest/WebSocket in source', () => {
    for (const file of sourceFiles.filter((f) => f.endsWith('.js'))) {
      expect(readFileSync(file, 'utf8'), file).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket/);
    }
  });
});

describe('[US6] no hard-coded user-visible strings', () => {
  it('picker.html has no text outside data-i18n elements', () => {
    const html = read('picker/picker.html')
      .replace(/<script[\s\S]*?<\/script>/g, '')
      .replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!doctype[^>]*>/i, '');
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    expect(text).toBe('');
  });

  it('picker.html uses i18n for placeholder and aria labels', () => {
    const html = read('picker/picker.html');
    expect(html).not.toMatch(/\splaceholder="/);
    expect(html).not.toMatch(/\saria-label="/);
    expect(html).not.toMatch(/\stitle="/);
  });

  it('menu titles only come from the catalog', () => {
    const js = read('background/menus.js');
    expect(js).not.toMatch(/title:\s*['"`]/);
  });
});
