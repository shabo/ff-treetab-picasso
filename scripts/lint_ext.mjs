#!/usr/bin/env node
// Runs `web-ext lint` and fails on any error or warning, except warnings listed in ALLOWED.

import { spawnSync } from 'node:child_process';

// Desktop-only add-on (menus API is not available on Android), so the Android minimum-version
// warning for data_collection_permissions does not apply. Declaring gecko_android would wrongly
// mark the add-on as Android-compatible.
const ALLOWED = new Set(['KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION']);

const run = spawnSync('npx', ['web-ext', 'lint', '--source-dir', 'src', '--output', 'json'], {
  encoding: 'utf8',
  env: { ...process.env, NO_UPDATE_NOTIFIER: '1' }
});

let report;
try {
  report = JSON.parse(run.stdout);
} catch (error) {
  console.error('Could not parse web-ext lint output.', error.message);
  console.error(run.stdout, run.stderr);
  process.exit(1);
}

const problems = [...report.errors, ...report.warnings.filter((w) => !ALLOWED.has(w.code))];
const skipped = report.warnings.filter((w) => ALLOWED.has(w.code));

for (const w of skipped) console.log(`allowed warning: ${w.code} (${w.file ?? 'manifest'})`);
for (const p of problems) {
  console.error(`${p._type ?? 'problem'}: ${p.code} ${p.file ?? ''}:${p.line ?? ''} ${p.message}`);
}
console.log(
  `web-ext lint: ${report.errors.length} errors, ${report.warnings.length} warnings ` +
    `(${skipped.length} allowed), ${report.notices.length} notices`
);
process.exit(problems.length > 0 ? 1 : 0);
