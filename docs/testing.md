# Chiến lược kiểm thử

- Unit test: business rule, parser/helper, error normalization và component state.
- API e2e: contract HTTP, validation, authorization, security header và failure path.
- Browser e2e: hành trình quan trọng, không kiểm tra mọi chi tiết trình bày.

API e2e chạy ở cổng `3100` và chỉ dùng database có hậu tố `_test`. Global setup/teardown từ chối database dev và tự drop test database trước/sau suite.

Auth API e2e dùng duy nhất fixture credential giả trong source test. Suite kiểm tra CSRF, lỗi credential chung, cờ cookie, phân quyền, không lộ password hash, refresh rotation/replay và logout revocation. Đây không phải credential dùng cho dev hay production.

Chạy local:

```bash
docker compose up -d mongodb
npm test
npm run lint
npm run build
npm run test:e2e
```

Angular production build và Playwright cần quyền tạo tiến trình/browser. Trong môi trường sandbox, chạy ngoài sandbox nếu esbuild bị deadlock do IPC bị giới hạn.
