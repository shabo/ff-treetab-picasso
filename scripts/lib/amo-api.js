// Small AMO API v5 client for the "AMO Admin" workflow. Pure helpers are exported for tests.
import { createHmac, randomUUID } from 'node:crypto';

export const AMO_BASE = 'https://addons.mozilla.org/api/v5';
const ACTIONS = new Set(['status', 'disable-version']);
const VERSION_RE = /^\d+\.\d+\.\d+(?:\.\d+)?$/;

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** HS256 JWT as AMO expects: iss = API key, 60 s lifetime. */
export function createAmoJwt(iss, secret, { now = Date.now(), jti = randomUUID() } = {}) {
  if (!iss || !secret) throw new Error('AMO API credentials are missing');
  const iat = Math.floor(now / 1000);
  const head = b64url({ alg: 'HS256', typ: 'JWT' });
  const body = b64url({ iss, jti, iat, exp: iat + 60 });
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

export function parseArgs(argv) {
  const [action, version] = argv;
  if (!ACTIONS.has(action)) throw new Error(`Unknown action "${action ?? ''}"`);
  if (action === 'status') return { action, version: null };
  if (!VERSION_RE.test(version ?? '')) throw new Error(`Invalid version "${version ?? ''}"`);
  return { action, version };
}

export function summarizeVersions(list) {
  return (list ?? []).map((v) => {
    const parts = [v.version, v.channel, v.file?.status ?? 'unknown', `id ${v.id}`];
    if (v.is_disabled) parts.push('disabled by developer');
    return parts.join(' | ');
  });
}

export function createAmoClient({ issuer, secret, fetchImpl = fetch }) {
  async function request(path, { method = 'GET', body } = {}) {
    const res = await fetchImpl(`${AMO_BASE}${path}`, {
      method,
      headers: {
        Authorization: `JWT ${createAmoJwt(issuer, secret)}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path} → HTTP ${res.status}: ${text.slice(0, 500)}`);
    return text ? JSON.parse(text) : null;
  }

  async function listVersions(addon) {
    const all = [];
    let path = `/addons/addon/${addon}/versions/?filter=all_with_unlisted&page_size=50`;
    while (path) {
      const page = await request(path);
      all.push(...page.results);
      path = page.next ? page.next.slice(page.next.indexOf('/addons/')) : null;
    }
    return all;
  }

  return {
    getAddon: (addon) => request(`/addons/addon/${addon}/`),
    listVersions,
    disableVersion: (addon, id) =>
      request(`/addons/addon/${addon}/versions/${id}/`, {
        method: 'PATCH',
        body: { is_disabled: true }
      })
  };
}
