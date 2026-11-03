// The delight layer in the browser, on the demo day (demo.html: no server). Every joke carries real information,
// Sarah mode turns them all off (same information), and reduced motion stills them.
import { expect, type Page, test } from '@playwright/test';
import { noServer, person } from './helpers';
import { seatOf } from './demoDay';

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

async function askAanya(page: Page, text: string) {
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox', { name: 'Ask Aanya' }).fill(text);
  await page.keyboard.press('Enter');
}

async function openDay(page: Page, query: string) {
  await page.goto(`/demo.html?${query}`);
  await expect(page.locator('[data-person]')).toHaveCount(23);
}

test.beforeEach(async ({ page }) => {
  await noServer(page); // the in-browser demo office answers every /api call
});

test.describe('the delight layer', () => {
  test('a Highlights ceremony: Zara hands out awards won on real numbers, and trophies go on the winners\' desks', async ({ page }) => {
    await openDay(page, 'at=16:50&speed=1');
    await askAanya(page, 'highlights');
    const win = page.getByRole('dialog', { name: 'The Highlights' });
    await expect(win.locator('.highlights-podium')).toBeVisible(); // Zara presents
    const award = (id: string) => win.locator(`[data-highlight="${id}"]`);
    await expect(award('hottest')).toContainText('Card Sharp of the Week');
    await expect(award('hottest')).toContainText('2 cards done');
    await expect(award('fine-work')).toContainText('Meera Kaur');
    await expect(award('fine-work')).toContainText('approval turned around in 42 min'); // blocked 10:58, back at work 11:40
    await expect(award('dont-go-in')).toContainText('Diya Patel');
    await expect(award('dont-go-in')).toContainText('Spilled chili on the import');
    await expect(page.locator('[data-trophy-for="meera"]')).toHaveCount(1);
    await expect(page.locator('[data-trophy-for="diya"]')).toHaveCount(0); // the error award gets no trophy
    await award('fine-work').getByRole('button', { name: /Meera Kaur/ }).click();
    await expect(page.getByRole('dialog', { name: 'Meera Kaur' })).toBeVisible();
  });

  test('an error spills Diya\'s chili at his desk once, and his chip still says what went wrong', async ({ page }) => {
    await openDay(page, 'at=11:05');
    await expect(person(page, 'Diya Patel — imports — error')).toBeVisible();
    const spill = page.locator('[data-seat="seat.diya"] [data-chili]');
    await expect(spill).toHaveCount(1);
    expect(await spill.locator('.chili-puddle').evaluate((el) => getComputedStyle(el).animationIterationCount)).toBe('1');
    await expect(page.locator('.chip.chip-error')).toContainText('Error: Spilled chil');
    await expect(page.locator('[data-chili]')).toHaveCount(1); // only the bot in error
  });

  test('Naina knows something: clicking him shows the raw unattributed items', async ({ page }) => {
    await openDay(page, 'at=11:05');
    await expect(page.locator('[data-naina-note]')).toHaveCount(1);
    await person(page, /^Naina Desai — no bot yet — Naina’s corner: 3 things/).click();
    const corner = page.getByRole('dialog', { name: 'Naina’s corner' });
    await expect(corner.locator('[data-unattributed]')).toHaveCount(3);
    await expect(corner).toContainText('Shred the 2004 expense reports');
    await expect(corner).toContainText('id: card:demo-stray-shred');
  });

  test('easter eggs: the Konami code, the boss mug, "that\'s what she said" and parkour, all carrying real numbers', async ({ page }) => {
    await openDay(page, 'at=11:05');
    for (const key of KONAMI) await page.keyboard.press(key);
    const credits = page.getByRole('dialog', { name: 'Campaign Daybook credits' });
    await expect(credits).toContainText('Meera Kaur');
    await expect(credits).toContainText('as Sales: leads and follow-ups');
    await credits.getByRole('button', { name: 'Close' }).click();
    await expect(credits).toBeHidden();

    await page.locator('.egg-mug').dispatchEvent('click');
    await expect(page.locator('[data-toast]').last()).toContainText('World’s Best Boss');
    await expect(page.locator('[data-toast]').last()).toContainText('1 needing you');

    await person(page, /^Meera Kaur — /).click();
    const meera = page.getByRole('dialog', { name: 'Meera Kaur' });
    await meera.getByLabel('Message Direct line').fill('That list is way too big to send at once.');
    await meera.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('[data-toast]').last()).toContainText('That’s what she said!');
    await expect(page.locator('[data-toast]').last()).toContainText('— You');
    await page.keyboard.press('Escape');

    // A flick, dispatched inside the page 5 ms apart so its speed doesn't depend on how fast the test runner is.
    await page.evaluate(async () => {
      const target = document.elementFromPoint(120, 560);
      if (!target) throw new Error('nothing to drag at (120, 560)');
      const fire = (type: string, x: number, buttons: number) => target.dispatchEvent(new PointerEvent(type, {
        bubbles: true, cancelable: true, composed: true, pointerId: 1, pointerType: 'mouse', isPrimary: true,
        clientX: x, clientY: 560, button: 0, buttons,
      }));
      fire('pointerdown', 120, 1);
      for (let i = 1; i <= 6; i += 1) {
        await new Promise((r) => setTimeout(r, 5));
        fire('pointermove', 120 + i * 150, 1);
      }
      fire('pointerup', 1020, 0);
    });
    await expect(page.locator('[data-toast]').last()).toContainText('Parkour!');
  });

  test('Aaliya\'s crossword at 15:00 has today\'s cards for an answer', async ({ page }) => {
    await openDay(page, 'at=15:02&speed=1');
    await page.locator('.egg-crossword').dispatchEvent('click');
    await expect(page.locator('[data-toast]').last()).toContainText('7 across: cards the bots finished today');
  });

  test('Sarah mode (?sarah=1): the same information, no jokes, no easter eggs', async ({ page }) => {
    await openDay(page, 'at=11:05&sarah=1');
    await expect(person(page, 'Diya Patel — imports — error')).toBeVisible();
    await expect(page.locator('[data-chili], [data-naina-note], [data-trophy], .map-egg')).toHaveCount(0);
    await expect(page.locator('.map-wrap')).not.toHaveAttribute('data-daylight', /./);
    await expect(person(page, 'Naina Desai — no bot yet — Unattributed activity: 3 items')).toBeVisible();
    for (const key of KONAMI) await page.keyboard.press(key);
    await expect(page.getByTestId('credits')).toHaveCount(0);

    await askAanya(page, 'weekly review');
    const review = page.getByRole('dialog', { name: 'Weekly review' });
    await expect(review.locator('[data-highlight="dont-go-in"]')).toContainText('Most errors');
    await expect(review).not.toContainText('Second Look Award');
    await expect(review.locator('.highlights-podium')).toHaveCount(0);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Settings' }).click();
    const sarah = page.getByRole('dialog', { name: 'Settings' }).getByRole('switch', { name: /Sarah mode/ });
    await expect(sarah).toBeChecked();
    await expect(sarah).toBeDisabled(); // on for this page by its address
  });

  test('Sarah mode from Settings turns the jokes off, and back on', async ({ page }) => {
    await openDay(page, 'at=11:05');
    await expect(page.locator('[data-chili]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Settings' }).click();
    const sarah = page.getByRole('dialog', { name: 'Settings' }).getByRole('switch', { name: /Sarah mode/ });
    await sarah.check();
    await expect(page.locator('[data-chili], [data-naina-note]')).toHaveCount(0);
    await expect(page.locator('.os')).toHaveClass(/sarah-mode/);
    await sarah.uncheck();
    await expect(page.locator('[data-chili]')).toHaveCount(1);
  });

  test('ambient life: an idle bot goes for coffee, and Meera\'s bobblehead nods when his bot finishes its card', async ({ page }) => {
    await openDay(page, 'at=09:06&speed=1'); // Aisha is idle at 09:05 and (seed 1) gets a coffee at 09:05-09:07
    await expect.poll(() => seatOf(page, 'aisha')).toMatch(/^spot\.coffee\./);
    await expect(person(page, 'Aisha Malik — community — idle')).toBeVisible(); // still found by his status
    await expect(page.locator('.chip').filter({ hasText: 'Idle · getting coff' })).toHaveCount(1); // (clipped when zoomed out)
    await openDay(page, 'at=12:19'); // the 40 follow-up emails are done at 12:20, a second later at 60x
    await expect(page.locator('.map-wrap.is-nodding')).toHaveCount(1, { timeout: 8000 });
    expect(await page.locator('.bobble-head').evaluate((el) => getComputedStyle(el).animationName)).toBe('dm-nod');
  });

  test('reduced motion: the jokes stay, nothing moves, and nobody wanders off for coffee', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openDay(page, 'at=11:05');
    const puddle = page.locator('[data-seat="seat.diya"] .chili-puddle');
    await expect(puddle).toHaveCount(1);
    expect(await puddle.evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    expect(await page.locator('[data-naina-note]').evaluate((el) => getComputedStyle(el).animationName)).toBe('none');
    await expect(page.locator('[data-seat^="spot."] [data-person]')).toHaveCount(0);
  });
});
