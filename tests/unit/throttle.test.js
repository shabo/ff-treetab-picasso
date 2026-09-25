import { describe, expect, it } from 'vitest';
import { createThrottle } from '../../src/lib/throttle.js';

describe('createThrottle', () => {
  it('[TM-070] first call for a kind is allowed', () => {
    const nowMs = 0;
    const throttle = createThrottle(30000, () => nowMs);
    expect(throttle.allow('a')).toBe(true);
  });

  it('[TM-071] same kind before window elapses is blocked', () => {
    let nowMs = 0;
    const throttle = createThrottle(30000, () => nowMs);
    throttle.allow('a');
    nowMs = 29999;
    expect(throttle.allow('a')).toBe(false);
  });

  it('[TM-072] same kind at exactly windowMs is allowed', () => {
    let nowMs = 0;
    const throttle = createThrottle(30000, () => nowMs);
    throttle.allow('a');
    nowMs = 30000;
    expect(throttle.allow('a')).toBe(true);
  });

  it('[TM-073] different kinds at the same time are both allowed', () => {
    const nowMs = 0;
    const throttle = createThrottle(30000, () => nowMs);
    expect(throttle.allow('a')).toBe(true);
    expect(throttle.allow('b')).toBe(true);
  });
});
