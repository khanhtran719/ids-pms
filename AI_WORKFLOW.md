# IDS PMS — AI Working and Session Logging

## Mục đích

Quy trình này giúp các mô hình AI khác nhau hiểu công việc trước đó, biết file nào đã sửa, kiểm tra nào đã chạy và rủi ro nào còn lại. Log là working memory local, không phải tài liệu sản phẩm và không được push lên Git.

## Vị trí local

```text
.ai-work/
  current-session       Con trỏ tới phiên đang hoạt động
  last-session          Con trỏ tới phiên kết thúc gần nhất
  sessions/
    YYYY-MM-DD-HHmmss-task.md
```

`.gitignore` loại trừ toàn bộ `.ai-work/`. Không dùng `git add -f` cho thư mục này.

## Bắt đầu phiên

```bash
npm run ai:session:start -- \
  --agent="Codex GPT-5" \
  --task="Mô tả ngắn mục tiêu"
```

Nếu phiên trước bị gián đoạn và vẫn active, đọc log đó rồi tiếp tục hoặc kết thúc nó. Chỉ dùng `--force` khi chắc chắn cần đóng phiên cũ dưới trạng thái `superseded`.

## Ghi note trong phiên

```bash
npm run ai:session:log -- \
  --type="change" \
  --message="Thêm health endpoint và kết nối MongoDB" \
  --files="apps/api/src/app/health,apps/api/src/app/app.module.ts"
```

Nên ghi note khi:

- Chốt một giả định hoặc quyết định kỹ thuật.
- Hoàn thành một nhóm thay đổi code.
- Chạy test/build/lint/e2e.
- Phát hiện rủi ro, regression hoặc blocker.
- Người dùng thay đổi phạm vi.

Không cần ghi từng lệnh shell hoặc từng chỉnh sửa nhỏ không có giá trị bàn giao.

## Kết thúc phiên

```bash
npm run ai:session:end -- \
  --status="completed" \
  --summary="Hoàn thành nền tảng health vertical slice" \
  --validation="unit 6/6; API e2e 1/1; Chromium e2e 1/1"
```

Status khuyến nghị:

- `completed`: mục tiêu phiên đã hoàn tất.
- `partial`: có tiến triển nhưng còn phần được phép tiếp tục.
- `blocked`: không thể tiếp tục nếu thiếu input/quyền/trạng thái ngoài.
- `superseded`: phiên cũ bị thay thế bằng phiên mới.

## Nội dung không được ghi

- Password, access token, cookie, private key, OTP.
- Dữ liệu khách hàng thật hoặc thông tin nhận dạng cá nhân.
- Toàn bộ nội dung `.env` hoặc database dump.
- Prompt nội bộ, chain-of-thought hoặc dữ liệu hệ thống của model.
- Log dài từ tool; chỉ ghi kết luận cần thiết.

## Kiểm tra log không vào Git

Khi repository đã được khởi tạo Git:

```bash
git check-ignore -v .ai-work/current-session
git status --short --ignored
```

Nếu `.ai-work/` xuất hiện như file có thể commit, dừng lại và sửa `.gitignore` trước khi commit/push.

## Trách nhiệm giữa các phiên

AI bắt đầu phiên mới cần đọc `last-session` nếu nó tồn tại, nhưng vẫn phải xác minh code hiện tại vì log có thể cũ hoặc phiên trước có thể bị gián đoạn. Source code và test đang có là nguồn sự thật cuối cùng.
