# Kiến trúc triển khai

## Ranh giới chính

- `apps/web`: Angular shell và các feature UI. Component không gọi API trực tiếp.
- `apps/api`: NestJS REST API. Mỗi nghiệp vụ mới là một module độc lập theo domain.
- `libs/api-contracts`: chứa TypeScript HTTP contract dùng chung; không chứa framework, persistence model hoặc business logic.
- `apps/*-e2e`: kiểm tra contract và hành trình người dùng từ bên ngoài ứng dụng.

Dependency đi theo hướng `app/feature -> shared contracts`. Code trong `scope:shared` không được phụ thuộc vào web hoặc API. ESLint/Nx tags cưỡng chế hướng phụ thuộc này.

## Cấu trúc module backend mới

```text
apps/api/src/app/<domain>/
  <domain>.module.ts
  presentation/    controller, request/response DTO
  application/     use case, service, ports
  domain/          entity/value object/business rules nếu cần
  infrastructure/  Mongoose schema, repository adapter, integration
```

Không tạo đủ bốn tầng nếu module quá nhỏ; ranh giới controller, business logic và data access vẫn phải rõ.

## Cấu trúc feature frontend mới

```text
apps/web/src/app/features/<feature>/
  pages/
  components/
  data-access/
  <feature>.routes.ts
```

Các feature lớn lazy-load theo route. `core/` chỉ dành cho singleton toàn ứng dụng như HTTP interceptor; thành phần tái sử dụng không có state nghiệp vụ đặt trong shared UI library khi thực sự xuất hiện nhu cầu.

## Luồng request

1. Angular gắn `X-Request-Id`, `Accept: application/json`, cookie credential và CSRF header cho request `/api/*`; bearer token chỉ lấy từ in-memory auth store.
2. NestJS kiểm tra hoặc sinh request ID an toàn, rồi trả lại trong response header.
3. Helmet, CORS, body limit, validation và throttling chạy trước controller.
4. Exception filter trả một error contract thống nhất; request log chỉ chứa method, path, status, duration và request ID.
5. Mongoose truy cập MongoDB; list query phải có pagination, projection và tránh N+1.

## Luồng phiên đăng nhập

1. Login kiểm tra user active và Argon2id password hash.
2. API phát access JWT ngắn hạn; refresh token entropy cao được hash trước khi lưu `refresh_sessions`.
3. Angular giữ access token trong memory; trình duyệt tự quản lý refresh cookie HttpOnly.
4. Reload trang gọi refresh một lần để khôi phục session; tab đang mở chủ động refresh trước khi access token hết hạn và retry ngắn khi gặp lỗi mạng tạm thời.
5. Refresh dùng atomic consume để token cũ không thể replay, rồi phát cặp token mới.
6. Logout xóa refresh session và cookie; authorization nghiệp vụ luôn được guard tại API.

## Luồng project và membership

1. Danh sách project luôn phân trang. Người có `projects.manage` đọc toàn bộ; người dùng khác được scope bằng membership ngay tại query.
2. Tạo project và membership owner đầu tiên chạy trong cùng MongoDB transaction.
3. Quyền quản trị project được cấp cho global `projects.manage` hoặc membership `owner`/`manager`; controller vẫn yêu cầu quyền đọc nền `projects.read`.
4. Thêm, đổi vai trò và xóa membership dùng transaction để khóa invariant phải còn ít nhất một owner.
5. Member list dùng aggregation `$lookup` một lần; thống kê membership được gom bằng aggregate theo tập project, không query lặp theo từng item.
6. Candidate directory chỉ tải khi UI mở panel, có search và `limit` bị chặn ở backend.

## Luồng task và tiến độ 5 bước

1. Người có `tasks.manage` chọn project và gọi endpoint initialize; repository dùng `bulkWrite` với upsert theo index unique `projectId + step`, nên chạy lại không nhân đôi task.
2. Ngày kế hoạch để trống khi khởi tạo; hệ thống không suy diễn ngày từ project hoặc dữ liệu minh họa.
3. Task list join project và membership ngay trong MongoDB; `$facet` trả page data, total và overview trong một aggregate để tránh N+1 và tránh các vòng xử lý lặp không cần thiết ở application service.
4. Người không có `projects.manage` bị scope bằng `project_memberships` trong pipeline. Write endpoint vẫn yêu cầu `tasks.manage` và quyền đọc project nền.
5. Application service merge trạng thái hiện tại với patch rồi kiểm tra date range và invariant `done <=> actualEndDate` trước một atomic update.

## Luồng chất lượng dữ liệu

1. Angular debounce nội dung tìm kiếm 300 ms; mỗi query mới đi qua `switchMap` để hủy request cũ không còn giá trị.
2. API áp dụng scope project giống danh mục dự án, sau đó `$lookup` task theo từng project bên trong một aggregation.
3. Pipeline tính số bước/ngày kế hoạch thiếu, task quá hạn, task hoàn thành thiếu ngày thật cùng cờ xung đột/CAPEX từ project.
4. `$facet` trả summary toàn scope, page data và total cho bộ lọc trong cùng query; application service chỉ ghép pagination contract, không duyệt lại mảng kết quả.
5. Cảnh báo v1 là dữ liệu dẫn xuất tại thời điểm đọc, không lưu collection và không ngầm tạo workflow khi khách chưa xác nhận.

## Luồng doanh thu theo quý

1. Angular gửi một request báo cáo theo năm tài chính; tìm kiếm debounce 300 ms và dùng `switchMap` để bỏ request cũ.
2. API scope collection project theo membership, sau đó `$lookup` `revenue_actuals` đúng năm tài chính.
3. `$facet` trả đồng thời KPI toàn scope, tổng bốn quý, danh sách project đã lọc/phân trang và total; application service không query hoặc duyệt lại từng project.
4. Số thực tế dùng upsert atomic theo unique index `projectId + fiscalYear + quarter`. Business service xác nhận project scope trước khi ghi.
5. Doanh thu v1 là nguồn chi tiết độc lập, chưa tự suy từ hợp đồng và chưa đồng bộ các snapshot tài chính cũ trên project.
6. Project detail dùng `projectId` để lấy đúng một báo cáo bốn quý; project chưa có actual vẫn được trả về với giá trị 0. Sau khi upsert, Angular chỉ tải lại card doanh thu thay vì tải lại project, task, hợp đồng và membership.
