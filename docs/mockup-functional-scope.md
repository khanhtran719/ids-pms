# Phạm vi chức năng tạm thời từ IDS-PMS-Demo

## Vai trò của tài liệu

Mockup `IDS-PMS-Demo.html` là nguồn tham chiếu nghiệp vụ tạm thời trong lúc chờ khách hàng xác nhận đặc tả chính thức. Mockup giúp chọn thứ tự triển khai và ngôn ngữ giao diện, nhưng không tự động biến dữ liệu minh họa hoặc nhận định trong mockup thành yêu cầu đã chốt.

Nếu mockup mâu thuẫn với yêu cầu mới của khách hàng, yêu cầu mới được ưu tiên và thay đổi cần được ghi lại trong `DECISIONS.md` hoặc tài liệu nghiệp vụ tương ứng.

## Bản đồ màn hình trong mockup

| Màn hình           | Mục đích quan sát được                                                            | Trạng thái triển khai                                                                                                               | Điểm còn phải xác nhận                                                                            |
| ------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Tổng quan          | KPI doanh thu, lợi nhuận, dự án, hợp đồng, task trễ hạn và chất lượng dữ liệu     | Đã triển khai v1 theo project scope: KPI, phân tích quý/trạng thái, top doanh thu, hợp đồng theo nhà mạng và health                 | Công thức, nguồn dữ liệu, thời điểm chốt số và quyền xem số liệu                                  |
| Dự án              | Danh sách, lọc, chi tiết, chủ đầu tư, quy mô, hợp đồng, tiến độ và tài chính      | Đã triển khai profile IDS, tìm kiếm/lọc, KPI, hợp đồng, tiến độ, doanh thu quý, bình luận nội bộ và membership trong chi tiết dự án | Quy tắc mã dự án thiếu, nguồn chuẩn, đồng bộ số tổng và workflow chỉnh sửa/xóa/mention bình luận  |
| Tiến độ thi công   | Theo dõi 5 bước chuẩn, phòng ban, kế hoạch ngày, ngày kết thúc thật và trạng thái | Đã triển khai lát cắt đầu tiên                                                                                                      | Có cho phép thêm/bớt/đổi tên bước hay luôn cố định 5 bước; ai xác nhận hoàn thành                 |
| Hợp đồng nhà mạng  | Hợp đồng theo dự án, nhà mạng, dịch vụ, khối lượng, đơn giá, chu kỳ và hết hạn    | Đã triển khai v1: list/KPI/filter/create/update, filter `projectId` và bảng hợp đồng trong chi tiết dự án                           | Cần chốt loại hợp đồng, vòng đời/gia hạn, chống trùng và cách tính Teldata/IBS                    |
| Doanh thu          | Doanh thu, chi phí, lợi nhuận theo quý và dự án                                   | Đã triển khai v1: KPI năm, so sánh quý, tìm kiếm, phân trang và upsert số thực tế theo dự án/năm/quý                                | Dữ liệu Q4 bất thường, doanh thu một lần/định kỳ, kỳ tài chính, nguồn import và quy trình chốt số |
| Công nợ            | Phải thu, đã thu, còn nợ, quá hạn theo hợp đồng/kỳ                                | Đã triển khai v1: list/KPI/filter/create/update thủ công theo hợp đồng và project scope                                             | File nguồn chưa có hóa đơn, hạn/số đã thu; cần chốt tự sinh kỳ, invoice, duyệt và khóa số         |
| Hoàn vốn           | So sánh CPĐT với doanh thu lũy kế                                                 | Đã triển khai báo cáo read-only v1 theo project scope, năm, kết luận và pagination                                                  | Nhiều dự án thiếu CPĐT; cần chốt CAPEX gồm khoản nào và cách tính hoàn vốn                        |
| Cơ hội kinh doanh  | Pipeline cơ hội theo vùng, giai đoạn, người phụ trách và tính khả thi             | Đã triển khai v1: KPI 4 giai đoạn, list/filter/pagination, create/update và cảnh báo dữ liệu thiếu                                  | Quy tắc chuyển giai đoạn, xác suất, owner, lịch sử hoạt động và chuyển thành project              |
| Chất lượng dữ liệu | Theo dõi mã thiếu, xung đột nguồn, thiếu CAPEX/kế hoạch/ngày thật/owner           | Đã triển khai read-only v1 cho xung đột, CAPEX, tiến độ và CRM thiếu owner/tương tác cuối; chưa có workflow đóng cảnh báo           | Quyền sửa dữ liệu, quy trình đối soát, nguồn ưu tiên và cách đóng cảnh báo                        |

## Contract tạm thời cho tiến độ thi công

Mỗi project có tối đa một task cho mỗi `step` từ 1 đến 5:

1. Hồ sơ thiết kế phê duyệt — mặc định `P.KTDA`.
2. Chuẩn bị vật tư, pháp lý, mặt bằng — mặc định `P.KTDA`.
3. Tổ chức thi công — mặc định `P.KTDA`.
4. Kết nối nhà mạng CĐBR/IBS — mặc định `P.KDHT`.
5. Bàn giao đưa vào VHKT — mặc định `P.KTDA`.

Các trường hiện có: project, bước, tên bước, phòng ban, ngày bắt đầu kế hoạch, ngày kết thúc kế hoạch, ngày kết thúc thực tế và trạng thái.

Quy tắc đang áp dụng:

- Trạng thái API là `todo`, `in_progress`, `done`; dữ liệu mockup `TODO`, `IN_PROGRESS`, `DONE` sẽ được map khi có luồng import.
- Khởi tạo kế hoạch dùng upsert theo cặp `projectId + step`; chạy lại không tạo bản ghi trùng.
- Hệ thống không tự chế ngày kế hoạch từ ngày project. Người có quyền phải nhập ngày sau khi khởi tạo.
- Ngày kết thúc kế hoạch không được trước ngày bắt đầu kế hoạch.
- `done` bắt buộc có ngày kết thúc thực tế; task chưa `done` không được giữ ngày kết thúc thực tế.
- Người có `tasks.read` chỉ thấy task thuộc project họ truy cập được; `projects.manage` có scope toàn bộ.
- Thay đổi task yêu cầu đồng thời `tasks.manage` và `projects.read`.
- Danh sách, thông tin project và KPI được lấy bằng một MongoDB aggregation; không query project riêng cho từng task.

## Contract tạm thời cho project portfolio

- Giữ `status` quản trị hiện có để tương thích dữ liệu/API và bổ sung `operationalStatus`: `not_started`, `in_progress`, `partial`, `operational`.
- Project profile hỗ trợ chủ đầu tư, tỉnh, địa chỉ, loại hình, mô tả quy mô, số căn hộ/đơn vị, m² sàn, ha đất, đơn vị đầu tư, ngày ký và nguồn `Teldata`/`IBS`/`DoanhThu`.
- `dataConflict` đánh dấu bản ghi cần đối soát. Danh sách hỗ trợ lọc có doanh thu, thiếu CPĐT hoặc dữ liệu xung đột.
- `carrierContractCount`, `revenueTotal`, `costTotal`, `capex` hiện là snapshot tổng hợp tùy chọn để hiển thị portfolio; `carrierContractCount` chưa tự đồng bộ với collection hợp đồng v1.
- Tìm kiếm danh sách chạy phía database theo mã, tên hoặc chủ đầu tư và luôn áp dụng trước pagination.

## Contract tạm thời cho hoạt động dự án v1

- Timeline nằm trong chi tiết project và hiện chỉ có hoạt động `comment`; đây là bình luận nội bộ do người dùng chủ động đăng, không phải lịch sử tự động của mọi thay đổi field.
- `GET /api/v1/projects/:projectId/activities` trả mới nhất trước, phân trang tối đa 100 dòng. `POST /api/v1/projects/:projectId/activities/comments` nhận nội dung sau trim, bắt buộc từ 1 đến 2.000 ký tự.
- Người có `projects.read` chỉ đọc/đăng trong project mình truy cập được; `projects.manage` xem toàn bộ. Project không tồn tại và project ngoài scope cùng trả not-found để không lộ dữ liệu.
- Mỗi bình luận lưu `authorId` cùng snapshot tên/email tại thời điểm tạo. Timeline không join user theo từng dòng và không query N+1.
- UI prepend bình luận vừa tạo và chỉ tải các page cũ hơn khi người dùng yêu cầu, không tải lại profile/task/hợp đồng/doanh thu/membership.
- V1 không có sửa, xóa, reaction, mention, moderation, notification hoặc file đính kèm. Cần khách xác nhận quyền và retention/audit policy trước khi bổ sung.

## Ngoài phạm vi của lát cắt hiện tại

- Chưa import dữ liệu Excel/mockup vào MongoDB.
- Chưa tự sinh kế hoạch khi project chuyển trạng thái; hiện người dùng chủ động bấm khởi tạo.
- Chưa có dependency giữa các bước, phần trăm hoàn thành, người được giao, bình luận riêng cho task, file hoặc lịch sử thay đổi tự động.
- Chưa gửi thông báo task trễ hạn.
- Đã có bản ghi hợp đồng nhà mạng, doanh thu/chi phí theo quý, công nợ nhập thủ công, báo cáo hoàn vốn và CRM cơ hội v1. Chưa có workflow phân công/duyệt/đóng cảnh báo chất lượng dữ liệu.

## Giả định tạm thời cho hợp đồng nhà mạng v1

- Dịch vụ gồm `teldata` và `ibs`; đơn vị tương ứng được suy ra là căn hộ và m².
- Đủ điều khoản nghĩa là có đơn giá, chu kỳ thanh toán, ngày bắt đầu và ngày hết hạn.
- Cho phép nhiều bản ghi cùng dự án/nhà mạng/dịch vụ vì chưa chốt quy tắc gia hạn, phụ lục và chống trùng.
- KPI tính trên toàn bộ phạm vi dự án được xem; bộ lọc chỉ ảnh hưởng danh sách và phân trang.
- Chưa import 185 dòng demo và chưa dùng `carrierContractCount` snapshot để sinh ngược hợp đồng.
- Cần xác nhận: mã hợp đồng, trạng thái hiệu lực, phụ lục/gia hạn, tiền tệ/thuế, tỷ lệ khai thác, quyền duyệt và quy tắc xóa.

## Contract tạm thời cho chất lượng dữ liệu v1

- Báo cáo được scope theo project membership; người có `projects.manage` xem toàn portfolio. Endpoint đồng thời yêu cầu `projects.read` và `tasks.read`.
- `data_conflict`: project có `dataConflict=true`; `missing_capex`: project chưa có field `capex`.
- `missing_task_plan`: thiếu một trong 5 bước chuẩn hoặc task hiện có chưa đủ cặp ngày bắt đầu/kết thúc kế hoạch. Mỗi bước thiếu/chưa đủ ngày tính một điểm.
- `overdue_task`: task chưa `done`, có ngày kết thúc kế hoạch và ngày này đã qua tại thời điểm request.
- `missing_actual_end`: task có trạng thái `done` nhưng thiếu ngày kết thúc thực tế; kiểm tra này bảo vệ dữ liệu legacy/import dù API write hiện đã chặn trạng thái đó.
- Summary toàn scope và danh sách lọc/phân trang được tính trong cùng một MongoDB aggregation `$facet`; tìm kiếm theo mã, tên hoặc chủ đầu tư.
- V1 không lưu cảnh báo thành collection riêng, không có assignee, SLA, bình luận, lý do bỏ qua hoặc trạng thái đóng.

## Contract tạm thời cho doanh thu v1

- Số thực tế được lưu theo khóa duy nhất `projectId + fiscalYear + quarter`; ghi lại cùng khóa là cập nhật idempotent, không sinh thêm dòng.
- Mỗi dòng chỉ gồm doanh thu và chi phí không âm. Lợi nhuận gộp được tính bằng `doanh thu - chi phí`; biên lợi nhuận chỉ có khi doanh thu lớn hơn 0.
- Người có `revenue.read` chỉ thấy dữ liệu trong project scope; `projects.manage` có scope toàn bộ. Ghi số liệu yêu cầu `revenue.manage` và project phải thuộc scope.
- KPI toàn năm, tổng từng quý, số dự án có/chưa có doanh thu và danh sách phân trang được trả bằng một MongoDB aggregation `$facet`.
- FY2025 là giá trị mặc định tạm thời trên UI vì mockup đang dùng năm này; API luôn nhận năm tài chính rõ ràng và hỗ trợ nhiều năm.
- Trang chi tiết dự án cho phép chọn năm 2024-2027, xem đủ Q1-Q4 kể cả khi chưa có actual và chỉ hiển thị thao tác cập nhật khi có `revenue.manage`.
- Không suy doanh thu từ đơn giá/chu kỳ hợp đồng, không tự sinh công nợ và chưa đồng bộ snapshot `project.revenueTotal/costTotal`; các luồng này chờ khách xác nhận.
- So sánh Q4 với trung bình ba quý đầu chỉ là gợi ý đối soát, chưa phải quy tắc cảnh báo hoặc kết luận kế toán.

## Contract tạm thời cho công nợ v1

- Mỗi khoản phải thu tham chiếu một hợp đồng nhà mạng; project và nhà mạng được lấy từ hợp đồng tại thời điểm đọc, không cho đổi hợp đồng sau khi tạo.
- Người dùng nhập thủ công kỳ, số phải thu, số đã thu, hạn thanh toán, ngày thu đủ và ghi chú. V1 chưa tự sinh kỳ từ chu kỳ/đơn giá hợp đồng vì công thức chưa được khách xác nhận.
- Trạng thái được dẫn xuất: `unpaid` khi chưa thu, `partial` khi thu một phần và `paid` khi đã thu đủ. Không cho thu âm, thu vượt hoặc đánh dấu thu đủ mà thiếu ngày thu đủ.
- `overdue` chỉ đúng khi còn phải thu và hạn thanh toán đã qua tại thời điểm request. `paidOnTime` chỉ có cho khoản đã thu đủ và so sánh ngày thu đủ với hạn thanh toán.
- `GET /api/v1/receivables` hỗ trợ tìm theo dự án/mã/nhà mạng/kỳ, lọc trạng thái/nhà mạng/project và trả KPI toàn project scope cùng danh sách đã lọc/phân trang bằng một aggregation `$facet`.
- Permission `receivables.read/manage` tách quyền đọc và ghi; người không có `projects.manage` chỉ thấy khoản thuộc project mà mình là thành viên.
- V1 chưa có xóa, mã/số hóa đơn, thuế/tiền tệ, thanh toán nhiều lần thành ledger, file chứng từ, import, chống trùng kỳ, phê duyệt, khóa sổ, nhắc hạn hoặc tự đối soát doanh thu.
- Cần khách xác nhận nguồn chuẩn, timezone chốt quá hạn, điều kiện tính đúng hạn, xử lý giảm trừ/hoàn tiền, một khoản có nhiều lần thu hay không, và quyền sửa số đã khóa.

## Contract tạm thời cho dashboard v1

- `GET /api/v1/dashboard?fiscalYear=YYYY` yêu cầu đồng thời quyền đọc project, task, hợp đồng nhà mạng và doanh thu; dữ liệu luôn theo project membership, trừ người có `projects.manage` được xem toàn portfolio.
- Một MongoDB aggregation xuất phát từ project và dùng `$lookup` có `$group` giới hạn dữ liệu trung gian cho task, hợp đồng và doanh thu; `$facet` trả toàn bộ KPI, quý, trạng thái và xếp hạng trong một response, không query N+1.
- KPI gồm tổng doanh thu/chi phí/lợi nhuận/biên lợi nhuận, dự án có doanh thu, dự án đã vận hành, hợp đồng Teldata/IBS, task quá hạn, project thiếu CAPEX và project xung đột dữ liệu.
- Biểu đồ quý dùng `revenue_actuals` đúng năm; hợp đồng dùng collection chi tiết thay vì snapshot trên project. Task quá hạn được tính tại thời điểm request.
- Luôn trả đủ bốn quý và bốn trạng thái vận hành với giá trị 0 khi chưa có dữ liệu. Top doanh thu giới hạn 8 project; danh sách hợp đồng được gom theo nhà mạng.
- FY2025 là mặc định UI tạm thời theo mockup. Dashboard hiện lấy tổng pipeline CRM toàn cục khi người dùng có `opportunities.read`; số dự án còn tuân theo project scope.
- Đây là dashboard vận hành gần thời gian thực, chưa phải báo cáo kế toán đã khóa kỳ. Công thức, timezone chốt ngày, tiền tệ, quyền xem số nhạy cảm và refresh/cache vẫn phải được khách xác nhận.

## Contract tạm thời cho hoàn vốn v1

- `GET /api/v1/payback?fiscalYear=YYYY` yêu cầu `projects.read` và `revenue.read`, áp dụng project membership; `projects.manage` xem toàn portfolio.
- Doanh thu lũy kế là tổng `revenue_actuals.revenue` của từng project có `fiscalYear` nhỏ hơn hoặc bằng năm được chọn. Không dùng snapshot `project.revenueTotal`.
- Project chỉ đánh giá được khi `capex > 0`; CAPEX thiếu hoặc bằng 0 được tính vào nhóm không đánh giá được và không xuất hiện trong danh sách tỷ lệ để tránh phép chia không hợp lệ.
- Tỷ lệ thu hồi vốn tạm tính bằng `doanh thu lũy kế / CAPEX`. Từ 100% trở lên được gắn `paid_back`; dưới 100% là `not_paid_back`.
- Summary toàn project scope và danh sách đã tìm kiếm/lọc/phân trang được tính trong cùng một MongoDB aggregation `$facet`; `$lookup` doanh thu group ngay trong pipeline để giới hạn dữ liệu trung gian.

## Contract tạm thời cho cơ hội kinh doanh v1

- Bốn giai đoạn bám mockup: tiếp cận thông tin, gửi phương án HTĐT, đã nộp hồ sơ thầu và thống nhất PAHT/trúng thầu. V1 cho phép cập nhật trực tiếp giữa các giai đoạn vì workflow duyệt chưa được chốt.
- Hồ sơ gồm tên, khu vực Bắc/Trung/Nam, tỉnh, chủ đầu tư, loại hình, người phụ trách dạng tên nguồn, quy mô căn hộ/m², tính khả thi, ngày tương tác cuối và ghi chú.
- `ownerName` tạm giữ chuỗi từ nguồn Excel/mockup, chưa liên kết `userId`; không mặc định các tên minh họa là tài khoản hệ thống.
- Permission `opportunities.read` xem toàn pipeline; `opportunities.manage` tạo/cập nhật. CRM v1 chưa scope theo project vì cơ hội tồn tại trước project.
- Overview toàn pipeline, danh sách đã lọc/phân trang và danh mục owner được lấy bằng một MongoDB aggregation `$facet`; tìm kiếm theo tên, chủ đầu tư, tỉnh, loại hình hoặc owner.
- Chưa import 71 dòng mockup, chưa có activity log, xác suất, doanh thu dự kiến, trạng thái thua/hủy, audit lịch sử field, chống trùng hoặc tự chuyển cơ hội thắng thành project.
- Cần khách xác nhận: owner phải là user nào, điều kiện/chủ thể duyệt chuyển giai đoạn, dữ liệu bắt buộc, cách ghi nhận thắng/thua và contract chuyển thành project mà không nhập lại.
- Đây là chỉ báo doanh thu/CAPEX theo mockup, không phải IRR, NPV hay thời gian hoàn vốn theo dòng tiền. Cần khách xác nhận CAPEX gồm khoản nào, có dùng lợi nhuận/dòng tiền ròng thay doanh thu, thuế, kỳ khóa sổ và quy tắc tại đúng 100%.

Các mục trên chỉ được bổ sung sau khi chốt contract tương ứng để tránh khóa hệ thống vào giả định từ dữ liệu minh họa.
