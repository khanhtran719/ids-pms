# IDS PMS

Bộ khung triển khai cho hệ thống quản lý dự án IDS PMS.

## Tài liệu dự án

- `AGENTS.md`: chỉ dẫn bắt buộc cho AI agent.
- `OVERVIEW.md`: mục tiêu, kiến trúc và trạng thái hiện tại.
- `RULES.md`: quy tắc kỹ thuật và chất lượng.
- `DECISIONS.md`: các quyết định kiến trúc đã chốt.
- `AI_WORKFLOW.md`: quy trình log phiên AI local, không đưa lên Git.

## Công nghệ

- Frontend: Angular 22, SCSS, Jest, Playwright
- Backend: NestJS 11, REST/OpenAPI, Mongoose
- Database: MongoDB 8 chạy replica set một node ở local
- File: lưu tại `storage/uploads`; lớp lưu trữ cloud sẽ được bổ sung khi khách chốt
- Workspace: Nx monorepo

## Cấu trúc chính

```text
apps/
  web/       Angular application
  api/       NestJS REST API
  web-e2e/   Playwright end-to-end tests
  api-e2e/   API end-to-end tests
libs/
  api-contracts/  Shared HTTP envelope types, không chứa framework
storage/
  uploads/   File local, không commit nội dung lên Git
```

## Chạy local

Yêu cầu Node.js 24+, npm và Docker Desktop.

```bash
npm install
cp .env.example .env
docker compose up -d mongodb
npm run dev
```

Sau khi khởi động:

- Web: http://localhost:4200
- API health: http://localhost:3000/api/v1/health
- API liveness/readiness: http://localhost:3000/api/v1/health/live và `/ready`
- Swagger: http://localhost:3000/api/docs

## Tạo tài khoản quản trị đầu tiên

Thiết lập các biến sau trong `.env` trước khi khởi động API lần đầu:

```dotenv
JWT_ACCESS_SECRET=<chuỗi-ngẫu-nhiên-tối-thiểu-32-ký-tự>
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=<mật-khẩu-mạnh-tối-thiểu-12-ký-tự>
SEED_ADMIN_DISPLAY_NAME=System Administrator
```

Seed chạy idempotent lúc API bootstrap: ba vai trò chuẩn luôn được đồng bộ và admin chỉ được tạo nếu email chưa tồn tại. Sau khi tạo thành công, có thể bỏ hai biến email/password khỏi môi trường runtime. Không commit credential thật vào Git hoặc log AI.

Trong local dùng `AUTH_COOKIE_SECURE=false`; môi trường HTTPS/production phải dùng `true` (production mặc định bật nếu không cấu hình khác).

## Kiểm tra chất lượng

```bash
npm test
npm run test:coverage
npm run lint
npm run build
npm run test:e2e
```

Coverage report riêng được tạo tại `coverage/apps/api` và `coverage/apps/web`. CI chạy `test:coverage` để chặn regression dưới baseline hiện tại; xem chiến lược và mục tiêu tăng dần trong `docs/testing.md`.

## Phiên làm việc với AI

```bash
npm run ai:session:start -- --agent="<model>" --task="<mục tiêu>"
npm run ai:session:log -- --type="change" --message="<thay đổi>" --files="<file>"
npm run ai:session:end -- --status="completed" --summary="<kết quả>" --validation="<kiểm tra>"
```

Log được tạo trong `.ai-work/`. Toàn bộ thư mục này đã được Git ignore và không được phép dùng `git add -f` để đưa log vào repository.

## Quy ước kiến trúc

- API public đặt dưới `/api/v1` để có thể nâng phiên bản mà không phá client cũ.
- Mọi request có correlation ID; API lỗi dùng một contract thống nhất và không lộ stack/database detail.
- E2E dùng cổng `3100` và MongoDB `project_ql_test`, tách khỏi dữ liệu dev.
- Mongoose quản lý schema và truy cập MongoDB; GraphQL chưa đưa vào giai đoạn đầu.
- MongoDB chạy replica set ngay từ local để hỗ trợ transaction cho các luồng nghiệp vụ nhiều collection.
- Module nghiệp vụ tách theo domain; `auth`, `users` và lát cắt đầu tiên của `projects` đã có, `tasks` là bước tiếp theo.
- Auth hiện dùng access JWT 15 phút trong memory và refresh cookie HttpOnly xoay vòng; frontend không lưu token vào `localStorage`/`sessionStorage`.
- Project dùng membership `owner`/`manager`/`member`; creator là owner đầu tiên trong transaction và không thể xóa hoặc hạ vai trò owner cuối cùng.
- File service dùng adapter local trước; đường dẫn vật lý không được lưu rải rác trong logic nghiệp vụ để sau này đổi sang S3/MinIO mà không sửa toàn hệ thống.
