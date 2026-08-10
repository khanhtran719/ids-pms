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

## ADR-008 — Phiên đăng nhập JWT ngắn hạn và refresh cookie xoay vòng

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Bối cảnh: SPA cần khôi phục phiên thuận tiện nhưng không được lưu bearer token dài hạn trong Web Storage; API cũng cần thu hồi phiên và RBAC ngay từ module đầu tiên.
- Quyết định: đăng nhập bằng email/mật khẩu; access JWT sống ngắn và chỉ giữ trong bộ nhớ Angular; refresh token ngẫu nhiên nằm trong cookie `HttpOnly`, `SameSite=Strict`, được hash trong MongoDB và xoay vòng một lần mỗi lần refresh. Backend áp dụng RBAC theo permission; vai trò khởi đầu là `admin`, `manager`, `member`.
- Lý do: giảm phạm vi ảnh hưởng của XSS lên credential dài hạn, cho phép thu hồi/logout phía server và giữ REST contract đơn giản.
- Hệ quả và trade-off: reload trang cần gọi refresh để khôi phục access token; endpoint dùng cookie bắt buộc có `X-CSRF-Protection`; production phải bật cookie `Secure` và giữ CORS allowlist. Thay đổi role có thể mất tối đa TTL access token để phản ánh trên token đã phát hành.

## ADR-009 — Project authorization kết hợp global permission và membership

- Trạng thái: Accepted
- Ngày: 2026-08-10
- Bối cảnh: quản trị hệ thống cần nhìn toàn bộ portfolio, trong khi người dùng nghiệp vụ chỉ được truy cập project được giao và một project luôn cần người chịu trách nhiệm cuối cùng.
- Quyết định: `projects.manage` cấp quyền quản trị toàn cục; ngoài ra membership `owner`/`manager` được quản trị project cụ thể, còn `member` chỉ đọc. Creator được tạo thành owner trong cùng transaction với project. Mọi thay đổi membership phải giữ lại ít nhất một owner.
- Lý do: scope dữ liệu rõ ràng ở backend, hỗ trợ phân quyền theo dự án mà không nhân bản global role, đồng thời tránh project mất người sở hữu do cập nhật đồng thời.
- Hệ quả và trade-off: MongoDB local/production phải hỗ trợ transaction; query list cần join logic theo membership nhưng phải thực hiện theo tập thay vì N+1. Nếu khách yêu cầu quyền chi tiết hơn theo từng hành động, mở rộng permission matrix trong ADR riêng.

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
