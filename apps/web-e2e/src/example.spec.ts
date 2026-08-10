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

  await page.getByRole('link', { name: 'Dự án' }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page
    .locator('header')
    .getByRole('button', { name: 'Tạo dự án' })
    .click();
  await page.getByLabel('Mã dự án').fill('WEB-E2E');
  await page.getByLabel('Tên dự án').fill('Web E2E Project');
  await page
    .getByLabel('Mô tả')
    .fill('Project created through the Angular workflow');
  await page.locator('form').getByRole('button', { name: 'Tạo dự án' }).click();

  await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}$/);
  await expect(
    page.getByRole('heading', { name: 'Web E2E Project' }),
  ).toBeVisible();
  await expect(page.getByText('WEB-E2E')).toBeVisible();
  await expect(
    page.locator('.member-row').getByText('E2E Administrator'),
  ).toBeVisible();
  await expect(page.getByLabel('Vai trò của E2E Administrator')).toHaveValue(
    'owner',
  );

  await page
    .locator('aside')
    .getByRole('button', { name: 'Đăng xuất' })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});
