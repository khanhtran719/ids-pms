# AGENTS.md

Đây là chỉ dẫn bắt buộc cho mọi AI agent làm việc trong repository IDS PMS.

## 1. Nguồn thông tin cần đọc

Trước khi phân tích hoặc thay đổi dự án, đọc theo thứ tự:

1. `AGENTS.md` — quy trình làm việc bắt buộc.
2. `OVERVIEW.md` — mục tiêu, kiến trúc và trạng thái hệ thống.
3. `RULES.md` — quy tắc kỹ thuật và chất lượng.
4. `DECISIONS.md` — các quyết định đã chốt và lý do.
5. `AI_WORKFLOW.md` — cách ghi log phiên làm việc local.
6. Các `AGENTS.md` gần file đang sửa hơn, nếu sau này có thêm chỉ dẫn theo module.

Khi tài liệu mâu thuẫn, ưu tiên theo thứ tự: yêu cầu hiện tại của người dùng, `AGENTS.md` gần file nhất, `AGENTS.md` root, `RULES.md`, các tài liệu còn lại.

## 2. Quy trình đầu phiên bắt buộc

- Kiểm tra trạng thái workspace và các thay đổi có sẵn; không ghi đè công việc của người dùng.
- Xác định phạm vi, giả định và tiêu chí hoàn thành.
- Tạo log local cho phiên nếu chưa có phiên đang hoạt động:

```bash
npm run ai:session:start -- --agent="<model/tool>" --task="<mục tiêu phiên>"
```

- Không ghi secret, token, mật khẩu, dữ liệu khách hàng hoặc nội dung nhạy cảm vào log.
- Nếu chỉ đọc/giải thích, không tự ý sửa code hoặc thay đổi trạng thái bên ngoài.

## 3. Quy tắc khi thay đổi dự án

- Bám đúng yêu cầu đã được xác nhận; không tự mở rộng scope nghiệp vụ.
- Với logic hoặc hành vi mới: viết test thất bại trước, triển khai tối thiểu để test xanh, sau đó refactor.
- Không dùng `any` nếu có thể mô hình hóa type rõ ràng.
- Không đưa trực tiếp logic nghiệp vụ vào controller hoặc Angular component.
- API public phải nằm dưới `/api/v1`; thay đổi contract phải cập nhật Swagger và test.
- MongoDB phải truy cập qua Mongoose model/repository của module; không phát tán query tùy ý giữa các module.
- File phải đi qua storage abstraction. Hiện dùng local; không gắn chặt business logic với đường dẫn vật lý.
- Không thêm GraphQL, S3/MinIO hoặc dịch vụ ngoài khi chưa có quyết định mới trong `DECISIONS.md`.
- Không chạy lệnh phá hủy dữ liệu, migration không thể đảo ngược hoặc `npm audit fix --force` nếu chưa được người dùng duyệt rõ ràng.
- Không commit hoặc push trừ khi người dùng yêu cầu.

## 4. Ghi nhận thay đổi trong phiên

Sau mỗi nhóm thay đổi có ý nghĩa, ghi một note ngắn:

```bash
npm run ai:session:log -- \
  --type="change" \
  --message="<đã thay đổi gì và vì sao>" \
  --files="<các file chính>"
```

Các loại note khuyến nghị: `analysis`, `decision`, `change`, `validation`, `risk`, `blocker`.

Log trong `.ai-work/` chỉ phục vụ bàn giao ngữ cảnh local và tuyệt đối không được thêm vào Git.

## 5. Kiểm tra trước khi kết thúc

Chạy kiểm tra tương ứng với phạm vi thay đổi:

```bash
npm test -- --runInBand
npm run lint
npm run build
npm run test:e2e
```

- Thay đổi tài liệu/cấu hình đơn thuần có thể chỉ cần kiểm tra cú pháp và command liên quan.
- Không tuyên bố hoàn thành nếu kiểm tra bắt buộc chưa chạy hoặc đang thất bại.
- Phân biệt lỗi do code, dependency, môi trường và sandbox trong báo cáo.

Kết thúc log phiên:

```bash
npm run ai:session:end -- \
  --status="completed" \
  --summary="<kết quả bàn giao>" \
  --validation="<các kiểm tra đã chạy>"
```

Nếu bị chặn, dùng `--status="blocked"` và ghi rõ blocker cùng bước tiếp theo.

## 6. Tiêu chuẩn bàn giao

Báo cáo cuối cần có:

- Kết quả đã đạt được.
- File hoặc module chính đã thay đổi.
- Kiểm tra đã chạy và kết quả.
- Rủi ro, giả định hoặc phần chưa làm.
- Bước tiếp theo hợp lý nếu người dùng muốn tiếp tục.

Không yêu cầu người dùng phải đọc log nội bộ để hiểu kết quả bàn giao.
