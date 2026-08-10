# IDS PMS — Engineering Rules

## 1. Nguyên tắc chung

- TypeScript strict, ưu tiên type rõ ràng và immutable data.
- Tên code bằng tiếng Anh; nội dung giao diện và tài liệu khách hàng có thể dùng tiếng Việt.
- Module hóa theo business domain, không theo loại kỹ thuật chung chung.
- Giữ thay đổi nhỏ, có mục tiêu và dễ review.
- Không trộn refactor lớn với thay đổi nghiệp vụ nếu không cần thiết.
- Không thêm dependency khi nền tảng hoặc một utility nhỏ đã giải quyết được vấn đề.
- Ưu tiên thời gian phản hồi và trải nghiệm người dùng, nhưng không đánh đổi tính đúng đắn, bảo mật hoặc khả năng bảo trì chỉ để tối ưu vi mô.

## 2. Backend — NestJS

- Mỗi domain có module riêng; controller chỉ xử lý HTTP mapping và validation.
- Business rule nằm ở service/use case; truy cập dữ liệu nằm sau repository/model boundary.
- DTO input dùng `class-validator`; global validation phải tiếp tục bật whitelist và từ chối field lạ.
- Không trả Mongoose document trực tiếp nếu response contract cần ổn định; map sang response DTO.
- Schema mới dùng quy ước `BASE_SCHEMA_OPTIONS` hoặc tương đương để có timestamps, bỏ `__v` và map `_id` thành `id` nhất quán.
- Không để exception/database detail hoặc stack trace lọt ra response production.
- Mọi endpoint public dùng prefix `/api/v1` và được mô tả trong Swagger.
- List endpoint phải có pagination trước khi dữ liệu có thể tăng lớn.
- Tác vụ nhiều collection cần atomicity phải dùng transaction; local MongoDB luôn chạy replica set để kiểm thử điều này.

## 3. MongoDB và Mongoose

- Schema phải khai báo required, enum, default và index phù hợp với query thực tế.
- Dùng ObjectId cho quan hệ nội bộ; không nhúng dữ liệu tăng trưởng không giới hạn.
- Dữ liệu cần audit nên có `createdAt`, `updatedAt`, và actor khi nghiệp vụ yêu cầu.
- Soft delete chỉ dùng khi có yêu cầu khôi phục/audit; nếu dùng phải áp dụng nhất quán trong query.
- Không tạo index theo phỏng đoán. Ghi query pattern và kiểm tra explain khi tối ưu.
- Tránh N+1 query. Không chạy một query riêng cho từng phần tử khi có thể batch bằng `$in`, aggregation, lookup/populate có kiểm soát hoặc query đã được thiết kế theo use case.
- Chỉ lấy field cần dùng bằng projection; cân nhắc `lean()` cho luồng chỉ đọc khi không cần document method, virtual hoặc middleware liên quan.
- Thay đổi schema tương thích ngược khi có thể; migration dữ liệu phải có kế hoạch rollback hoặc backup.

## 4. Frontend — Angular

- Dùng standalone component, signals và typed reactive forms khi phù hợp.
- Component trình bày không gọi API trực tiếp; dùng service/facade theo feature.
- Route theo feature và lazy load khi module bắt đầu lớn.
- Mỗi màn hình async phải có loading, empty, error và success state phù hợp.
- Ưu tiên semantic HTML, keyboard navigation, focus visible và contrast đạt WCAG AA.
- Không hard-code API host trong component; local dùng `/api` qua proxy.
- Không dùng `innerHTML` với dữ liệu không tin cậy.
- Responsive tối thiểu ở mobile 390px và desktop phổ biến; không được tạo horizontal overflow ngoài chủ ý.
- Tránh N+1 request từ frontend. Dữ liệu cho một màn hình nên được batch, aggregate hoặc tải theo endpoint phù hợp thay vì gọi lặp theo từng item.
- Với thao tác có độ trễ, phản hồi trạng thái ngay cho người dùng; hủy hoặc bỏ qua request cũ khi kết quả không còn giá trị.

## 5. Hiệu năng và trải nghiệm người dùng

- Trong một function xử lý, hạn chế duyệt cùng một mảng lớn nhiều lần bằng chuỗi `filter`/`map`/`reduce` hoặc nhiều loop độc lập khi có thể xử lý rõ ràng trong một lượt.
- Chỉ gộp thành một lượt duyệt khi vẫn giữ được code dễ đọc và đúng nghiệp vụ. Cho phép nhiều lượt nếu thuật toán bắt buộc, dữ liệu nhỏ không đáng kể, hoặc việc tách lượt giúp tránh lỗi và đã được cân nhắc rõ ràng.
- Không tối ưu dựa trên cảm giác. Với luồng quan trọng, đo thời gian thực thi, số query/request, kích thước payload và latency trước/sau thay đổi.
- Thiết kế fast path cho trường hợp phổ biến; không bắt người dùng chờ công việc phụ có thể xử lý bất đồng bộ hoặc trì hoãn an toàn.
- Endpoint danh sách phải dùng pagination, giới hạn page size, projection và sort có index phù hợp. Không tải toàn bộ collection rồi lọc/sắp xếp trong application memory.
- Tránh N+1 ở mọi tầng. Khi review luồng xử lý collection, kiểm tra cả số lần truy cập database, gọi service ngoài và request từ frontend.
- Giảm payload và số round trip nhưng không tạo endpoint đa năng khó cache, khó phân quyền hoặc trả dữ liệu dư thừa.
- Chỉ thêm cache khi có số liệu cho thấy cần thiết và đã xác định key, TTL, invalidation, phạm vi dữ liệu người dùng và hành vi khi cache lỗi.
- Frontend phải ưu tiên perceived performance: hiển thị loading/skeleton phù hợp, giữ layout ổn định, debounce thao tác nhập liệu cần thiết, lazy load phần chưa cần và tránh chặn main thread.
- Có thể dùng optimistic update cho thao tác phù hợp nếu có rollback/error state rõ ràng; không dùng cho hành động nhạy cảm hoặc khó hoàn tác.
- Mọi tối ưu đáng kể phải có benchmark, test hoặc bằng chứng kiểm chứng tương xứng với rủi ro regression.

## 6. API contract

- JSON field dùng `camelCase`; URL resource dùng danh từ số nhiều và `kebab-case` khi có nhiều từ.
- Timestamp dùng ISO 8601 UTC.
- Không đổi nghĩa hoặc xóa field của API v1 mà không có kế hoạch compatibility.
- Error response sau khi triển khai error layer phải có cấu trúc thống nhất: code máy đọc được, message cho người dùng và request/correlation id khi có.
- OpenAPI là nguồn chuẩn cho endpoint/DTO nghiệp vụ; `libs/api-contracts` chỉ chứa envelope nền tảng không phụ thuộc framework.
- File upload, export, webhook và integration cần giới hạn kích thước, timeout và idempotency phù hợp.

## 7. Test và kiểm chứng

- Logic/hành vi mới theo RED → GREEN → REFACTOR.
- Unit test kiểm tra business rule và edge case, không chỉ kiểm tra framework wiring.
- API e2e kiểm tra contract, validation, authorization và failure path quan trọng.
- Browser e2e dành cho critical user journey; không biến mọi chi tiết UI thành e2e test dễ vỡ.
- Bug fix phải có regression test nếu có thể tái tạo ổn định.
- Không xóa/skip test để làm pipeline xanh nếu chưa giải thích và được chấp thuận.

## 8. Security và dữ liệu

- Không commit secret, `.env`, database dump, file upload, log phiên AI hoặc dữ liệu khách hàng.
- Password phải hash bằng thuật toán phù hợp; token không lưu plaintext nếu có thể tránh.
- Authorization kiểm tra ở backend, không dựa vào việc frontend ẩn nút.
- Mọi input bên ngoài đều không đáng tin cậy và phải validate.
- Không chạy `npm audit fix --force` tự động. Đánh giá production dependency riêng với `npm audit --omit=dev`.

## 9. Git và bàn giao

- Không sửa hoặc xóa thay đổi không liên quan của người dùng.
- Không commit generated runtime files, test artifacts hoặc local log.
- Commit, push, tạo PR và thay đổi remote chỉ thực hiện khi người dùng yêu cầu.
- Khi được yêu cầu commit, message phải mô tả mục đích thay đổi, không chỉ liệt kê file.
- Cập nhật `OVERVIEW.md`, `DECISIONS.md` hoặc `RULES.md` khi kiến trúc/quy tắc thực sự thay đổi.
