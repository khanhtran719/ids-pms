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
