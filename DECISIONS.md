# IDS PMS — Architecture Decisions

Tài liệu này ghi lại các quyết định dài hạn. Không dùng nó thay cho session log.

## ADR-001 — Nx monorepo

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Quyết định: đặt Angular, NestJS và e2e projects trong một Nx workspace.
- Lý do: chia sẻ tooling, chạy test/build thống nhất và dễ tách library theo domain khi hệ thống lớn lên.

## ADR-002 — Angular thay cho AngularJS

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Quyết định: dùng Angular hiện đại; không dùng AngularJS 1.x.
- Lý do: codebase mới cần nền tảng còn được duy trì, typed và có hệ sinh thái testing hiện đại.

## ADR-003 — NestJS + Mongoose + REST/OpenAPI

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Quyết định: backend dùng NestJS, Mongoose và REST API có Swagger.
- Lý do: Mongoose phù hợp trực tiếp với MongoDB; REST đơn giản hơn cho giai đoạn yêu cầu còn đang xác nhận.
- Hệ quả: GraphQL chưa được đưa vào. Nếu phát sinh use case đủ mạnh, tạo ADR mới thay vì thêm song song tùy ý.

## ADR-004 — MongoDB local chạy replica set

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Quyết định: Docker Compose chạy MongoDB một node với replica set `rs0`.
- Lý do: môi trường local phải kiểm tra được transaction cho các workflow nhiều collection.

## ADR-005 — Local file storage trước cloud storage

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-10
- Quyết định: file lưu dưới `storage/uploads` qua storage abstraction.
- Lý do: khách hàng chưa chốt chức năng file và hạ tầng S3/MinIO.
- Hệ quả: business logic không được phụ thuộc trực tiếp vào filesystem path.

## ADR-006 — AI session logs chỉ tồn tại local

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Quyết định: state và log phiên AI lưu dưới `.ai-work/`; Git ignore toàn bộ thư mục.
- Lý do: hỗ trợ bàn giao ngữ cảnh giữa các phiên mà không đưa nội dung vận hành, prompt hoặc thông tin có thể nhạy cảm lên repository.
- Hệ quả: tài liệu quy trình và logging tool được commit; log được tạo ra thì không.

## ADR-007 — Foundation API an toàn và contract dùng chung tối thiểu

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Quyết định: API dùng request ID, error envelope thống nhất, structured metadata log, typed environment validation, liveness/readiness probe, giới hạn body và rate limit mặc định. Các envelope health/error/pagination được chia sẻ qua `libs/api-contracts`.
- Lý do: tạo baseline vận hành và contract ổn định trước khi thêm module nghiệp vụ; giảm sai lệch type giữa Angular và NestJS.
- Hệ quả: OpenAPI vẫn là nguồn chuẩn cho endpoint/DTO nghiệp vụ. Shared contracts không được chứa framework hoặc business logic; e2e phải dùng database `_test` riêng.

## Mẫu ADR mới

```text
## ADR-NNN — Tên quyết định

- Trạng thái: Proposed | Accepted | Superseded | Rejected
- Ngày: YYYY-MM-DD
- Bối cảnh:
- Quyết định:
- Lý do:
- Hệ quả và trade-off:
```
