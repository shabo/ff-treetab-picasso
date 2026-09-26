#!/usr/bin/env node
// Usage: node scripts/amo_admin.mjs status | disable-version <x.y.z[.w]>
// Needs WEB_EXT_API_KEY / WEB_EXT_API_SECRET (AMO JWT issuer and secret) in the environment.
import { readFileSync } from 'node:fs';
import { createAmoClient, parseArgs, summarizeVersions } from './lib/amo-api.js';

const manifest = JSON.parse(readFileSync(new URL('../src/manifest.json', import.meta.url), 'utf8'));
const addon = encodeURIComponent(manifest.browser_specific_settings.gecko.id);

const { action, version } = parseArgs(process.argv.slice(2));
const client = createAmoClient({
  issuer: process.env.WEB_EXT_API_KEY,
  secret: process.env.WEB_EXT_API_SECRET
});

const info = await client.getAddon(addon);
console.log(`Add-on ${info.slug}: status=${info.status} is_disabled=${info.is_disabled}`);
console.log(`Listing: ${info.url}`);
const versions = await client.listVersions(addon);
console.log('version | channel | file status | id');
for (const line of summarizeVersions(versions)) console.log(line);

if (action === 'disable-version') {
  const target = versions.find((v) => v.version === version);
  if (!target) throw new Error(`Version ${version} not found on AMO`);
  if (target.is_disabled) {
    console.log(`Version ${version} is already disabled.`);
  } else {
    const updated = await client.disableVersion(addon, target.id);
    console.log(`Disabled ${version}: ${summarizeVersions([updated])[0]}`);
  }
}
