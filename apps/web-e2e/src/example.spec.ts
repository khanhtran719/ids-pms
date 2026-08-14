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
  await expect(page.getByText('Tổng doanh thu')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Doanh thu và chi phí theo quý' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Trạng thái dự án' }),
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
  await page.getByLabel('Chủ đầu tư').fill('IDS E2E Investor');
  await page.getByLabel('Tỉnh / thành phố').fill('Hồ Chí Minh');
  await page
    .locator('.create-panel')
    .getByLabel('Trạng thái vận hành')
    .selectOption('operational');
  await page.locator('form').getByRole('button', { name: 'Tạo dự án' }).click();

  await expect(page).toHaveURL(/\/projects\/[a-f0-9]{24}$/);
  await expect(
    page.getByRole('heading', { name: 'Web E2E Project' }),
  ).toBeVisible();
  await expect(page.getByText('WEB-E2E')).toBeVisible();
  await expect(page.getByText('IDS E2E Investor')).toBeVisible();
  await expect(page.getByText('Hồ Chí Minh')).toBeVisible();
  await expect(page.getByText('Đang khai thác')).toBeVisible();
  await expect(
    page.locator('.member-row').getByText('E2E Administrator'),
  ).toBeVisible();
  await expect(page.getByLabel('Vai trò của E2E Administrator')).toHaveValue(
    'owner',
  );
  await expect(
    page.getByRole('heading', { name: 'Doanh thu theo quý' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Chỉnh sửa doanh thu quý 1' }).click();
  await page.getByLabel('Doanh thu (VND)').fill('120000000');
  await page.getByLabel('Chi phí (VND)').fill('80000000');
  await page.getByRole('button', { name: 'Lưu số liệu' }).click();
  const firstQuarter = page
    .locator('app-project-revenue tbody tr')
    .filter({ hasText: 'Q1' });
  await expect(firstQuarter).toContainText('120,000,000');

  await page.getByRole('link', { name: 'Danh sách dự án' }).click();
  await page.getByLabel('Tìm dự án').fill('IDS E2E Investor');
  await page
    .getByRole('region', { name: 'Bộ lọc danh mục dự án' })
    .getByLabel('Trạng thái vận hành')
    .selectOption('operational');
  await expect(
    page.getByRole('link', { name: 'Web E2E Project' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Web E2E Project' }).click();

  await page.getByRole('link', { name: 'Tiến độ', exact: true }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await expect(
    page.getByRole('heading', { name: 'Tiến độ thi công' }),
  ).toBeVisible();
  await page
    .getByLabel('Dự án', { exact: true })
    .selectOption({ label: 'WEB-E2E · Web E2E Project' });
  await page.getByRole('button', { name: 'Khởi tạo kế hoạch' }).click();
  await expect(
    page.getByRole('heading', { name: 'Web E2E Project' }),
  ).toBeVisible();
  await expect(page.getByText('0/5 hoàn thành')).toBeVisible();
  await expect(page.getByText('Hồ sơ thiết kế phê duyệt')).toBeVisible();

  await page.getByRole('link', { name: 'Chất lượng' }).click();
  await expect(page).toHaveURL(/\/data-quality$/);
  await expect(
    page.getByRole('heading', { name: 'Chất lượng dữ liệu' }),
  ).toBeVisible();
  const qualityRow = page.locator('.issue-row').filter({
    hasText: 'Web E2E Project',
  });
  await expect(qualityRow).toBeVisible();
  const qualityChips = qualityRow.locator('.issue-chips');
  await expect(qualityChips.getByText('Thiếu CAPEX')).toBeVisible();
  await expect(qualityChips.getByText('Thiếu kế hoạch')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(qualityRow).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 720 });

  await page
    .locator('aside')
    .getByRole('button', { name: 'Đăng xuất' })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});
