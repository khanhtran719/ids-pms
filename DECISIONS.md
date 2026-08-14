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

## ADR-014 — Doanh thu thực tế lưu độc lập theo dự án, năm và quý

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-14
- Bối cảnh: mockup có doanh thu/chi phí FY2025 theo bốn quý và nhận định Q4 bất thường, nhưng chưa có quy tắc ghi nhận doanh thu định kỳ/một lần, nguồn import hay quy trình chốt số.
- Quyết định: tạo collection `revenue_actuals` với unique key `projectId + fiscalYear + quarter`; mỗi bản ghi lưu doanh thu và chi phí thực tế không âm. Lợi nhuận/biên được dẫn xuất khi đọc. Báo cáo scope theo project membership và trả KPI, tổng quý cùng danh sách bằng một aggregation `$facet`. UI mặc định FY2025 theo mockup nhưng API nhận năm rõ ràng.
- Lý do: tạo nguồn chi tiết có thể đối soát và hỗ trợ nhiều năm mà không khóa dữ liệu vào bốn field trên project; upsert phù hợp cả nhập tay lẫn import idempotent sau này.
- Hệ quả và trade-off: chưa tự tính từ hợp đồng, chưa sinh công nợ, chưa có trạng thái nháp/duyệt/khóa kỳ, tiền tệ/thuế, import hay audit history ngoài actor/timestamps. Chưa đồng bộ `project.revenueTotal/costTotal`; so sánh Q4 chỉ là thông tin cần xác nhận, không phải kết luận kế toán.

## ADR-015 — Dashboard v1 tổng hợp trực tiếp từ các nguồn nghiệp vụ

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-14
- Bối cảnh: mockup cần một màn hình tổng quan nhưng khách chưa chốt công thức báo cáo, kỳ khóa sổ, CRM cơ hội hay chính sách cache. Các nguồn project, task, hợp đồng và doanh thu v1 đã đủ để tạo lát cắt vận hành có ích.
- Quyết định: Dashboard v1 nhận năm tài chính rõ ràng và tổng hợp trực tiếp trong một MongoDB aggregation theo project scope. Các `$lookup` chỉ giữ kết quả đã group theo project; `$facet` trả KPI, bốn quý, bốn trạng thái, top 8 dự án theo doanh thu và số hợp đồng theo nhà mạng. Endpoint dùng các permission đọc hiện có, không tạo permission dashboard mới. Health vẫn là request độc lập vì là dữ liệu hạ tầng, không phải nghiệp vụ.
- Lý do: một snapshot nhất quán giảm round trip, tránh N+1 và không tạo collection tổng hợp có nguy cơ lệch nguồn khi workflow cập nhật/chốt số chưa tồn tại.
- Hệ quả và trade-off: truy vấn đọc nhiều collection và chưa có cache/materialized view; cần đo hiệu năng khi dữ liệu thật tăng. Dashboard chưa có opportunity, công nợ, hoàn vốn hoặc số đã khóa kỳ. FY2025 và các KPI hiện tại là contract tạm theo mockup, phải điều chỉnh sau khi khách xác nhận.

## ADR-016 — Hoàn vốn v1 là chỉ báo read-only từ doanh thu lũy kế và CAPEX

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-14
- Bối cảnh: mockup so sánh doanh thu với Tổng CPĐT nhưng nhiều project thiếu CAPEX và khách chưa chốt định nghĩa đầu tư, dòng tiền, thuế hoặc kỳ khóa sổ. Collection doanh thu theo năm/quý hiện đã đủ để cung cấp một chỉ báo tạm thời có thể đối soát.
- Quyết định: báo cáo nhận một năm tài chính, cộng doanh thu thực tế của mọi năm nhỏ hơn hoặc bằng năm đó và chia cho `project.capex` khi CAPEX lớn hơn 0. Tỷ lệ từ 100% trở lên tạm coi đã hoàn vốn. Một aggregation theo project scope trả summary cùng danh sách lọc/phân trang; không lưu kết quả dẫn xuất và không tạo permission mới.
- Lý do: bám mockup và tái sử dụng nguồn dữ liệu hiện có mà không tạo workflow tài chính giả định hoặc dữ liệu tổng hợp dễ lệch nguồn.
- Hệ quả và trade-off: kết quả là tỷ lệ doanh thu/CAPEX, không phản ánh chi phí vận hành, dòng tiền ròng, giá trị thời gian của tiền, IRR/NPV hoặc thời gian hoàn vốn thực tế. Project thiếu/0 CAPEX không đánh giá được. Công thức phải được thay thế hoặc mở rộng khi khách chốt nghiệp vụ kế toán.

## ADR-017 — CRM v1 lưu hồ sơ cơ hội độc lập và chưa tự chuyển thành project

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-14
- Bối cảnh: mockup có 71 cơ hội ở bốn giai đoạn nhưng dữ liệu cũ không giữ liên kết khi thắng thầu, owner chỉ là tên tự do và khách chưa chốt xác suất, lịch sử hoạt động hay quy tắc chuyển giai đoạn.
- Quyết định: tạo collection `opportunities` độc lập với bốn giai đoạn cố định theo mockup. V1 quản lý hồ sơ, lọc/phân trang, tính KPI và cho phép cập nhật trực tiếp giai đoạn; `ownerName` là chuỗi nguồn tạm thời. Dùng permission toàn cục `opportunities.read/manage`; chưa tạo project hoặc xóa cơ hội khi đạt giai đoạn 4.
- Lý do: giữ được pipeline và dữ liệu cơ hội qua các giai đoạn mà không giả định workflow chưa được xác nhận. Collection độc lập phù hợp vì cơ hội tồn tại trước project và tránh nhúng danh sách tăng trưởng vào entity khác.
- Hệ quả và trade-off: chưa có win/loss rate, xác suất, giá trị dự kiến, activity log, user assignment chuẩn, chống trùng hoặc conversion transaction. Khi khách chốt conversion, bổ sung liên kết `convertedProjectId`, lịch sử trạng thái và transaction trong ADR mới; không tái sử dụng `ownerName` như định danh user.

## ADR-018 — Báo cáo chéo đọc CRM bằng lookup có điều kiện sau facet

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-14
- Bối cảnh: Dashboard và Chất lượng dữ liệu cần phản ánh nguồn CRM mới nhưng không được tăng request phía client, chạy query theo từng project hoặc làm lộ pipeline cho tài khoản thiếu quyền CRM.
- Quyết định: hai báo cáo giữ một endpoint và một aggregation. Phần project được scope/tổng hợp trước bằng `$facet`; khi token có `opportunities.read`, một `$lookup` không tương quan chạy sau `$facet` để tính overview pipeline hoặc số hồ sơ thiếu `ownerName`/`lastInteractionDate`. Nếu thiếu quyền, stage và field CRM được bỏ hoàn toàn khỏi response.
- Lý do: giữ snapshot màn hình trong một round trip, lookup chỉ chạy một lần thay vì theo từng project, tái sử dụng collection nguồn và thực thi permission tại backend.
- Hệ quả và trade-off: KPI project có membership scope còn CRM hiện là scope toàn cục theo ADR-017 nên UI phải ghi nhận đây là hai phạm vi khác nhau. Aggregation đọc thêm collection; cần đo `explain` và cân nhắc cache/materialized reporting khi dữ liệu thật đủ lớn.

## ADR-019 — Hoạt động dự án v1 là bình luận nội bộ bất biến

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-14
- Bối cảnh: khách cho phép tiếp tục bám UI mockup nhưng chưa chốt workflow cộng tác, chỉnh sửa/xóa, mention, file đính kèm hoặc notification. Trang chi tiết dự án vẫn cần một nơi ghi nhận cập nhật vận hành có tác giả và thời gian rõ ràng.
- Quyết định: tạo collection `project_activities` độc lập; v1 chỉ có type `comment` và không có API sửa/xóa. Người có `projects.read` cùng quyền truy cập project được đọc/đăng; `projects.manage` có scope toàn bộ. Mỗi bản ghi snapshot `authorId`, tên và email tại thời điểm tạo. List xuất phát từ project, kiểm tra membership rồi lookup timeline đã sort/phân trang trong một aggregation.
- Lý do: cung cấp nhật ký cộng tác tối thiểu nhưng không khóa vào workflow chưa chốt; dữ liệu bất biến giữ ngữ cảnh audit, author snapshot loại bỏ join user trên từng dòng và truy vấn theo project tránh N+1.
- Hệ quả và trade-off: tên/email cũ không đổi khi hồ sơ user thay đổi; chưa phải audit history tự động của project/task và không dùng lại cho activity log của CRM. Chỉnh sửa/xóa, moderation, mention, notification, file và retention policy phải được khách xác nhận trước khi mở rộng contract.

## ADR-020 — Công nợ v1 nhập thủ công và dẫn xuất trạng thái khi đọc

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-14
- Bối cảnh: mockup cần KPI phải thu/đã thu/còn lại/quá hạn nhưng chính mockup xác nhận file nguồn chưa có hóa đơn, hạn thanh toán hoặc số đã thu. Khách chưa chốt cách sinh kỳ từ hợp đồng, một hay nhiều lần thu, thuế/tiền tệ, phê duyệt hoặc khóa sổ.
- Quyết định: tạo collection `receivables` tham chiếu `carrierContractId` và `projectId`; v1 chỉ nhập/cập nhật thủ công kỳ, số phải thu, số đã thu, hạn, ngày thu đủ và ghi chú. Trạng thái, số còn lại, quá hạn và đúng hạn không lưu bản sao mà được dẫn xuất trong một aggregation theo project scope. Dùng permission `receivables.read/manage`; không có API xóa hoặc tự sinh kỳ.
- Lý do: cung cấp lát cắt có thể sử dụng và đối soát ngay mà không phát minh workflow tài chính chưa được xác nhận. Tham chiếu hợp đồng giữ ngữ cảnh dự án/nhà mạng, còn một `$facet` trả danh sách, KPI, total và nhà mạng trong một query để tránh N+1.
- Hệ quả và trade-off: `amountPaid` hiện là snapshot tổng thay vì ledger nhiều lần thu; chưa có invoice, giảm trừ/hoàn tiền, chứng từ, import, chống trùng kỳ, audit từng lần thay đổi, duyệt/khóa hoặc notification. Nếu khách yêu cầu payment ledger hay auto-generation, phải bổ sung contract/migration và ADR mới thay vì suy diễn từ v1.

## ADR-021 — UAT self-hosted bằng Docker Compose và seed demo có guard

- Trạng thái: Accepted, temporary
- Ngày: 2026-08-14
- Bối cảnh: cần sớm có một môi trường cho khách kiểm thử sơ bộ nhưng chưa có thông tin hạ tầng cloud, domain/TLS hoặc dịch vụ lưu file. Dữ liệu mẫu phải đủ để quan sát các module đã triển khai mà không gây trùng hoặc ghi đè chỉnh sửa trong các lần seed sau.
- Quyết định: đóng gói Angular/Nginx, NestJS và MongoDB replica set một node bằng `compose.uat.yaml`. Chỉ Nginx mở cổng host; API và MongoDB nằm trên network nội bộ, database cùng upload local dùng named volume. HTTPS được kết thúc tại reverse proxy/load balancer bên ngoài compose. Seed demo chạy tách khỏi bootstrap ứng dụng, chỉ chấp nhận database có hậu tố `_uat`/`_demo` và chuỗi xác nhận chính xác `seed:<database>`; dữ liệu dùng khóa ổn định cùng `$setOnInsert` nên lần chạy sau không sửa bản ghi đã tồn tại.
- Lý do: một máy Linux có Docker là đủ để dựng UAT lặp lại, giảm khác biệt môi trường và chưa khóa dự án vào nhà cung cấp cloud. Guard nhiều lớp và upsert insert-only giảm rủi ro chạy nhầm hoặc mất thay đổi do khách nhập thử; repository seed gom thao tác theo collection để tránh N+1.
- Hệ quả và trade-off: replica set một node và local volume không phải thiết kế production có HA; backup, giám sát, TLS certificate, DNS và off-site storage vẫn phải được chốt trước production. Seed yêu cầu tài khoản admin đã được bootstrap từ `SEED_ADMIN_*`; thay đổi bộ demo sau này cần giữ khóa cũ hoặc có chiến lược version riêng, không được biến seed thành migration dữ liệu khách.

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
