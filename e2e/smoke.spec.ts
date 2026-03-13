import { expect, test } from '@playwright/test';

test('loads onboarding screen', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Choose your path')).toBeVisible();
  await expect(page.getByText('Verent.')).toBeVisible();
});
