import { expect, test } from '@playwright/test';

test('shows that the local platform is ready', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle('IDS PMS');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('IDS PMS');
  await expect(page.getByText('API sẵn sàng')).toBeVisible();
  await expect(page.getByText('MongoDB đã kết nối')).toBeVisible();
});
