const { series } = require('gulp');
const { spawn } = require('node:child_process');

function run(bin, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      stdio: 'inherit',
      env
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${bin} ${args.join(' ')} failed with exit code ${code}`));
    });
  });
}

function npxBin() {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx';
}

async function buildUnsigned() {
  await run(
    npxBin(),
    ['web-ext', 'build', '-s', 'src', '-a', 'dist', '--overwrite-dest'],
    { ...process.env, NO_UPDATE_NOTIFIER: '1' }
  );
}

async function publishToAmo() {
  const issuer = process.env.AMO_JWT_ISSUER;
  const secret = process.env.AMO_JWT_SECRET;
  const channel = process.env.AMO_CHANNEL || 'listed';
  const requirePublish = process.env.AMO_REQUIRE_PUBLISH === '1';

  if (!issuer || !secret) {
    const msg = 'Skipping AMO publish: missing AMO_JWT_ISSUER/AMO_JWT_SECRET';
    if (requirePublish) throw new Error(msg);
    console.log(`[gulp] ${msg}`);
    return;
  }

  await run(
    npxBin(),
    [
      'web-ext',
      'sign',
      '-s',
      'src',
      '-a',
      'dist',
      `--channel=${channel}`,
      `--api-key=${issuer}`,
      `--api-secret=${secret}`
    ],
    { ...process.env, NO_UPDATE_NOTIFIER: '1' }
  );
}

exports['build:unsigned'] = buildUnsigned;
exports.publish = publishToAmo;
exports.build = series(buildUnsigned, publishToAmo);
exports.default = exports.build;

