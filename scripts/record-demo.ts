#!/usr/bin/env tsx
/**
 * Browsing-only portfolio capture. Authenticate separately with Playwright CLI,
 * save a private storage state, then run:
 * DEMO_STORAGE_STATE=/tmp/nodal-presenter.json pnpm exec tsx scripts/record-demo.ts [outDir]
 * Optional: DEMO_BASE_URL, DEMO_TASK_TITLE, DEMO_START_DARK=true.
 * No credentials, login footage, submitted task edits or downloads. Opening a notification may mark it read.
 * Output: native 2880×1800 JPEG frames and timestamped timeline.json for FFmpeg;
 * source targets a brisk ~60 seconds, with actual load latency recorded honestly in marks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Locator, type Page } from '@playwright/test';

const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:3000';
const STORAGE = process.env.DEMO_STORAGE_STATE;
const START_DARK = process.env.DEMO_START_DARK === 'true';
const TASK = process.env.DEMO_TASK_TITLE ?? 'Customer portal v2 launch';
const OUT = path.resolve(process.argv[2] ?? 'demo-recording');
const SIZE = { width: 2880, height: 1800 };
const LAYOUT = { width: 1440, height: 900 };

if (!STORAGE || !fs.existsSync(STORAGE)) {
  throw new Error(
    'DEMO_STORAGE_STATE must point to an existing private authenticated storage-state file.'
  );
}

/** Draws a cursor that follows mouse events (headless browsers have none). */
const CURSOR_SCRIPT = `
(() => {
  if (window.__demoCursor) return;
  window.__demoCursor = true;
  const install = () => {
    const c = document.createElement('div');
    c.id = '__demo_cursor';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 11.2-6.6.9 3.9 7.6-2.9 1.4-3.8-7.7L4 20z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, {
      position: 'fixed', left: '0', top: '0', width: '22px', height: '22px',
      pointerEvents: 'none', zIndex: '2147483647', transform: 'translate(-100px,-100px)',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.35))'
    });
    document.documentElement.appendChild(c);
    const pos = window.__demoCursorPos || { x: -100, y: -100 };
    c.style.transform = 'translate(' + (pos.x - 3) + 'px,' + (pos.y - 2) + 'px)';
    document.addEventListener('mousemove', (e) => {
      window.__demoCursorPos = { x: e.clientX, y: e.clientY };
      c.style.transform = 'translate(' + (e.clientX - 3) + 'px,' + (e.clientY - 2) + 'px)';
    }, true);
    document.addEventListener('mousedown', (e) => {
      const r = document.createElement('div');
      Object.assign(r.style, {
        position: 'fixed', left: (e.clientX - 14) + 'px', top: (e.clientY - 14) + 'px',
        width: '28px', height: '28px', borderRadius: '50%', pointerEvents: 'none',
        background: 'rgba(59,130,246,.35)', zIndex: '2147483646',
        transition: 'transform .45s ease-out, opacity .45s ease-out'
      });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.9)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 500);
    }, true);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
})();
`;

let cursor = { x: LAYOUT.width / 2, y: LAYOUT.height / 2 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function glide(page: Page, x: number, y: number, ms?: number) {
  const dist = Math.hypot(x - cursor.x, y - cursor.y);
  const duration = ms ?? Math.min(260, Math.max(140, dist * 0.13));
  const steps = Math.max(12, Math.round(duration / 16));
  const from = { ...cursor };
  for (let i = 1; i <= steps; i++) {
    const t = ease(i / steps);
    await page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
    await sleep(duration / steps);
  }
  cursor = { x, y };
}

async function moveTo(page: Page, target: Locator, opts: { dx?: number; dy?: number } = {}) {
  await target.waitFor({ state: 'visible', timeout: 20000 });
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error('Target has no bounding box');
  const x = box.x + (opts.dx ?? box.width / 2);
  const y = box.y + (opts.dy ?? box.height / 2);
  await glide(page, x, y);
}

async function click(page: Page, target: Locator, pauseBefore = 35) {
  await moveTo(page, target);
  await sleep(pauseBefore);
  await page.mouse.down();
  await sleep(35);
  await page.mouse.up();
}

/** Smooth wheel scroll by `total` pixels. */
async function scroll(page: Page, total: number, ms = 1200) {
  const steps = Math.round(ms / 16);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, total / steps);
    await sleep(16);
  }
}

async function settle(page: Page, extra = 200) {
  await page.waitForLoadState('domcontentloaded');
  await sleep(extra);
  await page.mouse.move(cursor.x, cursor.y);
}

async function loadedReport(page: Page, label: string) {
  const report = page.getByRole('region', { name: label });
  // Named sections are regions; wait for actual report content, not networkidle
  // (the app keeps a realtime notification connection open).
  await report.waitFor({ state: 'visible', timeout: 30000 });
  if (label === 'Logged time overview') {
    await page.locator('section[aria-label="Logged time overview"][aria-busy="false"]').waitFor();
  }
  await page.getByRole('button', { name: /Export PDF/ }).waitFor();
  await settle(page);
}

async function theme(page: Page, value: 'Light' | 'Dark') {
  await click(page, page.getByRole('button', { name: 'Toggle theme' }));
  await click(page, page.getByRole('menuitem', { name: value, exact: true }));
  await page.waitForFunction(
    (dark) => document.documentElement.classList.contains('dark') === dark,
    value === 'Dark'
  );
}

async function main() {
  fs.mkdirSync(path.join(OUT, 'frames'), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: LAYOUT,
    deviceScaleFactor: 2,
    timezoneId: 'Asia/Singapore',
    storageState: STORAGE!,
    reducedMotion: 'no-preference',
  });
  context.setDefaultTimeout(12000);
  // Render the 1440×900 composition at native Retina pixel density.
  await context.addInitScript(() => {
    const install = () => {
      const style = document.createElement('style');
      style.textContent = 'nextjs-portal{display:none!important}';
      document.head.appendChild(style);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
    else install();
  });
  await context.addInitScript(CURSOR_SCRIPT);
  let unexpectedMutation = '';
  await context.route('**/api/**', async (route) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) {
      unexpectedMutation = `${route.request().method()} ${new URL(route.request().url()).pathname}`;
      await route.abort();
    } else await route.continue();
  });
  const page = await context.newPage();
  page.on('download', () => {
    unexpectedMutation = 'Unexpected download';
  });
  const marks: Record<string, number> = {};
  let t0 = 0;
  const mark = (name: string) => {
    marks[name] = (Date.now() - t0) / 1000;
    console.log(name, marks[name].toFixed(2));
  };
  const frames: { file: string; time: number }[] = [];
  const cdp = await context.newCDPSession(page);
  let capturing = false;
  cdp.on('Page.screencastFrame', (event) => {
    void cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {});
    if (!capturing) return;
    const time = (event.metadata.timestamp ?? Date.now() / 1000) - t0 / 1000;
    if (frames.length && time - frames[frames.length - 1].time < 1 / 32) return;
    const file = `frames/${String(frames.length).padStart(6, '0')}.jpg`;
    fs.writeFileSync(path.join(OUT, file), Buffer.from(event.data, 'base64'));
    frames.push({ file, time });
  });
  const pause = (ms = 550) => sleep(ms);
  const combo = (text: string) => page.getByRole('combobox').filter({ hasText: text });
  const escape = () => page.keyboard.press('Escape');
  const choose = async (trigger: Locator, option: Locator) => {
    await click(page, trigger);
    await pause(160);
    await click(page, option);
    await pause(160);
    await escape();
  };
  try {
    // Warm routes outside the take; the final recording retains all actual interaction/load timing.
    await page.goto(`${BASE}/report`);
    await loadedReport(page, 'Logged time overview');
    await theme(page, START_DARK ? 'Dark' : 'Light');
    await page.goto(`${BASE}/schedule`);
    await page.getByRole('region', { name: 'Staff task timeline' }).waitFor();
    await page.goto(`${BASE}/tasks`);
    await page.getByRole('textbox', { name: 'Search tasks' }).waitFor();
    await page.getByRole('button', { name: 'Account menu' }).waitFor();
    await page.evaluate(() => localStorage.setItem('tasks-calendar-view', 'month'));
    await pause(700);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: LAYOUT.width,
      height: LAYOUT.height,
      deviceScaleFactor: 2,
      mobile: false,
      screenWidth: SIZE.width,
      screenHeight: SIZE.height,
      viewport: { x: 0, y: 0, width: LAYOUT.width, height: LAYOUT.height, scale: 1 },
    });
    if (await page.evaluate(() => devicePixelRatio !== 2 || innerWidth !== 1440))
      throw new Error('Retina viewport was not applied');
    t0 = Date.now();
    capturing = true;
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 100,
      maxWidth: SIZE.width,
      maxHeight: SIZE.height,
      everyNthFrame: 1,
    });
    mark('start');
    await pause(750);

    mark('tasksSearchAndPresets');
    const search = page.getByRole('textbox', { name: 'Search tasks' });
    await click(page, search);
    await search.pressSequentially('Portal', { delay: 85 });
    await pause(650);
    await click(page, page.getByRole('button', { name: 'Blocked', exact: true }));
    await pause(650);
    await click(page, page.getByRole('button', { name: 'Due this week', exact: true }));
    await pause(650);
    await click(page, page.getByRole('button', { name: 'Clear', exact: true }));
    await pause(450);

    mark('tasksAdvancedFilters');
    await click(page, page.getByRole('button', { name: 'Filters', exact: true }));
    await choose(
      combo('All statuses'),
      page.getByRole('listbox').getByText('To Do', { exact: true })
    );
    await click(page, combo('All projects'));
    await pause(180);
    const firstProject = page.getByRole('listbox').locator('span.flex-1').first();
    const projectName = await firstProject.innerText();
    await click(page, firstProject);
    await pause(220);
    await escape();
    await click(page, combo('All tags'));
    await pause(180);
    await click(page, page.getByRole('listbox').locator('span.flex-1').first());
    await pause(220);
    await escape();
    await pause(450);
    await click(page, page.getByRole('button', { name: 'Clear', exact: true }));
    await click(page, page.getByRole('button', { name: 'Filters', exact: true }));

    mark('taskColumns');
    await click(page, combo('Columns'));
    for (const name of ['Recurring', 'Subtasks']) {
      const checkbox = page.getByRole('checkbox', { name, exact: true });
      if ((await checkbox.getAttribute('aria-checked')) !== 'true') await click(page, checkbox);
      await pause(300);
    }
    await escape();
    await pause(600);

    mark('taskInspector');
    await click(page, search);
    await search.pressSequentially('Customer portal', { delay: 35 });
    await pause(220);
    await click(page, page.getByRole('link', { name: TASK, exact: true }).first());
    const inspector = page.getByRole('dialog', { name: 'Task details', exact: true });
    await inspector.waitFor();
    await pause(600);
    await moveTo(page, inspector.getByText('Discussion', { exact: true }));
    await scroll(page, 420, 420);
    await pause(650);
    await click(page, inspector.getByRole('button', { name: 'Close', exact: true }));

    await search.fill('');
    mark('creation');
    await click(page, page.getByRole('button', { name: 'Create Task', exact: true }));
    const creation = page.getByRole('dialog', { name: 'Create task', exact: true });
    await click(page, creation.locator('summary').filter({ hasText: 'More options' }));
    await pause(650);
    await escape();

    mark('taskCalendar');
    await click(page, page.getByRole('button', { name: 'Switch to calendar view' }));
    await page.getByRole('region', { name: 'Month calendar', exact: true }).waitFor();
    await pause(700);
    const populatedDays = page.locator(
      'section[aria-label="Month calendar"] button[aria-label*=" tasks"]:not([aria-label$=", 0 tasks"])'
    );
    await click(page, populatedDays.first());
    await page.getByRole('region', { name: 'Day calendar', exact: true }).waitFor();
    await pause(650);
    await click(page, page.getByRole('button', { name: 'Week view', exact: true }));
    await pause(650);

    mark('schedule');
    await click(page, page.getByRole('link', { name: 'Schedule', exact: true }));
    await page.getByRole('region', { name: 'Staff task timeline' }).waitFor();
    if (START_DARK) {
      mark('scheduleThemeSwitch');
      await theme(page, 'Light');
      await pause(500);
    }
    await click(page, page.getByRole('button', { name: /^\d{2}\/\d{2}\/\d{4}/ }));
    await pause(250);
    await click(page, page.getByRole('button', { name: 'Next 7 Days', exact: true }));
    await click(page, page.getByRole('heading', { name: 'Schedule', exact: true }));
    await pause(800);
    await click(page, combo('Select staff to filter'));
    await pause(250);
    const staff = page.getByRole('listbox').getByText('Daniel Tan', { exact: true });
    const staffName = await staff.innerText();
    await click(page, staff);
    await escape();
    await pause(800);
    const inspect = page.getByRole('button', { name: /^Inspect / }).first();
    if (await inspect.isVisible()) {
      await click(page, inspect);
      await pause(650);
      await click(
        page,
        page
          .getByRole('dialog', { name: 'Task details' })
          .getByRole('button', { name: 'Close', exact: true })
      );
    }
    console.log('Chosen scope:', projectName, staffName);

    mark('reportsLight');
    await click(page, page.getByRole('link', { name: 'Reports', exact: true }));
    await loadedReport(page, 'Logged time overview');
    await pause(800);
    await moveTo(page, page.getByRole('button', { name: /Export PDF/ }));
    await pause(650);
    await moveTo(page, page.getByRole('button', { name: /Export Excel/ }));
    await pause(650);
    if (!START_DARK) {
      mark('reportsThemeSwitch');
      await theme(page, 'Dark');
      await pause(750);
    }
    await click(page, page.getByRole('tab', { name: 'Task Completions', exact: true }));
    await loadedReport(page, 'Task completions report');
    await pause(950);
    await click(page, page.getByRole('tab', { name: 'Team Summary', exact: true }));
    await loadedReport(page, 'Team summary report');
    await pause(950);

    mark('notifications');
    await click(page, page.getByRole('button', { name: 'Notifications', exact: true }).first());
    const inbox = page.getByRole('dialog', { name: 'Notifications', exact: true });
    await inbox
      .getByRole('button', { name: /^(Unread|Read):/ })
      .first()
      .waitFor();
    await pause(550);
    await click(page, inbox.getByRole('button', { name: /^(Unread|Read):/ }).first());
    await pause(900);
    await click(page, page.getByRole('button', { name: 'Done', exact: true }));
    await pause(200);
    await click(page, inbox.getByRole('button', { name: 'Close', exact: true }));

    mark('closing');
    await click(page, page.getByRole('tab', { name: 'Logged Time', exact: true }));
    await loadedReport(page, 'Logged time overview');
    await pause(750);
    await theme(page, 'Light');
    await glide(page, 1190, 785);
    await pause(900);
    mark('end');
    if (unexpectedMutation) throw new Error(`Capture rejected: ${unexpectedMutation}`);
  } finally {
    capturing = false;
    await cdp.send('Page.stopScreencast').catch(() => {});
    const result = {
      viewport: SIZE,
      layout: { width: 1440, height: 900 },
      capture: 'native deviceScaleFactor 2, JPEG quality 100 screencast',
      marks,
      frames,
      unexpectedMutation: unexpectedMutation || null,
    };
    fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(result, null, 2));
    console.log('Frames', frames.length, 'Duration', marks.end ?? 'incomplete');
    await context.close();
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Capture failed');
  process.exitCode = 1;
});
