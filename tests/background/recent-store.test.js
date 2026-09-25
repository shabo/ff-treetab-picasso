import { describe, it, expect, beforeEach } from 'vitest';
import { createBrowserMock } from '../helpers/browser-mock.js';
import { createRecentStore, RECENT_KEY } from '../../src/background/recent-store.js';

describe('recent-store', () => {
  let browser;
  let store;

  beforeEach(() => {
    browser = createBrowserMock();
    store = createRecentStore({ browser });
  });

  it('returns an empty list when storage is empty', async () => {
    const list = await store.list();
    expect(list).toEqual([]);
  });

  it('push dedupes and persists the new list', async () => {
    await store.push('🔥');
    await store.push('🚀');
    await store.push('🔥');

    const list = await store.list();
    expect(list).toEqual(['🔥', '🚀']);
    expect(browser.storage.local.set).toHaveBeenLastCalledWith({
      [RECENT_KEY]: ['🔥', '🚀']
    });
  });

  it('push invalid emoji leaves the list unchanged and does not write', async () => {
    await store.push('🔥');
    await store.push('');

    const list = await store.list();
    expect(list).toEqual(['🔥']);
    expect(browser.storage.local.set).toHaveBeenCalledTimes(1);
  });
});
