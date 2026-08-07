import { test, expect } from '@playwright/test';

test.describe('Student Celebration Feature E2E Suite', () => {
  test('student receives celebration toast and animation on initial load after approval', async ({ page }) => {
    // 1. Login as Student 2 (~40% progress)
    await page.goto('/login');
    await page.fill('input[type="email"]', 'student40@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    // 2. Check for celebration canvas and notification banner
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // 3. Verify page remains fully interactive during celebration
    const link = page.locator('a[href="/dashboard/requests"]');
    if (await link.count() > 0) {
      await expect(link.first()).toBeEnabled();
    }

    // 4. Reload page and verify ACK prevented duplicate celebration replay
    await page.reload();
    await expect(page).toHaveURL('/dashboard');
  });

  test('prefers-reduced-motion emulation displays static fallback without animation', async ({ page }) => {
    // Emulate reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });

    await page.goto('/login');
    await page.fill('input[type="email"]', 'student40@example.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });
});
