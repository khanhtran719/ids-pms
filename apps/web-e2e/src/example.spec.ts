import { expect, test } from '@playwright/test';

test('redirects an anonymous visitor to the accessible login page', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveTitle('IDS PMS');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Mật khẩu', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeDisabled();
});

test('logs an administrator in and exposes authorized navigation', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin.e2e@example.test');
  await page
    .getByLabel('Mật khẩu', { exact: true })
    .fill('E2e-only-password-123!');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole('heading', { name: 'Chào E2E Administrator' }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Người dùng' }).click();
  await expect(page).toHaveURL(/\/users$/);
  await expect(page.getByText('admin.e2e@example.test')).toBeVisible();

  await page
    .locator('aside')
    .getByRole('button', { name: 'Đăng xuất' })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});
