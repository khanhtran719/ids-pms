# Technical debt đang theo dõi

## Dev tooling dependency audit

- Ngày kiểm tra: 2026-08-10.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerability trong production dependency tree.
- Full `npm audit`: 25 vulnerability (6 moderate, 19 high) nằm trong toolchain Angular CLI/Nx/build/test, gồm các dependency bắc cầu như `brace-expansion`, `image-size`, `postcss`, `uuid` và `@hono/node-server`.
- Các fix npm đề xuất hiện yêu cầu thay đổi breaking hoặc cài phiên bản nằm ngoài range đã chốt. Không chạy `npm audit fix --force`.
- Hành động: theo dõi bản vá tương thích từ Angular/Nx, nâng cấp trong một PR riêng và chạy lại toàn bộ lint, unit, build và e2e.

## Nx inferred targets

- Nx đang cảnh báo executor `@nx/jest:jest` và `@nx/eslint:lint` sẽ bị loại ở Nx 24.
- Hành động: chạy generator chuyển sang inferred targets trong đợt nâng Nx riêng, không trộn với module nghiệp vụ đầu tiên.

## Jest config loader

- API e2e vẫn chạy xanh nhưng Jest cảnh báo khi nạp `jest.config.cts` theo ES module.
- Hành động: chuẩn hóa Jest config cùng đợt migrate inferred targets để tránh sửa tooling hai lần.
