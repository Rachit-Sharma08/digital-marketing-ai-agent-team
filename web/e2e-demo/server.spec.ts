// The real server running the demo day (AKG_SOURCE=demo, as `npx agents-ka-ghar --demo` and Docker run it): no
// keys, no Hermes, writes in memory. Started at 09:00 office time at 60x by playwright.demo.config.ts.
import { expect, test } from '@playwright/test';
import { REPLIES } from '../../shared/demo/lines';
import { officeMinutes } from '../e2e/demoDay';
import { person } from '../e2e/helpers';

test('serves the demo day: badge, office clock, the demo cast and no photos', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.getByTestId('demo-badge')).toHaveText('DEMO · Campaign Daybook');
  await expect(page.getByTestId('read-only')).toHaveCount(0); // the demo's writes are on: they stay in memory
  await expect(page.locator('[data-person]')).toHaveCount(23);
  await expect(person(page, /^Meera Kaur — sales — /)).toBeVisible();
  await expect(person(page, 'Simran Gill — no bot yet')).toBeVisible();
  expect(await officeMinutes(page)).toBeGreaterThanOrEqual(9 * 60);
  expect((await request.get('/api/portraits/aanya')).status()).toBe(404);
  expect((await request.get('/api/headshots/chief')).status()).toBe(404);
});

test('the speed control changes the server clock, and bots answer in character', async ({ page, request }) => {
  await page.goto('/');
  const speed = page.getByRole('group', { name: 'Demo speed' });
  await speed.getByRole('button', { name: '10×' }).click();
  await expect(speed.getByRole('button', { name: '10×' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => (await (await request.get('/api/demo/clock')).json()).speed).toBe(10);
  await speed.getByRole('button', { name: '60×' }).click();
  await expect.poll(async () => (await (await request.get('/api/demo/clock')).json()).speed).toBe(60);

  await person(page, /^Fatima Ali — /).click();
  const fatima = page.getByRole('dialog', { name: 'Fatima Ali' });
  await fatima.getByLabel('Message Direct line').fill('Can I expense a cake?');
  await fatima.getByRole('button', { name: 'Send' }).click();
  const reply = fatima.locator('.msg:not(.mine) .msg-text').last();
  await expect(reply).toBeVisible();
  expect(REPLIES.accounts).toContain(await reply.innerText());
});
