# Phạm vi chức năng tạm thời từ IDS-PMS-Demo

## Vai trò của tài liệu

Mockup `IDS-PMS-Demo.html` là nguồn tham chiếu nghiệp vụ tạm thời trong lúc chờ khách hàng xác nhận đặc tả chính thức. Mockup giúp chọn thứ tự triển khai và ngôn ngữ giao diện, nhưng không tự động biến dữ liệu minh họa hoặc nhận định trong mockup thành yêu cầu đã chốt.

Nếu mockup mâu thuẫn với yêu cầu mới của khách hàng, yêu cầu mới được ưu tiên và thay đổi cần được ghi lại trong `DECISIONS.md` hoặc tài liệu nghiệp vụ tương ứng.

## Bản đồ màn hình trong mockup

| Màn hình | Mục đích quan sát được | Trạng thái triển khai | Điểm còn phải xác nhận |
| --- | --- | --- | --- |
| Tổng quan | KPI doanh thu, lợi nhuận, dự án, hợp đồng, task trễ hạn và chất lượng dữ liệu | Chưa triển khai KPI nghiệp vụ; dashboard kỹ thuật đã có | Công thức, nguồn dữ liệu, thời điểm chốt số và quyền xem số liệu |
| Dự án | Danh sách, lọc, chi tiết, chủ đầu tư, quy mô, hợp đồng, tiến độ và tài chính | Đã triển khai profile IDS, tìm kiếm/lọc, KPI tổng hợp, tiến độ và membership; hợp đồng/tài chính chi tiết chưa có | Quy tắc mã dự án thiếu, nguồn chuẩn, cách đồng bộ số hợp đồng/doanh thu/chi phí/CPĐT |
| Tiến độ thi công | Theo dõi 5 bước chuẩn, phòng ban, kế hoạch ngày, ngày kết thúc thật và trạng thái | Đã triển khai lát cắt đầu tiên | Có cho phép thêm/bớt/đổi tên bước hay luôn cố định 5 bước; ai xác nhận hoàn thành |
| Hợp đồng nhà mạng | Hợp đồng theo dự án, nhà mạng, dịch vụ, khối lượng, đơn giá, chu kỳ và hết hạn | Chưa triển khai | Dữ liệu điều khoản hiện thiếu; cần chốt loại hợp đồng và cách tính Teldata/IBS |
| Doanh thu | Doanh thu, chi phí, lợi nhuận theo quý và dự án | Chưa triển khai | Dữ liệu Q4 bất thường, doanh thu một lần/định kỳ, kỳ tài chính và cách ghi nhận |
| Công nợ | Phải thu, đã thu, còn nợ, quá hạn theo hợp đồng/kỳ | Chưa triển khai | Mockup xác nhận file nguồn chưa có hóa đơn, hạn thanh toán và số đã thu |
| Hoàn vốn | So sánh CPĐT với doanh thu lũy kế | Chưa triển khai | Nhiều dự án thiếu CPĐT; cần chốt CAPEX gồm khoản nào và cách tính hoàn vốn |
| Cơ hội kinh doanh | Pipeline cơ hội theo vùng, giai đoạn, người phụ trách và tính khả thi | Chưa triển khai | Quy tắc chuyển giai đoạn, xác suất, owner, lịch sử hoạt động và chuyển thành project |
| Chất lượng dữ liệu | Theo dõi mã thiếu, xung đột nguồn, thiếu CAPEX/kế hoạch/ngày thật/owner | Đã triển khai dashboard read-only v1 cho xung đột, CAPEX và tiến độ; chưa có mã thiếu/owner do invariant hiện tại | Quyền sửa dữ liệu, quy trình đối soát, nguồn ưu tiên và cách đóng cảnh báo |

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
- `carrierContractCount`, `revenueTotal`, `costTotal`, `capex` hiện là snapshot tổng hợp tùy chọn để hiển thị portfolio; chưa phải sổ cái hay nguồn dữ liệu tài chính chuẩn.
- Tìm kiếm danh sách chạy phía database theo mã, tên hoặc chủ đầu tư và luôn áp dụng trước pagination.

## Ngoài phạm vi của lát cắt hiện tại

- Chưa import dữ liệu Excel/mockup vào MongoDB.
- Chưa tự sinh kế hoạch khi project chuyển trạng thái; hiện người dùng chủ động bấm khởi tạo.
- Chưa có dependency giữa các bước, phần trăm hoàn thành, người được giao, bình luận, file hoặc lịch sử thay đổi.
- Chưa gửi thông báo task trễ hạn.
- Chưa triển khai bản ghi hợp đồng, doanh thu/chi phí theo kỳ, công nợ, hoàn vốn, CRM hoặc workflow phân công/duyệt/đóng cảnh báo chất lượng dữ liệu. Dashboard v1 chỉ tính cảnh báo dẫn xuất và liên kết về màn hình dự án; các số tổng hợp trên project chưa thay thế các module nguồn.

## Contract tạm thời cho chất lượng dữ liệu v1

- Báo cáo được scope theo project membership; người có `projects.manage` xem toàn portfolio. Endpoint đồng thời yêu cầu `projects.read` và `tasks.read`.
- `data_conflict`: project có `dataConflict=true`; `missing_capex`: project chưa có field `capex`.
- `missing_task_plan`: thiếu một trong 5 bước chuẩn hoặc task hiện có chưa đủ cặp ngày bắt đầu/kết thúc kế hoạch. Mỗi bước thiếu/chưa đủ ngày tính một điểm.
- `overdue_task`: task chưa `done`, có ngày kết thúc kế hoạch và ngày này đã qua tại thời điểm request.
- `missing_actual_end`: task có trạng thái `done` nhưng thiếu ngày kết thúc thực tế; kiểm tra này bảo vệ dữ liệu legacy/import dù API write hiện đã chặn trạng thái đó.
- Summary toàn scope và danh sách lọc/phân trang được tính trong cùng một MongoDB aggregation `$facet`; tìm kiếm theo mã, tên hoặc chủ đầu tư.
- V1 không lưu cảnh báo thành collection riêng, không có assignee, SLA, bình luận, lý do bỏ qua hoặc trạng thái đóng.

Các mục trên chỉ được bổ sung sau khi chốt contract tương ứng để tránh khóa hệ thống vào giả định từ dữ liệu minh họa.
