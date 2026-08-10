# Quy ước API

## Endpoint và version

- Public API nằm dưới `/api/v1`.
- Swagger UI/JSON ở `/api/docs` và `/api/docs-json` khi `ENABLE_SWAGGER=true`.
- Swagger mặc định tắt trong production.

## Error contract

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": { "errors": ["name should not be empty"] },
  "path": "/api/v1/projects",
  "requestId": "client-request-123",
  "timestamp": "2026-08-10T00:00:00.000Z"
}
```

Không trả stack trace, database message hoặc secret ra client. `code` là giá trị ổn định cho frontend; `message` có thể dùng để hiển thị nếu đã được kiểm soát.

## Pagination

- Mặc định `page=1`, `limit=20`; giới hạn tối đa 100.
- Response list dùng `{ data, meta }` với `page`, `limit`, `totalItems`, `totalPages`, `hasNextPage`, `hasPreviousPage`.
- Sort phải xác định rõ và ổn định; query lớn cần index tương ứng.

## Contract frontend

OpenAPI từ NestJS là nguồn chuẩn cho endpoint/DTO. `libs/api-contracts` chỉ giữ các envelope nền tảng dùng ở cả hai phía. Khi bắt đầu có nhiều module nghiệp vụ, sinh Angular API client từ OpenAPI trong một thay đổi riêng; không viết đồng thời GraphQL và REST cho cùng use case.

## Authentication và authorization

- `POST /api/v1/auth/login`: email/password, trả access token và user; đặt refresh cookie.
- `POST /api/v1/auth/refresh`: tiêu thụ refresh session hiện tại, xoay cookie và trả access token mới.
- `POST /api/v1/auth/logout`: thu hồi refresh session và xóa cookie.
- `GET /api/v1/auth/me`: yêu cầu `Authorization: Bearer <access-token>`.
- `GET/POST /api/v1/users`: yêu cầu lần lượt `users.read`/`users.manage`.

Access token không lưu trong Web Storage. Refresh cookie là `HttpOnly`, `SameSite=Strict`, giới hạn path `/api/v1/auth` và phải `Secure` trên HTTPS. Mọi request thay đổi trạng thái tới `/api/*` gửi `X-CSRF-Protection: 1`; login/refresh/logout từ chối nếu thiếu header này. Response không bao giờ chứa password hash hoặc refresh token.

## Projects và membership

- `GET/POST /api/v1/projects`: danh sách theo scope và tạo project.
- `GET/PATCH /api/v1/projects/:projectId`: chi tiết và cập nhật project.
- `GET /api/v1/projects/:projectId/members`: danh sách thành viên đã join thông tin user bằng aggregate.
- `GET /api/v1/projects/:projectId/member-candidates`: thư mục user active có search và giới hạn tối đa.
- `POST /api/v1/projects/:projectId/members`: thêm mới hoặc cập nhật vai trò membership.
- `DELETE /api/v1/projects/:projectId/members/:userId`: xóa membership nếu không vi phạm owner cuối cùng.

`GET /projects` hỗ trợ `page`, `limit`, `search`, `status`, `operationalStatus` và `dataQuality`. `search` tìm theo mã, tên hoặc chủ đầu tư; `dataQuality` nhận `has_revenue`, `missing_capex`, `conflict`. Query luôn chạy phía MongoDB trước pagination, không tải collection về lọc trong application memory.

Project code được trim và chuẩn hóa uppercase. `status` quản trị hợp lệ là `planning`, `active`, `on_hold`, `completed`, `archived`; `operationalStatus` theo mockup IDS là `not_started`, `in_progress`, `partial`, `operational`. Project profile có các field tùy chọn cho chủ đầu tư, tỉnh/địa chỉ, loại hình, quy mô, nguồn dữ liệu và các chỉ số portfolio tổng hợp. Membership role là `owner`, `manager`, `member`. `startDate` không được sau `dueDate`. Các mã lỗi ổn định gồm `PROJECT_CODE_EXISTS`, `PROJECT_NOT_FOUND`, `PROJECT_MANAGEMENT_FORBIDDEN`, `PROJECT_MEMBER_USER_NOT_FOUND`, `PROJECT_MEMBERSHIP_NOT_FOUND` và `PROJECT_LAST_OWNER_REQUIRED`.

## Tasks và tiến độ thi công

- `GET /api/v1/tasks`: danh sách task được scope theo project membership, hỗ trợ `page`, `limit`, `projectId`, `status`; response có thêm `overview`.
- `POST /api/v1/projects/:projectId/tasks/initialize`: upsert idempotent 5 bước chuẩn còn thiếu, không tự sinh ngày kế hoạch.
- `PATCH /api/v1/tasks/:taskId`: cập nhật phòng ban, ngày kế hoạch, ngày kết thúc thực tế và trạng thái.

Task status là `todo`, `in_progress`, `done`. `plannedEndDate` không được trước `plannedStartDate`; `done` bắt buộc có `actualEndDate` và trạng thái khác `done` không được giữ ngày này. Các mã lỗi ổn định gồm `TASK_NOT_FOUND`, `TASK_DATE_INVALID`, `TASK_DATE_RANGE_INVALID`, `TASK_ACTUAL_END_REQUIRED` và `TASK_ACTUAL_END_STATUS_INVALID`.
