import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const bumpType = process.argv[2] || 'patch';
const allowed = new Set(['patch', 'minor', 'major']);

if (!allowed.has(bumpType)) {
  console.error(`Invalid bump type "${bumpType}". Use: patch | minor | major`);
  process.exit(1);
}

function nextVersion(version, type) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported version format "${version}". Expected x.y.z`);
  }

  let major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (type === 'major') {
    major += 1;
    minor = 0;
    patch = 0;
  } else if (type === 'minor') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

const manifestPath = path.join(root, 'src', 'manifest.json');
const packagePath = path.join(root, 'package.json');

const manifest = readJson(manifestPath);
const currentVersion = manifest.version;
const bumpedVersion = nextVersion(currentVersion, bumpType);

manifest.version = bumpedVersion;
writeJson(manifestPath, manifest);

if (fs.existsSync(packagePath)) {
  const pkg = readJson(packagePath);
  pkg.version = bumpedVersion;
  writeJson(packagePath, pkg);
}

console.log(`Version bumped (${bumpType}): ${currentVersion} -> ${bumpedVersion}`);
