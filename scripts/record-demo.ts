#!/usr/bin/env tsx
/**
 * Browsing-only portfolio capture. Authenticate separately with Playwright CLI,
 * save a private storage state, then run:
 * DEMO_STORAGE_STATE=/tmp/nodal-presenter.json pnpm exec tsx scripts/record-demo.ts [outDir]
 * Optional: DEMO_BASE_URL, DEMO_TASK_TITLE, DEMO_PROJECT, DEMO_CALENDAR_MONTH (YYYY-MM).
 * No credentials, login footage, submitted forms, downloads or notification mutations.
 * Output: raw/*.webm and timeline.json. Trim marks.start..marks.end with FFmpeg;
 * source targets ~60 seconds, with actual load latency recorded honestly in marks.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Locator, type Page } from '@playwright/test';

const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:3000';
const STORAGE = process.env.DEMO_STORAGE_STATE;
const TASK = process.env.DEMO_TASK_TITLE ?? 'Customer portal v2 launch';
const PROJECT = process.env.DEMO_PROJECT ?? 'Customer Portal Revamp';
const OUT = path.resolve(process.argv[2] ?? 'demo-recording');
const SIZE = { width: 1440, height: 900 };

if (!STORAGE || !fs.existsSync(STORAGE)) {
  throw new Error('DEMO_STORAGE_STATE must point to an existing private authenticated storage-state file.');
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

let cursor = { x: SIZE.width / 2, y: SIZE.height / 2 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

async function glide(page: Page, x: number, y: number, ms?: number) {
  const dist = Math.hypot(x - cursor.x, y - cursor.y);
  const duration = ms ?? Math.min(450, Math.max(180, dist * 0.5));
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

async function click(page: Page, target: Locator, pauseBefore = 80) {
  await moveTo(page, target);
  await sleep(pauseBefore);
  await page.mouse.down();
  await sleep(70);
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
  await page.waitForFunction((dark) => document.documentElement.classList.contains('dark') === dark, value === 'Dark');
}

async function main() {
  fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
  const browser = await chromium.launch();
  const options = { viewport: SIZE, deviceScaleFactor: 1, timezoneId: 'Asia/Singapore', storageState: STORAGE! };
  // Validate auth and normalize preferences in an UNRECORDED context first.
  const preflight = await browser.newContext(options);
  const check = await preflight.newPage();
  await check.goto(`${BASE}/report`);
  await check.waitForURL(/\/report(?:[?#].*)?$/, { timeout: 30000 });
  await loadedReport(check, 'Logged time overview');
  await theme(check, 'Light');
  await check.evaluate(() => localStorage.setItem('tasks-calendar-view', 'month'));
  const authenticatedState = await preflight.storageState();
  await preflight.close();

  const context = await browser.newContext({
    ...options,
    storageState: authenticatedState,
    recordVideo: { dir: path.join(OUT, 'raw'), size: SIZE },
  });
  let unexpectedMutation = '';
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
      unexpectedMutation = `${request.method()} ${new URL(request.url()).pathname}`;
      await route.abort();
    } else await route.continue();
  });
  await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();
  page.on('download', () => { unexpectedMutation = 'Unexpected download'; });
  const t0 = Date.now();
  const marks: Record<string, number> = {};
  const mark = (name: string) => { marks[name] = (Date.now() - t0) / 1000; };
  let sceneStart = 0;
  const scene = (name: string) => { mark(name); sceneStart = Date.now(); };
  const dwell = async (seconds: number) => { await sleep(Math.max(0, seconds * 1000 - (Date.now() - sceneStart))); };

  try {
    await page.goto(`${BASE}/report`);
    await loadedReport(page, 'Logged time overview');
    await glide(page, 1190, 785, 200);
    mark('start');
    scene('reportsLight');
    await sleep(1300);
    await click(page, page.getByRole('combobox').filter({ hasText: 'All projects' }));
    await sleep(450);
    await page.keyboard.press('Escape');
    await moveTo(page, page.getByRole('button', { name: /Export PDF/ }));
    await dwell(6);

    scene('reportsThemeSwitch');
    await theme(page, 'Dark');
    await glide(page, 1190, 785);
    await dwell(4);
    scene('reportComparisons');
    await click(page, page.getByRole('tab', { name: 'Task Completions', exact: true }));
    await loadedReport(page, 'Task completions report');
    await sleep(1200);
    await click(page, page.getByRole('tab', { name: 'Team Summary', exact: true }));
    await loadedReport(page, 'Team summary report');
    await dwell(6);

    scene('tasks');
    await click(page, page.getByRole('link', { name: 'Tasks', exact: true }));
    const search = page.getByRole('textbox', { name: 'Search tasks' });
    await search.waitFor();
    await click(page, search);
    await search.pressSequentially(TASK.split(' ').slice(0, 2).join(' '), { delay: 35 });
    await sleep(450);
    await search.fill('');
    await click(page, page.getByRole('combobox').filter({ hasText: 'Columns' }));
    await sleep(450);
    await page.keyboard.press('Escape');
    await click(page, page.getByRole('button', { name: 'Filters', exact: true }));
    await sleep(350);
    await click(page, page.getByRole('button', { name: 'Filters', exact: true }));
    await dwell(7);

    scene('inspector');
    await click(page, page.getByRole('link', { name: TASK, exact: true }).first());
    const inspector = page.getByRole('dialog', { name: 'Task details', exact: true });
    await inspector.getByText(TASK, { exact: true }).first().waitFor();
    await sleep(800);
    await moveTo(page, inspector.getByText('Discussion', { exact: true }));
    await scroll(page, 430, 750);
    await sleep(800);
    await scroll(page, -650, 650);
    await click(page, inspector.getByRole('button', { name: 'Close', exact: true }));
    await dwell(9);

    scene('creation');
    await click(page, page.getByRole('button', { name: 'Create Task', exact: true }));
    const creation = page.getByRole('dialog', { name: 'Create task', exact: true });
    await creation.waitFor();
    const more = creation.getByRole('button', { name: /More options/ });
    if (await more.isVisible()) await click(page, more);
    await sleep(700);
    await page.keyboard.press('Escape');
    await dwell(4);

    scene('calendar');
    await click(page, page.getByRole('button', { name: 'Switch to calendar view' }));
    await page.getByRole('region', { name: 'Month calendar', exact: true }).waitFor();
    const calendarMonth = process.env.DEMO_CALENDAR_MONTH;
    if (calendarMonth) {
      if (!/^\d{4}-\d{2}$/.test(calendarMonth)) throw new Error('DEMO_CALENDAR_MONTH must be YYYY-MM');
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
      const [year, month] = calendarMonth.split('-').map(Number);
      const offset = (year - now.getFullYear()) * 12 + month - 1 - now.getMonth();
      if (Math.abs(offset) > 24 || month < 1 || month > 12) throw new Error('Calendar month must be valid and within 24 months');
      for (let i = 0; i < Math.abs(offset); i++) await click(page, page.getByRole('button', { name: offset < 0 ? 'Previous' : 'Next', exact: true }));
    }
    await glide(page, 1210, 740);
    await scroll(page, 220, 500);
    await sleep(650);
    // Use a real populated day if present, so Day/Week share meaningful dates.
    const dayButtons = page.locator('section[aria-label="Month calendar"] button[aria-label*=" tasks"]:not([aria-label$=", 0 tasks"])');
    if (await dayButtons.count()) await click(page, dayButtons.first());
    else await click(page, page.getByRole('button', { name: 'Day view', exact: true }));
    await page.getByRole('region', { name: 'Day calendar', exact: true }).waitFor();
    await sleep(650);
    await click(page, page.getByRole('button', { name: 'Week view', exact: true }));
    await page.getByRole('region', { name: 'Week calendar', exact: true }).waitFor();
    await dwell(7);

    scene('schedule');
    await click(page, page.getByRole('link', { name: 'Schedule', exact: true }));
    await page.getByRole('region', { name: 'Staff task timeline' }).waitFor();
    await click(page, page.getByRole('combobox').filter({ hasText: 'All projects' }));
    await click(page, page.getByText(PROJECT, { exact: true }).last());
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: /^Inspect / }).first().waitFor();
    await moveTo(page, page.getByRole('button', { name: /^Inspect / }).first());
    const deadline = page.getByRole('button', { name: /^Adjust deadline for / }).first();
    if (await deadline.isVisible()) {
      await click(page, deadline);
      await page.getByLabel('Deadline date', { exact: true }).waitFor();
      await sleep(500);
      await page.keyboard.press('Escape');
    }
    await dwell(7);

    scene('notifications');
    await click(page, page.getByRole('button', { name: 'Notifications', exact: true }).first());
    const inbox = page.getByRole('dialog', { name: 'Notifications', exact: true });
    await inbox.waitFor();
    await sleep(700);
    await click(page, inbox.getByRole('button', { name: 'Close', exact: true }));
    await dwell(3);

    scene('closing');
    await click(page, page.getByRole('link', { name: 'Reports', exact: true }));
    await loadedReport(page, 'Logged time overview');
    await theme(page, 'Light');
    await glide(page, 1190, 785);
    await dwell(7);
    mark('end');
    if (unexpectedMutation) throw new Error(`Capture rejected: ${unexpectedMutation}`);
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();
    const videoPath = video ? await video.path() : null;
    const result = { video: videoPath, viewport: SIZE, timezone: 'Asia/Singapore', marks, unexpectedMutation: unexpectedMutation || null };
    fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Capture failed');
  process.exitCode = 1;
});
