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

// Replace only the top-level "version" value so the file keeps its formatting.
function setVersion(filePath, version) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const pattern = /^(\s*"version":\s*")[^"]*(")/m;
  if (!pattern.test(raw)) throw new Error(`No "version" field in ${filePath}`);
  fs.writeFileSync(filePath, raw.replace(pattern, `$1${version}$2`), 'utf8');
}

const manifestPath = path.join(root, 'src', 'manifest.json');
const packagePath = path.join(root, 'package.json');
const lockPath = path.join(root, 'package-lock.json');

const currentVersion = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).version;
const bumpedVersion = nextVersion(currentVersion, bumpType);

setVersion(manifestPath, bumpedVersion);
if (fs.existsSync(packagePath)) setVersion(packagePath, bumpedVersion);

// package-lock.json repeats the version at the root and under packages[""].
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  lock.version = bumpedVersion;
  if (lock.packages?.['']) lock.packages[''].version = bumpedVersion;
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`, 'utf8');
}

console.log(`Version bumped (${bumpType}): ${currentVersion} -> ${bumpedVersion}`);
