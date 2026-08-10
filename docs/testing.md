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

Đây là regression floor, không phải mức trần. Sau lát cắt Data Quality v1, API đạt 92.91% statements, 76.00% branches, 94.73% functions và 93.42% lines; Web đạt 90.87%, 79.39%, 88.16% và 92.38% tương ứng. Mục tiêu kế tiếp là đưa branch coverage ổn định trên 80%, ưu tiên authorization, transaction, validation và state bất đồng bộ. Khi coverage tăng ổn định, nâng threshold cùng thay đổi test tương ứng; không hạ threshold hoặc thêm exclusion chỉ để làm CI xanh.

Các lệnh:

```bash
npm run test:coverage
npm run test:coverage:api
npm run test:coverage:web
```

HTML và LCOV/JSON summary được tạo dưới `coverage/apps/api` và `coverage/apps/web`; toàn bộ `coverage/` là generated artifact và đã được Git ignore.

API e2e và browser e2e chạy ở cổng API `3100`, chỉ dùng database có hậu tố `_test`. Hai suite dùng chung global setup/teardown an toàn để từ chối database dev, drop/seed trước suite và dọn database sau suite; browser test vì vậy có thể chạy lại sau một lần thất bại mà không gặp dữ liệu trùng.

Auth API e2e dùng duy nhất fixture credential giả trong source test. Suite kiểm tra CSRF, lỗi credential chung, cờ cookie, phân quyền, không lộ password hash, refresh rotation/replay và logout revocation. Đây không phải credential dùng cho dev hay production.

Projects API e2e kiểm tra tạo project/owner trong transaction, code trùng, scope danh sách theo membership, candidate directory, quyền member, cập nhật, aggregate member list và invariant owner cuối cùng. Browser e2e đi xuyên hành trình admin đăng nhập, xem users, tạo project và thấy owner trên trang chi tiết.

Tasks API e2e kiểm tra khởi tạo 5 bước idempotent, scope task theo membership, quyền read-only member, rule ngày hoàn thành thực tế và filter trạng thái. Browser e2e tiếp tục hành trình project bằng việc mở Tiến độ, khởi tạo kế hoạch và nhìn thấy đủ 5 bước trên Angular.

Data Quality API e2e kiểm tra aggregation thật trên MongoDB, scope membership, tìm kiếm/loại cảnh báo, quy tắc đếm kế hoạch thiếu/task quá hạn và validation query. Browser e2e mở trang Chất lượng từ navigation, nhìn thấy project vừa tạo cùng cảnh báo CAPEX/kế hoạch dẫn xuất.

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
