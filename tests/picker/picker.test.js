// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createBrowserMock } from '../helpers/browser-mock.js';

const htmlPath = new URL('../../src/picker/picker.html', import.meta.url);

function loadBody() {
  const html = readFileSync(htmlPath, 'utf8');
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = match ? match[1] : html;
  document.body.innerHTML = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
}

describe('picker UI', () => {
  let browser;
  let win;

  beforeEach(() => {
    loadBody();
    globalThis.__PICASSO_TEST__ = true;
    browser = createBrowserMock();
    win = { location: { search: '?tabId=5' }, close: vi.fn() };
    browser.runtime.sendMessage.mockResolvedValue({ ok: true });
  });

  async function start() {
    const { start } = await import('../../src/picker/picker.js');
    await start({ browser, doc: document, win });
  }

  it('[TM-130] renders grid with roles and labels', async () => {
    await start();
    const grid = document.getElementById('grid');
    expect(grid.getAttribute('role')).toBe('grid');
    const cells = grid.querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBeGreaterThan(0);
    expect(cells[0].getAttribute('aria-label')).toBeTruthy();
    expect(cells[0].textContent).toBeTruthy();
  });

  it('[TM-131] ArrowRight moves focus and updates roving tabindex', async () => {
    await start();
    const grid = document.getElementById('grid');
    const cells = grid.querySelectorAll('[role="gridcell"]');
    cells[0].focus();
    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(cells[1]);
    expect(cells[0].getAttribute('tabindex')).toBe('-1');
    expect(cells[1].getAttribute('tabindex')).toBe('0');
  });

  it('[TM-132] Enter on cell sends set-emoji and closes window', async () => {
    await start();
    const grid = document.getElementById('grid');
    const cells = grid.querySelectorAll('[role="gridcell"]');
    const emoji = cells[0].textContent;
    cells[0].focus();
    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalled());
    expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
      type: 'picasso:set-emoji',
      tabId: 5,
      emoji
    });
    expect(win.close).toHaveBeenCalled();
  });

  it('[TM-133] Escape anywhere closes window and sends no message', async () => {
    await start();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(win.close).toHaveBeenCalled();
    expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
  });

  it('[TM-134] search filters and updates meta; empty shows message', async () => {
    await start();
    const allTab = [...document.querySelectorAll('[role="tab"]')].find(
      (t) => t.textContent === 'All'
    );
    allTab.click();
    const input = document.getElementById('q');
    input.value = 'fire';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const meta = document.getElementById('meta');
    await vi.waitFor(() => expect(meta.textContent).not.toBe(''));
    const cells = document.getElementById('grid').querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBeGreaterThan(0);

    input.value = 'xyzxyzxyz';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => expect(meta.textContent).toBe('No emoji match your search.'));
  });

  it('[TM-135] recent list is first group and selected by default', async () => {
    browser.__test.seedStorage({ 'picasso-recent-emojis-v1': ['🔥', '😀'] });
    await start();
    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs[0].textContent).toBe('Recent');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
  });

  it('[TM-136] missing tabId shows error and disables controls', async () => {
    win.location.search = '';
    await start();
    const error = document.getElementById('error');
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe(
      'This picker was opened without a tab. Close it and use the tab menu again.'
    );
    expect(document.getElementById('q').disabled).toBe(true);
    expect(document.getElementById('clear').disabled).toBe(true);
  });

  it('[TM-137] background reply ok:false shows error and keeps window open', async () => {
    browser.runtime.sendMessage.mockResolvedValue({ ok: false, error: 'tab-gone' });
    await start();
    const grid = document.getElementById('grid');
    const cells = grid.querySelectorAll('[role="gridcell"]');
    cells[0].focus();
    cells[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await vi.waitFor(() => expect(browser.runtime.sendMessage).toHaveBeenCalled());
    const error = document.getElementById('error');
    expect(error.hidden).toBe(false);
    expect(error.textContent).toBe('Could not save the emoji. The tab may be closed.');
    expect(win.close).not.toHaveBeenCalled();
  });
});
