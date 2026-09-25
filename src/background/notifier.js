import { createThrottle } from '../lib/throttle.js';

export const TST_AMO_URL = 'https://addons.mozilla.org/firefox/addon/tree-style-tab/';

export const NOTICE_KINDS = {
  'tst-missing': 'noticeTstMissing',
  'tst-denied': 'noticeTstDenied',
  'popup-blocked': 'noticePopupBlocked',
  'unknown-error': 'noticeUnknownError'
};

export function createNotifier({ browser, throttle = createThrottle(30000), log = console }) {
  browser.notifications.onClicked.addListener((id) => {
    if (id === 'picasso-tst-missing') {
      browser.tabs.create({ url: TST_AMO_URL }).catch((error) => {
        log.error('Failed to open TST AMO page', { error });
      });
    }
    browser.notifications.clear(id).catch((error) => {
      log.error('Failed to clear notification', { id, error });
    });
  });

  return {
    async notify(kind) {
      const normalized = NOTICE_KINDS[kind] ? kind : 'unknown-error';
      if (!throttle.allow(normalized)) return false;
      const id = `picasso-${normalized}`;
      const messageKey = NOTICE_KINDS[normalized];
      try {
        await browser.notifications.create(id, {
          type: 'basic',
          iconUrl: browser.runtime.getURL('icons/icon-48.png'),
          title: browser.i18n.getMessage('noticeTitle'),
          message: browser.i18n.getMessage(messageKey)
        });
        return true;
      } catch (error) {
        log.error('Failed to create notification', { kind: normalized, error });
        return false;
      }
    }
  };
}
