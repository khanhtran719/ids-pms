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
  test.setTimeout(45_000);
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

  await page.getByRole('link', { name: 'Hoàn vốn' }).click();
  await expect(page).toHaveURL(/\/payback$/);
  await expect(page.getByRole('heading', { name: 'Hoàn vốn' })).toBeVisible();
  await expect(
    page.getByText('Chưa có dự án đủ dữ liệu đánh giá'),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Cơ hội kinh doanh' }).click();
  await expect(page).toHaveURL(/\/opportunities$/);
  await expect(
    page.getByRole('heading', { name: 'Cơ hội kinh doanh' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Thêm cơ hội' }).click();
  const opportunityDialog = page.getByRole('dialog', { name: 'Thêm cơ hội' });
  await opportunityDialog.getByLabel('Tên dự án').fill('Web E2E Opportunity');
  await opportunityDialog
    .getByLabel('Chủ đầu tư')
    .fill('IDS Opportunity Investor');
  await opportunityDialog.getByLabel('Người phụ trách').fill('Chị Lan');
  await opportunityDialog
    .getByLabel('Giai đoạn')
    .selectOption({ label: 'GĐ3 · Đã nộp hồ sơ thầu' });
  await opportunityDialog.getByLabel('Đã đánh giá khả thi').check();
  await opportunityDialog.getByRole('button', { name: 'Lưu cơ hội' }).click();
  await expect(page.getByText('Web E2E Opportunity')).toBeVisible();
  await expect(page.getByText('● khả thi')).toBeVisible();

  await page.getByRole('link', { name: 'Tổng quan', exact: true }).click();
  const opportunityMetric = page.locator('.metric--pipeline');
  await expect(opportunityMetric).toContainText('1 cơ hội');
  await expect(opportunityMetric).toContainText('1 đã đánh giá khả thi');

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
  const activity = page.locator('app-project-activity');
  await expect(
    activity.getByRole('heading', { name: 'Hoạt động dự án' }),
  ).toBeVisible();
  await activity
    .getByLabel('Bình luận nội bộ')
    .fill('Đã xác nhận mặt bằng từ luồng Web E2E.');
  await activity.getByRole('button', { name: 'Đăng bình luận' }).click();
  await expect(
    activity.getByText('Đã xác nhận mặt bằng từ luồng Web E2E.'),
  ).toBeVisible();
  await expect(activity.getByText('E2E Administrator')).toBeVisible();
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

  await page.getByRole('link', { name: 'Hợp đồng', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Hợp đồng nhà mạng' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Thêm hợp đồng' }).click();
  const contractDialog = page.getByRole('dialog', { name: 'Thêm hợp đồng' });
  await contractDialog
    .getByLabel('Dự án')
    .selectOption({ label: 'WEB-E2E · Web E2E Project' });
  await contractDialog.getByLabel('Nhà mạng').fill('Viettel');
  await contractDialog.getByLabel('Khối lượng').fill('100');
  await contractDialog.getByRole('button', { name: 'Lưu hợp đồng' }).click();
  await expect(page.getByText('Web E2E Project')).toBeVisible();

  await page.getByRole('link', { name: 'Công nợ' }).click();
  await expect(page.getByRole('heading', { name: 'Công nợ' })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm khoản phải thu' }).click();
  const receivableDialog = page.getByRole('dialog', {
    name: 'Thêm khoản phải thu',
  });
  await receivableDialog
    .getByLabel('Hợp đồng nhà mạng')
    .selectOption({ label: 'WEB-E2E · Web E2E Project · Viettel' });
  await receivableDialog.getByLabel('Kỳ phải thu').fill('Q3/2026');
  await receivableDialog.getByLabel('Phải thu (VND)').fill('100000000');
  await receivableDialog.getByLabel('Đã thu (VND)').fill('40000000');
  await receivableDialog.getByLabel('Hạn thanh toán').fill('2026-08-01');
  await receivableDialog
    .getByRole('button', { name: 'Lưu khoản phải thu' })
    .click();
  const receivableRow = page.locator('tbody tr').filter({
    hasText: 'Web E2E Project',
  });
  await expect(receivableRow).toContainText('Q3/2026');
  await expect(receivableRow).toContainText('Quá hạn');

  await page.getByRole('link', { name: 'Dự án', exact: true }).click();
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
  const crmQuality = page.locator('.crm-quality');
  await expect(crmQuality).toContainText('1/1');
  await expect(crmQuality).toContainText('Thiếu tương tác cuối1');
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
