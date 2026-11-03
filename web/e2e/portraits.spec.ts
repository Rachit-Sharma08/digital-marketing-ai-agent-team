import { expect, test } from '@playwright/test';
import type { OfficeSnapshot } from '../../shared/contract';
import { DEMO_SNAPSHOT } from '../../shared/fixtures/demo-snapshot';
import { liveServer, noServer, person } from './helpers';

// A 4×4 orange PNG standing in for a photo (the repo ships no photos).
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAEElEQVR4nGM4UaEBRwzEcQBTUhaBGaoOzwAAAABJRU5ErkJggg==', 'base64');

test.describe('portraits', () => {
  test('live: the person window shows the photo when the server has one', async ({ page }) => {
    await liveServer(page);
    await page.route('**/api/portraits/meera', (route) => route.fulfill({ status: 200, contentType: 'image/png', body: PNG }));
    await page.goto('/');
    await person(page, 'Meera Kaur — campaigns — working').click();
    const shot = page.getByRole('dialog', { name: 'Meera Kaur' }).getByRole('img', { name: 'Meera Kaur portrait' });
    await expect(shot).toHaveAttribute('data-state', 'photo');
    expect(await shot.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(4);
  });

  test('live: a 404 falls back to the drawn character, with no broken image', async ({ page }) => {
    await liveServer(page);
    await page.goto('/');
    await page.getByRole('button', { name: /^Conference Room — / }).click();
    const win = page.getByRole('dialog', { name: 'Conference Room — Ops room' });
    const portraits = win.locator('.member-list [data-portrait]');
    await expect(portraits.first()).toBeVisible();
    await expect(win.locator('[data-portrait][data-state="loading"]')).toHaveCount(0);
    for (const p of await portraits.all()) await expect(p).toHaveAttribute('data-state', 'drawn');
    await expect(win.locator('.member-list img')).toHaveCount(0);
    await expect(win.locator('.member-list [data-portrait] svg').first()).toBeVisible();
  });

  test('demo: drawn characters only, and no portrait requests', async ({ page }) => {
    const asked: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/portraits/')) asked.push(r.url()); });
    await noServer(page);
    await page.goto('/?demo=1');
    await person(page, 'Meera Kaur — campaigns — working').click();
    await expect(page.getByRole('dialog', { name: 'Meera Kaur' }).getByRole('img', { name: 'Meera Kaur portrait' }))
      .toHaveAttribute('data-state', 'drawn');
    await page.getByRole('button', { name: /^Conference Room — / }).click();
    await expect(page.getByRole('dialog', { name: 'Conference Room — Ops room' }).locator('.member-list [data-portrait]').first()).toBeVisible();
    expect(asked).toEqual([]);
  });

  test('hovering or focusing a person shows a tooltip with a small round portrait', async ({ page }) => {
    await noServer(page);
    await page.goto('/?demo=1');
    const tip = page.getByRole('tooltip');
    await page.locator('[data-person="meera"]').hover();
    await expect(tip).toContainText('Meera Kaur');
    await expect(tip).toContainText('campaigns · working');
    await expect(tip.locator('.portrait-tip')).toBeVisible();
    await page.mouse.move(5, 300);
    await expect(tip).toBeHidden();
    await person(page, /^Simran Gill — /).focus();
    await expect(tip).toContainText('Simran Gill');
    await expect(tip).toContainText('No bot yet');
  });

  test('Isabella D Costa keeps his name; the Hermes persona name is a second line in his window', async ({ page }) => {
    const snapshot: OfficeSnapshot = {
      ...DEMO_SNAPSHOT,
      people: DEMO_SNAPSHOT.people.map((p) => (p.id === 'isabella' ? { ...p, persona: 'Hank' } : p)),
    };
    await liveServer(page, [], snapshot);
    await page.goto('/');
    await person(page, 'Isabella D Costa — health — working').click();
    const win = page.getByRole('dialog', { name: 'Isabella D Costa' });
    await expect(win).toContainText("Health & fitness · Meera's sensei");
    await expect(win.locator('.persona-alias')).toHaveText('Hermes persona: Hank');
  });
});
