import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createBrowserMock } from '../helpers/browser-mock.js';
import { createThrottle } from '../../src/lib/throttle.js';
import { TST_AMO_URL, NOTICE_KINDS, createNotifier } from '../../src/background/notifier.js';

describe('createNotifier', () => {
  let browser;
  let log;
  let throttle;
  let notifier;
  let nowMs;

  beforeEach(() => {
    browser = createBrowserMock();
    log = { warn: vi.fn(), error: vi.fn() };
    nowMs = 0;
    throttle = createThrottle(30000, () => nowMs);
    notifier = createNotifier({ browser, throttle, log });
  });

  it('uses i18n title and message from the catalog', async () => {
    const result = await notifier.notify('tst-missing');

    expect(result).toBe(true);
    expect(browser.notifications.create).toHaveBeenCalledWith('picasso-tst-missing', {
      type: 'basic',
      iconUrl: browser.runtime.getURL('icons/icon-48.png'),
      title: browser.i18n.getMessage('noticeTitle'),
      message: browser.i18n.getMessage(NOTICE_KINDS['tst-missing'])
    });
  });

  it('[TM-071] throttles repeated notices of the same kind', async () => {
    expect(await notifier.notify('tst-denied')).toBe(true);
    nowMs = 29999;
    expect(await notifier.notify('tst-denied')).toBe(false);
    expect(browser.notifications.create).toHaveBeenCalledTimes(1);
  });

  it('allows a notice again after the throttle window', async () => {
    expect(await notifier.notify('tst-denied')).toBe(true);
    nowMs = 30000;
    expect(await notifier.notify('tst-denied')).toBe(true);
    expect(browser.notifications.create).toHaveBeenCalledTimes(2);
  });

  it('opens the AMO page when the tst-missing notice is clicked', async () => {
    await notifier.notify('tst-missing');
    await browser.notifications.onClicked.fire('picasso-tst-missing');

    expect(browser.tabs.create).toHaveBeenCalledWith({ url: TST_AMO_URL });
    expect(browser.notifications.clear).toHaveBeenCalledWith('picasso-tst-missing');
  });

  it('clears other notice ids without opening the AMO page', async () => {
    await notifier.notify('tst-denied');
    await browser.notifications.onClicked.fire('picasso-tst-denied');

    expect(browser.tabs.create).not.toHaveBeenCalled();
    expect(browser.notifications.clear).toHaveBeenCalledWith('picasso-tst-denied');
  });

  it('treats an unknown kind as unknown-error', async () => {
    const result = await notifier.notify('something-else');

    expect(result).toBe(true);
    expect(browser.notifications.create).toHaveBeenCalledWith(
      'picasso-unknown-error',
      expect.objectContaining({
        message: browser.i18n.getMessage(NOTICE_KINDS['unknown-error'])
      })
    );
  });

  it('returns false and logs when notifications.create rejects', async () => {
    browser.notifications.create.mockRejectedValueOnce(new Error('fail'));

    const result = await notifier.notify('popup-blocked');

    expect(result).toBe(false);
    expect(log.error).toHaveBeenCalled();
  });
});
