# Phạm vi chức năng tạm thời từ IDS-PMS-Demo

## Vai trò của tài liệu

Mockup `IDS-PMS-Demo.html` là nguồn tham chiếu nghiệp vụ tạm thời trong lúc chờ khách hàng xác nhận đặc tả chính thức. Mockup giúp chọn thứ tự triển khai và ngôn ngữ giao diện, nhưng không tự động biến dữ liệu minh họa hoặc nhận định trong mockup thành yêu cầu đã chốt.

Nếu mockup mâu thuẫn với yêu cầu mới của khách hàng, yêu cầu mới được ưu tiên và thay đổi cần được ghi lại trong `DECISIONS.md` hoặc tài liệu nghiệp vụ tương ứng.

## Bản đồ màn hình trong mockup

| Màn hình           | Mục đích quan sát được                                                            | Trạng thái triển khai                                                                                                                                     | Điểm còn phải xác nhận                                                                            |
| ------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Tổng quan          | KPI doanh thu, lợi nhuận, dự án, hợp đồng, task trễ hạn và chất lượng dữ liệu     | Đã triển khai v1 theo project scope: KPI, phân tích quý/trạng thái, top doanh thu, hợp đồng theo nhà mạng và health                                       | Công thức, nguồn dữ liệu, thời điểm chốt số và quyền xem số liệu                                  |
| Dự án              | Danh sách, lọc, chi tiết, chủ đầu tư, quy mô, hợp đồng, tiến độ và tài chính      | Đã triển khai profile IDS, tìm kiếm/lọc, KPI tổng hợp, hợp đồng nhà mạng, tiến độ và membership; doanh thu có trang riêng, chưa gắn bảng quý vào chi tiết | Quy tắc mã dự án thiếu, nguồn chuẩn, cách đồng bộ số hợp đồng/doanh thu/chi phí/CPĐT              |
| Tiến độ thi công   | Theo dõi 5 bước chuẩn, phòng ban, kế hoạch ngày, ngày kết thúc thật và trạng thái | Đã triển khai lát cắt đầu tiên                                                                                                                            | Có cho phép thêm/bớt/đổi tên bước hay luôn cố định 5 bước; ai xác nhận hoàn thành                 |
| Hợp đồng nhà mạng  | Hợp đồng theo dự án, nhà mạng, dịch vụ, khối lượng, đơn giá, chu kỳ và hết hạn    | Đã triển khai v1: list/KPI/filter/create/update, filter `projectId` và bảng hợp đồng trong chi tiết dự án                                                 | Cần chốt loại hợp đồng, vòng đời/gia hạn, chống trùng và cách tính Teldata/IBS                    |
| Doanh thu          | Doanh thu, chi phí, lợi nhuận theo quý và dự án                                   | Đã triển khai v1: KPI năm, so sánh quý, tìm kiếm, phân trang và upsert số thực tế theo dự án/năm/quý                                                      | Dữ liệu Q4 bất thường, doanh thu một lần/định kỳ, kỳ tài chính, nguồn import và quy trình chốt số |
| Công nợ            | Phải thu, đã thu, còn nợ, quá hạn theo hợp đồng/kỳ                                | Chưa triển khai                                                                                                                                           | Mockup xác nhận file nguồn chưa có hóa đơn, hạn thanh toán và số đã thu                           |
| Hoàn vốn           | So sánh CPĐT với doanh thu lũy kế                                                 | Chưa triển khai                                                                                                                                           | Nhiều dự án thiếu CPĐT; cần chốt CAPEX gồm khoản nào và cách tính hoàn vốn                        |
| Cơ hội kinh doanh  | Pipeline cơ hội theo vùng, giai đoạn, người phụ trách và tính khả thi             | Chưa triển khai                                                                                                                                           | Quy tắc chuyển giai đoạn, xác suất, owner, lịch sử hoạt động và chuyển thành project              |
| Chất lượng dữ liệu | Theo dõi mã thiếu, xung đột nguồn, thiếu CAPEX/kế hoạch/ngày thật/owner           | Đã triển khai dashboard read-only v1 cho xung đột, CAPEX và tiến độ; chưa có mã thiếu/owner do invariant hiện tại                                         | Quyền sửa dữ liệu, quy trình đối soát, nguồn ưu tiên và cách đóng cảnh báo                        |

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

## Ngoài phạm vi của lát cắt hiện tại

- Chưa import dữ liệu Excel/mockup vào MongoDB.
- Chưa tự sinh kế hoạch khi project chuyển trạng thái; hiện người dùng chủ động bấm khởi tạo.
- Chưa có dependency giữa các bước, phần trăm hoàn thành, người được giao, bình luận, file hoặc lịch sử thay đổi.
- Chưa gửi thông báo task trễ hạn.
- Đã có bản ghi hợp đồng nhà mạng và doanh thu/chi phí theo quý v1. Chưa triển khai công nợ, hoàn vốn, CRM hoặc workflow phân công/duyệt/đóng cảnh báo chất lượng dữ liệu.

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

## Contract tạm thời cho dashboard v1

- `GET /api/v1/dashboard?fiscalYear=YYYY` yêu cầu đồng thời quyền đọc project, task, hợp đồng nhà mạng và doanh thu; dữ liệu luôn theo project membership, trừ người có `projects.manage` được xem toàn portfolio.
- Một MongoDB aggregation xuất phát từ project và dùng `$lookup` có `$group` giới hạn dữ liệu trung gian cho task, hợp đồng và doanh thu; `$facet` trả toàn bộ KPI, quý, trạng thái và xếp hạng trong một response, không query N+1.
- KPI gồm tổng doanh thu/chi phí/lợi nhuận/biên lợi nhuận, dự án có doanh thu, dự án đã vận hành, hợp đồng Teldata/IBS, task quá hạn, project thiếu CAPEX và project xung đột dữ liệu.
- Biểu đồ quý dùng `revenue_actuals` đúng năm; hợp đồng dùng collection chi tiết thay vì snapshot trên project. Task quá hạn được tính tại thời điểm request.
- Luôn trả đủ bốn quý và bốn trạng thái vận hành với giá trị 0 khi chưa có dữ liệu. Top doanh thu giới hạn 8 project; danh sách hợp đồng được gom theo nhà mạng.
- FY2025 là mặc định UI tạm thời theo mockup. Cơ hội kinh doanh không xuất hiện trên Dashboard v1 vì CRM/opportunity chưa có contract và nguồn dữ liệu.
- Đây là dashboard vận hành gần thời gian thực, chưa phải báo cáo kế toán đã khóa kỳ. Công thức, timezone chốt ngày, tiền tệ, quyền xem số nhạy cảm và refresh/cache vẫn phải được khách xác nhận.

Các mục trên chỉ được bổ sung sau khi chốt contract tương ứng để tránh khóa hệ thống vào giả định từ dữ liệu minh họa.
