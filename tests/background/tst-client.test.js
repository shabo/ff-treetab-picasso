import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createBrowserMock } from '../helpers/browser-mock.js';
import { TST_ID, classifyError, createTstClient } from '../../src/background/tst-client.js';

describe('classifyError', () => {
  it('classifies "Could not establish connection" as tst-missing', () => {
    expect(classifyError(new Error('Could not establish connection.'))).toBe('tst-missing');
  });

  it('classifies "Receiving end does not exist" as tst-missing', () => {
    expect(classifyError(new Error('Receiving end does not exist.'))).toBe('tst-missing');
  });

  it('classifies string errors containing the missing marker', () => {
    expect(classifyError('Could not establish connection. Receiving end does not exist.')).toBe(
      'tst-missing'
    );
  });

  it('classifies any other error as tst-denied', () => {
    expect(classifyError(new Error('denied'))).toBe('tst-denied');
    expect(classifyError(null)).toBe('tst-denied');
    expect(classifyError(undefined)).toBe('tst-denied');
  });
});

describe('createTstClient', () => {
  let browser;
  let log;
  let client;

  beforeEach(() => {
    browser = createBrowserMock();
    log = { warn: vi.fn(), error: vi.fn() };
    client = createTstClient({ browser, log });
  });

  it('[TM-100] register sends register-self with style and listening types', async () => {
    browser.runtime.sendMessage.mockResolvedValueOnce({ registered: true });
    const style = 'body {}';

    const result = await client.register(style);

    expect(result).toEqual({ ok: true, value: { registered: true } });
    expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith(TST_ID, {
      type: 'register-self',
      name: browser.i18n.getMessage('extName'),
      icons: browser.runtime.getManifest().icons,
      listeningTypes: ['ready', 'permissions-changed'],
      style
    });
    const [, message] = browser.runtime.sendMessage.mock.calls[0];
    expect(message).not.toHaveProperty('permissions');
  });

  it('[TM-101] TST absent returns tst-missing', async () => {
    browser.runtime.sendMessage.mockRejectedValueOnce(
      new Error('Could not establish connection. Receiving end does not exist.')
    );

    const result = await client.register('body {}');

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('tst-missing');
    expect(log.warn).toHaveBeenCalled();
  });

  it('[TM-102] getSubtree non-object or other rejection returns tst-denied', async () => {
    browser.runtime.sendMessage.mockResolvedValueOnce(null);
    let result = await client.getSubtree(1);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('tst-denied');

    browser.runtime.sendMessage.mockReset();
    browser.runtime.sendMessage.mockRejectedValueOnce(new Error('denied'));
    result = await client.getSubtree(1);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('tst-denied');
    expect(log.warn).toHaveBeenCalled();
  });

  it('[TM-103] setColor removes all color states then adds the selected state', async () => {
    browser.runtime.sendMessage.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);

    const result = await client.setColor([1, 2], 3);

    expect(result).toEqual({ ok: true, value: null });
    expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(2);
    expect(browser.runtime.sendMessage).toHaveBeenNthCalledWith(1, TST_ID, {
      type: 'remove-tab-state',
      tabs: [1, 2],
      state: expect.arrayContaining(['tabs-color-color-00', 'tabs-color-shade-19'])
    });
    expect(browser.runtime.sendMessage).toHaveBeenNthCalledWith(2, TST_ID, {
      type: 'add-tab-state',
      tabs: [1, 2],
      state: 'tabs-color-color-03'
    });
  });

  it('[TM-104] setColor with null index only removes states', async () => {
    browser.runtime.sendMessage.mockResolvedValueOnce(undefined);

    const result = await client.setColor([5], null);

    expect(result).toEqual({ ok: true, value: null });
    expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(1);
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith(TST_ID, {
      type: 'remove-tab-state',
      tabs: [5],
      state: expect.arrayContaining(['tabs-color-color-19', 'tabs-color-shade-00'])
    });
  });

  it('[TM-105] setColor with empty tabIds sends no messages', async () => {
    const result = await client.setColor([], 3);

    expect(result).toEqual({ ok: true, value: null });
    expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('getSubtree flattens the returned tree', async () => {
    const tree = {
      id: 10,
      children: [{ id: 11, children: [{ id: 12 }] }, { id: 13 }]
    };
    browser.runtime.sendMessage.mockResolvedValueOnce(tree);

    const result = await client.getSubtree(10);

    expect(result).toEqual({ ok: true, value: [10, 11, 12, 13] });
  });

  it('applyColors sends one add-tab-state per color and skips empty lists', async () => {
    browser.runtime.sendMessage.mockResolvedValue(undefined);
    const byColor = new Map([
      [0, [1, 2]],
      [1, []],
      [3, [5]]
    ]);

    const result = await client.applyColors(byColor);

    expect(result).toEqual({ ok: true, value: null });
    expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(2);
    expect(browser.runtime.sendMessage).toHaveBeenNthCalledWith(1, TST_ID, {
      type: 'add-tab-state',
      tabs: [1, 2],
      state: 'tabs-color-color-00'
    });
    expect(browser.runtime.sendMessage).toHaveBeenNthCalledWith(2, TST_ID, {
      type: 'add-tab-state',
      tabs: [5],
      state: 'tabs-color-color-03'
    });
  });

  it('applyColors returns the first failure', async () => {
    browser.runtime.sendMessage
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(
        new Error('Could not establish connection. Receiving end does not exist.')
      );
    const byColor = new Map([
      [0, [1]],
      [1, [2]]
    ]);

    const result = await client.applyColors(byColor);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('tst-missing');
    expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(2);
  });
});
