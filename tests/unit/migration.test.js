import { describe, expect, it } from 'vitest';
import {
  LEGACY_EMOJI_KEY,
  MIGRATION_FLAG_KEY,
  planLegacyMigration
} from '../../src/lib/migration.js';

describe('constants', () => {
  it('[TM-080] exposes the legacy storage key and migration flag key', () => {
    expect(LEGACY_EMOJI_KEY).toBe('tabs-color-tab-emoji-v1');
    expect(MIGRATION_FLAG_KEY).toBe('picasso-migrated-v1');
  });
});

describe('planLegacyMigration', () => {
  it('[TM-080] migrates open tabs with valid emoji', () => {
    expect(planLegacyMigration({ 3: '🔥' }, [3])).toEqual([{ tabId: 3, emoji: '🔥' }]);
  });

  it('[TM-081] drops stale entries for closed tabs', () => {
    expect(planLegacyMigration({ 3: '🔥' }, [4])).toEqual([]);
  });

  it.each([null, 'str', []])('[TM-082] returns empty array for non-object raw %j', (raw) => {
    expect(planLegacyMigration(raw, [1, 2, 3])).toEqual([]);
  });

  it('[TM-083] skips invalid keys and values', () => {
    const raw = {
      '-1': '🔥',
      abc: '🔥',
      1.5: '🔥',
      1: '',
      2: 'a'.repeat(65),
      3: 5,
      4: '✅'
    };
    expect(planLegacyMigration(raw, [1, 2, 3, 4])).toEqual([{ tabId: 4, emoji: '✅' }]);
  });

  it('accepts openTabIds as a Set', () => {
    expect(planLegacyMigration({ 5: '🌟', 7: '🚀' }, new Set([5, 7]))).toEqual([
      { tabId: 5, emoji: '🌟' },
      { tabId: 7, emoji: '🚀' }
    ]);
  });
});
