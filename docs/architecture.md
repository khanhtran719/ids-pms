# Kiến trúc triển khai

## Ranh giới chính

- `apps/web`: Angular shell và các feature UI. Component không gọi API trực tiếp.
- `apps/api`: NestJS REST API. Mỗi nghiệp vụ mới là một module độc lập theo domain.
- `libs/api-contracts`: chỉ chứa TypeScript type dùng chung cho envelope ổn định như health, lỗi và pagination; không chứa framework hoặc business logic.
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

1. Angular gắn `X-Request-Id` và `Accept: application/json` cho request `/api/*`.
2. NestJS kiểm tra hoặc sinh request ID an toàn, rồi trả lại trong response header.
3. Helmet, CORS, body limit, validation và throttling chạy trước controller.
4. Exception filter trả một error contract thống nhất; request log chỉ chứa method, path, status, duration và request ID.
5. Mongoose truy cập MongoDB; list query phải có pagination, projection và tránh N+1.
