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

## ADR-010 — Mockup là nguồn yêu cầu tạm thời và Tasks dùng kế hoạch 5 bước idempotent

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-10
- Bối cảnh: khách hàng cho phép tạm thời phân tích và triển khai theo `IDS-PMS-Demo.html`, trong khi nhiều trường project, hợp đồng và số liệu tài chính chưa có contract hoặc dữ liệu nguồn đầy đủ.
- Quyết định: dùng mockup để ưu tiên lát cắt Tiến độ thi công với 5 bước chuẩn. Khởi tạo dùng upsert duy nhất theo `projectId + step`, không tự sinh ngày; `done` bắt buộc có ngày kết thúc thực tế. Trạng thái API chuẩn hóa thành chữ thường và sẽ map từ mã chữ hoa của dữ liệu nguồn khi có luồng import.
- Lý do: triển khai được workflow có giá trị và kiểm soát chất lượng dữ liệu mà không suy diễn lịch, công thức tài chính hoặc điều khoản hợp đồng.
- Hệ quả và trade-off: hiện người dùng chủ động khởi tạo kế hoạch; chưa tự sinh khi project đổi trạng thái. Tên/số bước đang cố định theo mockup và phải được khách xác nhận trước khi mở rộng. Các phần mockup còn lại được theo dõi trong `docs/mockup-functional-scope.md`, không mặc nhiên được coi là đã chốt.

## ADR-011 — Project portfolio IDS tương thích ngược với project lifecycle

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-10
- Bối cảnh: mockup dùng trạng thái vận hành `NOT_STARTED`, `IN_PROGRESS`, `PARTIAL`, `OPERATIONAL`, trong khi API v1 đã có lifecycle quản trị `planning`, `active`, `on_hold`, `completed`, `archived` và dữ liệu/test phụ thuộc contract này.
- Quyết định: giữ `status` quản trị và thêm `operationalStatus` chuẩn hóa chữ thường. Bổ sung project profile IDS cùng các snapshot tổng hợp tùy chọn (`carrierContractCount`, `revenueTotal`, `costTotal`, `capex`) để phục vụ danh sách/chi tiết; query tìm kiếm và lọc chạy trong MongoDB trước pagination. Trang chi tiết lấy kế hoạch 5 bước bằng một request theo project, không gọi từng task.
- Lý do: bám giao diện/ngôn ngữ nghiệp vụ của mockup mà không đổi nghĩa contract đang chạy hoặc giả định snapshot là dữ liệu kế toán chính thức.
- Hệ quả và trade-off: cần chốt mapping/import dữ liệu chữ hoa và chính sách cho dự án thiếu mã. Khi module hợp đồng/tài chính được triển khai, các snapshot phải được tính hoặc đồng bộ từ nguồn chi tiết thay vì nhập rời rạc lâu dài.

## ADR-012 — Cảnh báo chất lượng dữ liệu được tính theo thời điểm đọc

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-11
- Bối cảnh: mockup cần theo dõi dữ liệu thiếu/xung đột, nhưng khách chưa chốt quy trình phân công, duyệt, đóng hoặc bỏ qua cảnh báo.
- Quyết định: Data Quality v1 chỉ đọc và tính cảnh báo trực tiếp từ project/task trong một MongoDB aggregation. Một project bị cảnh báo khi có `dataConflict`, thiếu `capex`, thiếu bước/ngày kế hoạch trong kế hoạch 5 bước, task chưa hoàn thành đã quá `plannedEndDate`, hoặc task hoàn thành thiếu `actualEndDate`. Response gồm summary toàn scope và danh sách cảnh báo đã lọc/phân trang trong cùng request.
- Lý do: có giá trị đối soát ngay, không tạo collection trạng thái dễ lệch nguồn và tránh hai round trip/N+1 cho một màn hình.
- Hệ quả và trade-off: kết quả phụ thuộc thời điểm request; task quá hạn có thể thay đổi qua ngày mà không có write event. Chưa có assignee, lịch sử xử lý, lý do bỏ qua hay trạng thái đóng cảnh báo. Nếu khách chốt workflow, bổ sung entity riêng và ADR mới thay vì biến dữ liệu dẫn xuất hiện tại thành workflow ngầm.

## ADR-013 — Hợp đồng nhà mạng là collection nguồn độc lập

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-14
- Bối cảnh: mockup biểu diễn 185 hợp đồng theo dự án/nhà mạng/dịch vụ nhưng dữ liệu điều khoản và quy tắc gia hạn chưa được khách xác nhận.
- Quyết định: tạo collection `carrier_contracts` độc lập, scope theo project membership. Teldata dùng đơn vị căn hộ, IBS dùng m²; các điều khoản được phép để trống. List, KPI và danh mục filter trả trong một aggregation `$facet`.
- Lý do: tạo nguồn dữ liệu chi tiết có thể phát triển tiếp, tránh nhúng mảng tăng trưởng vào project và tránh N+1 cho màn hình portfolio.
- Hệ quả và trade-off: chưa chống trùng, chưa xóa/duyệt/import và chưa đồng bộ `project.carrierContractCount`. Các quyết định này chờ khách xác nhận thay vì khóa cứng vào v1.

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
