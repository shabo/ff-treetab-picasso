import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createAmoJwt, parseArgs, summarizeVersions } from '../../scripts/lib/amo-api.js';

const b64urlJson = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

describe('createAmoJwt', () => {
  it('[TM-150] builds an HS256 JWT with iss, jti, iat, exp (60 s)', () => {
    const token = createAmoJwt('user:1:2', 'secret', { now: 1_000_000, jti: 'abc' });
    const [h, p, sig] = token.split('.');
    expect(b64urlJson(h)).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(b64urlJson(p)).toEqual({ iss: 'user:1:2', jti: 'abc', iat: 1000, exp: 1060 });
    const expected = createHmac('sha256', 'secret').update(`${h}.${p}`).digest('base64url');
    expect(sig).toBe(expected);
  });

  it('[TM-151] uses a new random jti per token', () => {
    const a = createAmoJwt('i', 's');
    const b = createAmoJwt('i', 's');
    expect(b64urlJson(a.split('.')[1]).jti).not.toBe(b64urlJson(b.split('.')[1]).jti);
  });

  it.each([
    ['', 's'],
    ['i', ''],
    [undefined, 's']
  ])('[TM-152] rejects missing credentials (%j, %j)', (iss, secret) => {
    expect(() => createAmoJwt(iss, secret)).toThrow(/credentials/);
  });
});

describe('parseArgs', () => {
  it('[TM-153] status needs no version', () => {
    expect(parseArgs(['status'])).toEqual({ action: 'status', version: null });
  });
  it('[TM-154] disable-version needs x.y.z(.w)', () => {
    expect(parseArgs(['disable-version', '0.2.0'])).toEqual({
      action: 'disable-version',
      version: '0.2.0'
    });
    expect(() => parseArgs(['disable-version'])).toThrow(/version/);
    expect(() => parseArgs(['disable-version', '0.2'])).toThrow(/version/);
    expect(() => parseArgs(['disable-version', '0.2.0; rm'])).toThrow(/version/);
  });
  it('[TM-155] unknown action is rejected', () => {
    expect(() => parseArgs(['delete'])).toThrow(/action/);
    expect(() => parseArgs([])).toThrow(/action/);
  });
});

describe('summarizeVersions', () => {
  it('[TM-156] one line per version with channel, review status, disabled flag', () => {
    const lines = summarizeVersions([
      {
        id: 1,
        version: '0.2.1',
        channel: 'listed',
        is_disabled: false,
        file: { status: 'unreviewed' }
      },
      {
        id: 2,
        version: '0.2.0.2',
        channel: 'unlisted',
        is_disabled: false,
        file: { status: 'public' }
      },
      {
        id: 3,
        version: '0.2.0',
        channel: 'listed',
        is_disabled: true,
        file: { status: 'disabled' }
      }
    ]);
    expect(lines).toEqual([
      '0.2.1 | listed | unreviewed | id 1',
      '0.2.0.2 | unlisted | public | id 2',
      '0.2.0 | listed | disabled | id 3 | disabled by developer'
    ]);
  });
  it('[TM-157] tolerates missing file info and empty input', () => {
    expect(summarizeVersions([{ id: 9, version: '1.0.0', channel: 'listed' }])).toEqual([
      '1.0.0 | listed | unknown | id 9'
    ]);
    expect(summarizeVersions(undefined)).toEqual([]);
  });
});
