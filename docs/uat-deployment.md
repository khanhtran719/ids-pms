# Triển khai môi trường UAT

## Mục tiêu và phạm vi

Bộ UAT chạy trên một máy Linux có Docker Compose. Chỉ Nginx/Web publish cổng ra host; API và MongoDB nằm trong các network nội bộ. MongoDB và thư mục upload dùng named volume để giữ dữ liệu khi container được thay thế.

Đây là cấu hình self-hosted cho nghiệm thu sớm, chưa tự cấp domain, TLS, backup ngoài máy hoặc monitoring. Nên đặt một reverse proxy/load balancer HTTPS phía trước cổng UAT trước khi gửi cho khách.

## 1. Chuẩn bị biến môi trường

```bash
cp .env.uat.example .env.uat
```

Điều chỉnh tối thiểu:

- `WEB_ORIGIN`: URL HTTPS chính xác khách sẽ mở, không dùng `*`.
- `JWT_ACCESS_SECRET`: sinh riêng cho UAT, ví dụ `openssl rand -base64 48`.
- `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD`: tài khoản UAT riêng, không dùng credential dev/production.
- `MONGODB_DATABASE`: giữ hậu tố `_uat` để seed an toàn.
- `DEMO_SEED_CONFIRM`: phải bằng `seed:<MONGODB_DATABASE>`.
- `UAT_HTTP_PORT`: cổng host mà reverse proxy chuyển tiếp vào, mặc định `8080`.

`.env.uat` đã được Git ignore. Không đưa file này, log chứa secret hoặc database dump lên repository.

Kiểm tra cấu hình mà không in secret:

```bash
docker compose --env-file .env.uat -f compose.uat.yaml config --quiet
```

## 2. Build và khởi động

```bash
docker compose --env-file .env.uat -f compose.uat.yaml build
docker compose --env-file .env.uat -f compose.uat.yaml up -d mongodb api web
docker compose --env-file .env.uat -f compose.uat.yaml ps
```

Kiểm tra tại máy chủ:

```bash
curl --fail http://127.0.0.1:8080/healthz
curl --fail http://127.0.0.1:8080/api/v1/health/ready
```

Nếu đổi `UAT_HTTP_PORT`, thay `8080` trong lệnh kiểm tra. API và MongoDB không publish cổng ra host.

## 3. Nạp dữ liệu demo

API phải healthy để tài khoản admin cấu hình từ `SEED_ADMIN_*` được tạo trước:

```bash
docker compose --env-file .env.uat -f compose.uat.yaml --profile tools run --rm demo-seed
```

Seed tạo 3 dự án liên kết với membership, 15 task, 4 hợp đồng, doanh thu FY2025, 4 khoản công nợ, 4 cơ hội và hoạt động dự án. Chạy lại không tạo trùng và không ghi đè chỉnh sửa trên các dòng demo đã tồn tại.

Seed từ chối chạy nếu database không kết thúc bằng `_uat`/`_demo`, confirmation không khớp hoặc không tìm thấy admin active.

## 4. HTTPS và cookie

Với UAT gửi khách, giữ `AUTH_COOKIE_SECURE=true` và terminate HTTPS ở reverse proxy/load balancer. Proxy phải chuyển `Host`, `X-Forwarded-For` và `X-Forwarded-Proto`; Nginx UAT tiếp tục chuyển các header này tới API.

Chỉ khi thử tạm trong mạng kín bằng URL HTTP mới đặt đồng thời:

```text
WEB_ORIGIN=http://<server>:<port>
AUTH_COOKIE_SECURE=false
```

Không dùng cấu hình HTTP này khi mở UAT ra Internet.

## 5. Vận hành cơ bản

Xem trạng thái và log:

```bash
docker compose --env-file .env.uat -f compose.uat.yaml ps
docker compose --env-file .env.uat -f compose.uat.yaml logs --tail=200 api web mongodb
```

Cập nhật phiên bản:

```bash
git pull
docker compose --env-file .env.uat -f compose.uat.yaml build
docker compose --env-file .env.uat -f compose.uat.yaml up -d api web
```

Không dùng `down -v`: tùy chọn `-v` xóa named volume MongoDB/upload và làm mất dữ liệu UAT.

## 6. Checklist trước khi gửi khách

- Domain HTTPS mở được và chứng chỉ hợp lệ.
- `/healthz` và `/api/v1/health/ready` trả thành công.
- Login, reload trình duyệt và logout hoạt động; refresh cookie có `Secure`.
- Tài khoản UAT không dùng chung với production.
- MongoDB/API không có port public trong firewall hoặc `docker compose ps`.
- Đã thống nhất lịch backup volume/database trước khi khách bắt đầu nhập dữ liệu đáng giữ.
- Swagger giữ tắt trừ khi đội kỹ thuật cần nghiệm thu API.
