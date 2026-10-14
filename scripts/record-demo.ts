#!/usr/bin/env tsx
/**
 * Records a walkthrough video of NODAL for the portfolio / README.
 *
 * Not part of the e2e suite: it only browses, never asserts, and is paced
 * for a human viewer (eased pointer moves, pauses, a visible cursor).
 *
 * Usage (against a LOCAL, freshly seeded app, ideally `pnpm build && pnpm start`):
 *   DEMO_PASSWORD=... pnpm exec tsx scripts/record-demo.ts [outDir]
 *
 * Env:
 *   DEMO_BASE_URL  default http://localhost:3000
 *   DEMO_EMAIL     default daniel.tan@nodal.demo (admin + manager persona)
 *   DEMO_PASSWORD  required
 *
 * Output: <outDir>/raw/*.webm (1440x900) and <outDir>/timeline.json with the
 * second at which the walkthrough starts, for trimming with ffmpeg.
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Locator, type Page } from '@playwright/test';

const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:3000';
const EMAIL = process.env.DEMO_EMAIL ?? 'daniel.tan@nodal.demo';
const PASSWORD = process.env.DEMO_PASSWORD;
const OUT = path.resolve(process.argv[2] ?? 'demo-recording');
const SIZE = { width: 1440, height: 900 };

if (!PASSWORD) {
  console.error('DEMO_PASSWORD is not set');
  process.exit(1);
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
  const duration = ms ?? Math.min(1100, Math.max(350, dist * 1.1));
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

async function click(page: Page, target: Locator, pauseBefore = 250) {
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

async function settle(page: Page, extra = 600) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await sleep(extra);
  // Re-sync the drawn cursor after a navigation.
  await page.mouse.move(cursor.x, cursor.y);
}

async function main() {
  fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: SIZE,
    deviceScaleFactor: 1,
    recordVideo: { dir: path.join(OUT, 'raw'), size: SIZE },
  });
  await context.addInitScript(CURSOR_SCRIPT);
  const page = await context.newPage();
  const t0 = Date.now();
  const marks: Record<string, number> = {};
  const mark = (name: string) => (marks[name] = (Date.now() - t0) / 1000);

  // ---- Login ----
  await page.goto(BASE);
  await settle(page, 300);
  mark('start');
  await sleep(900);
  await click(page, page.locator('#email'));
  await page.keyboard.type(EMAIL, { delay: 45 });
  await sleep(250);
  await click(page, page.locator('#password'));
  await page.keyboard.type(PASSWORD!, { delay: 45 });
  await sleep(400);
  await click(page, page.locator('button[type=submit]'));
  await page.waitForURL(/\/tasks/, { timeout: 30000 });
  await settle(page, 900);
  mark('tasks');

  // ---- Reports dashboard ----
  await click(page, page.getByRole('link', { name: 'Report', exact: true }));
  await page.waitForURL(/\/report/);
  await settle(page, 1200);
  mark('report');
  await moveTo(page, page.getByText('Time Distribution').first(), { dy: 260 });
  await sleep(1200);
  await moveTo(page, page.getByText('On-Time Completion Rate').first(), { dy: 260 });
  await sleep(1200);

  // Date range: This Month, then back to all time
  const dateRange = page.locator('div.relative.w-52 > button').first();
  await click(page, dateRange);
  await sleep(700);
  await click(page, page.getByRole('button', { name: 'This Month', exact: true }));
  await settle(page, 1500);
  const clear = page.getByRole('button', { name: 'Clear', exact: true });
  if (!(await clear.isVisible())) await click(page, dateRange);
  await sleep(500);
  await click(page, clear);
  await settle(page, 900);
  await page.keyboard.press('Escape');

  // Report types
  await click(page, page.getByRole('combobox').filter({ hasText: 'Logged Time' }));
  await sleep(500);
  await click(page, page.getByRole('option', { name: 'Task Completions' }));
  await settle(page, 1800);
  await scroll(page, 450, 1000);
  await sleep(1200);
  await scroll(page, -450, 800);
  await click(page, page.getByRole('combobox').filter({ hasText: 'Task Completions' }));
  await sleep(500);
  await click(page, page.getByRole('option', { name: 'Team Summary' }));
  await settle(page, 2000);
  await moveTo(page, page.getByRole('button', { name: /Export PDF/ }));
  await sleep(900);
  await moveTo(page, page.getByRole('button', { name: /Export Excel/ }));
  await sleep(900);
  mark('reportEnd');

  // ---- Task list ----
  await click(page, page.getByRole('link', { name: 'Tasks', exact: true }));
  await page.waitForURL(/\/tasks$/);
  await settle(page, 1000);
  await moveTo(page, page.getByText('Integrate SSO with customer directory').first());
  await sleep(600);
  await scroll(page, 500, 1200);
  await sleep(700);
  await scroll(page, -500, 900);
  await sleep(300);

  // ---- Task detail ----
  await click(page, page.getByText('Customer portal v2 launch', { exact: true }).first());
  await page.waitForURL(/\/tasks\/\d+/);
  await page.getByText('Task Details').first().waitFor({ timeout: 20000 });
  await settle(page, 1000);
  mark('detail');
  await moveTo(page, page.getByText('Assignees', { exact: false }).first(), { dy: 30 });
  await sleep(700);
  await scroll(page, 900, 1600);
  await sleep(1300);
  await scroll(page, 900, 1600);
  await sleep(1600);
  await scroll(page, -1800, 1000);
  await sleep(300);
  await click(page, page.getByText('Back to Tasks').first());
  await page.waitForURL(/\/tasks$/);
  await settle(page, 700);

  // ---- Calendar ----
  await click(page, page.getByRole('button', { name: /calendar view/i }));
  await settle(page, 1200);
  mark('calendar');
  await moveTo(page, page.getByText('Customer portal v2 launch').first());
  await sleep(900);
  await moveTo(page, page.getByText('Weekly infra standup').first());
  await sleep(800);
  await moveTo(page, page.getByText('Replace faulty gateway').first());
  await sleep(900);

  // ---- Schedule (Gantt) ----
  await click(page, page.getByRole('link', { name: 'Schedule', exact: true }));
  await page.waitForURL(/\/schedule/);
  await settle(page, 1500);
  mark('schedule');
  await moveTo(page, page.getByText('Customer Portal Revamp').first());
  await sleep(800);
  await click(page, page.getByRole('combobox').filter({ hasText: 'All projects' }));
  await sleep(500);
  await click(page, page.getByText('Customer Portal Revamp', { exact: true }).last());
  await sleep(400);
  await page.keyboard.press('Escape');
  await settle(page, 1800);
  await moveTo(page, page.getByText('Integrate SSO with customer directory').first());
  await sleep(1800);
  mark('end');

  const video = page.video();
  await context.close();
  await browser.close();
  const videoPath = video ? await video.path() : null;
  fs.writeFileSync(
    path.join(OUT, 'timeline.json'),
    JSON.stringify({ video: videoPath, marks }, null, 2)
  );
  console.log(JSON.stringify({ video: videoPath, marks }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
