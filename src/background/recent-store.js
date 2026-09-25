import { createSerialQueue } from '../lib/queue.js';
import { isValidEmoji } from '../lib/validate.js';
import { pushRecent, sanitizeRecent } from '../lib/recent.js';

export const RECENT_KEY = 'picasso-recent-emojis-v1';

export function createRecentStore({ browser, queue = createSerialQueue() }) {
  async function read() {
    const stored = await browser.storage.local.get(RECENT_KEY);
    return sanitizeRecent(stored[RECENT_KEY]);
  }

  return {
    async list() {
      return read();
    },

    async push(emoji) {
      if (!isValidEmoji(emoji)) {
        return read();
      }

      return queue.run(async () => {
        const current = await read();
        const next = pushRecent(current, emoji);
        await browser.storage.local.set({ [RECENT_KEY]: next });
        return next;
      });
    }
  };
}
