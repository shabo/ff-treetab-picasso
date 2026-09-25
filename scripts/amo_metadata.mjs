#!/usr/bin/env node
// Builds the AMO metadata used for a listed submission:
// amo-metadata-listed.json + reviewer notes + release notes for the manifest version.
// Usage: node scripts/amo_metadata.mjs <output.json>

import fs from 'node:fs';

const out = process.argv[2];
if (!out) {
  console.error('Usage: node scripts/amo_metadata.mjs <output.json>');
  process.exit(1);
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const meta = readJson('amo-metadata-listed.json');
const { version } = readJson('src/manifest.json');

// Release notes: the CHANGELOG section "## [x.y.z]" up to the next "## [".
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const escaped = version.replace(/\./g, '\\.');
const match = new RegExp(
  `^## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=^## \\[|(?![\\s\\S]))`,
  'm'
).exec(changelog);
if (!match || !match[1].trim()) {
  console.error(`CHANGELOG.md has no entry for version ${version}`);
  process.exit(1);
}

meta.version = {
  ...meta.version,
  release_notes: { 'en-US': match[1].trim() },
  approval_notes: fs.readFileSync('AMO_REVIEWER_NOTES.md', 'utf8')
};

fs.writeFileSync(out, `${JSON.stringify(meta, null, 2)}\n`);
console.log(`Wrote ${out} for version ${version}`);
