# Chiến lược kiểm thử

- Unit test: business rule, parser/helper, error normalization và component state.
- API e2e: contract HTTP, validation, authorization, security header và failure path.
- Browser e2e: hành trình quan trọng, không kiểm tra mọi chi tiết trình bày.

## Unit coverage gate

Jest đo toàn bộ source TypeScript có logic thay vì chỉ các file được test import. Bootstrap, module/controller wiring, DTO/schema thuần, route/config và file test không nằm trong mẫu số; business service, repository, guard/interceptor và component có hành vi vẫn được tính.

Baseline được khóa riêng theo ứng dụng:

| Ứng dụng | Statements | Branches | Functions | Lines |
| -------- | ---------: | -------: | --------: | ----: |
| API      |        91% |      73% |       93% |   92% |
| Web      |        89% |      71% |       86% |   90% |

Đây là regression floor được làm tròn xuống từ kết quả đo hiện tại: API đạt 91.82% statements, 73.55% branches, 93.04% functions và 92.24% lines; Web đạt 89.50%, 71.42%, 86.23% và 90.53% tương ứng. Mục tiêu kế tiếp là nâng branch coverage lên 80%, ưu tiên authorization, transaction, validation và state bất đồng bộ. Khi coverage tăng ổn định, nâng threshold cùng thay đổi test tương ứng; không hạ threshold hoặc thêm exclusion chỉ để làm CI xanh.

Các lệnh:

```bash
npm run test:coverage
npm run test:coverage:api
npm run test:coverage:web
```

HTML và LCOV/JSON summary được tạo dưới `coverage/apps/api` và `coverage/apps/web`; toàn bộ `coverage/` là generated artifact và đã được Git ignore.

API e2e chạy ở cổng `3100` và chỉ dùng database có hậu tố `_test`. Global setup/teardown từ chối database dev và tự drop test database trước/sau suite.

Auth API e2e dùng duy nhất fixture credential giả trong source test. Suite kiểm tra CSRF, lỗi credential chung, cờ cookie, phân quyền, không lộ password hash, refresh rotation/replay và logout revocation. Đây không phải credential dùng cho dev hay production.

Projects API e2e kiểm tra tạo project/owner trong transaction, code trùng, scope danh sách theo membership, candidate directory, quyền member, cập nhật, aggregate member list và invariant owner cuối cùng. Browser e2e đi xuyên hành trình admin đăng nhập, xem users, tạo project và thấy owner trên trang chi tiết.

Chạy local:

```bash
docker compose up -d mongodb
npm test
npm run test:coverage
npm run lint
npm run build
npm run test:e2e
```

Angular production build và Playwright cần quyền tạo tiến trình/browser. Trong môi trường sandbox, chạy ngoài sandbox nếu esbuild bị deadlock do IPC bị giới hạn.
