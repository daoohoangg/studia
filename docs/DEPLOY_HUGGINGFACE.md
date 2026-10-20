# Deploy backend Studia lên Hugging Face Spaces (miễn phí)

Backend (thư mục `backend/`) chạy dạng Docker Space. Frontend vẫn ở Netlify/Vercel.

## 0. Chuẩn bị
- Tài khoản https://huggingface.co (không cần thẻ).
- Đã có Supabase (URL + 3 khoá) và Gemini API key còn hoạt động.
- Cài git. Tạo **Access Token** quyền *Write*: Settings › Access Tokens.

## 1. Tạo Space
1. https://huggingface.co/new-space
2. Space name: `studia-api` · SDK: **Docker** (Blank) · Hardware: **CPU basic (free)** · Visibility: **Public**
   (Private cũng được nhưng frontend khó gọi; nên Public, API đã có xác thực JWT).
3. Create Space.

## 2. Đẩy mã `backend/` lên Space
Space là một git repo riêng; ta đẩy **nội dung thư mục backend** vào gốc repo đó.

```bash
cd backend
git init -b main
git remote add space https://huggingface.co/spaces/<username>/studia-api
git add .
git commit -m "Deploy Studia API"
git push space main --force
```
Khi hỏi mật khẩu: username = tên HF, password = **Access Token** ở bước 0.
`.env`, `data/`, `tests/` đã bị loại bởi `.gitignore` gốc/`.dockerignore`; kiểm tra bằng `git status` trước khi push để chắc không có `.env`.

> Lưu ý: `backend/.git` là repo lồng trong repo Studia. Nếu muốn tránh, dùng `git subtree`:
> `git subtree push --prefix backend space main` (chạy từ gốc dự án, sau khi `git remote add space ...`).

## 3. Đặt biến môi trường
Space › **Settings › Variables and secrets**.

**Secrets** (bí mật):
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (nếu có), `GEMINI_API_KEY`, `SEPAY_API_KEY` / `SEPAY_WEBHOOK_SECRET`, `SEPAY_SECRET_KEY`, `SMTP_PASSWORD`

**Variables** (không bí mật):
| Tên | Giá trị |
|---|---|
| `ENVIRONMENT` | `production` |
| `AUTH_REQUIRED` | `true` |
| `SUPABASE_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | khoá anon |
| `LLM_PROVIDER` | `gemini` |
| `CORS_ORIGINS` | domain frontend, vd. `https://studia.netlify.app` (phân tách bằng dấu phẩy) |
| `FRONTEND_URL` | domain frontend |
| `BACKEND_PUBLIC_URL` | `https://<username>-studia-api.hf.space` |
| `ADMIN_EMAILS` | email quản trị |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_FROM` | nếu dùng email nhắc lịch |

Sau khi sửa biến, Space tự rebuild/restart.

## 4. Kiểm tra
- Tab **Logs** của Space: chờ build xong, thấy `Uvicorn running on http://0.0.0.0:7860`.
- Mở `https://<username>-studia-api.hf.space/health` → `{"status":"healthy",...}`.
- `https://<username>-studia-api.hf.space/docs` để xem API.

## 5. Nối frontend
Trong Netlify/Vercel đặt:
```
NEXT_PUBLIC_API_URL=https://<username>-studia-api.hf.space/api/v1
```
rồi redeploy frontend. Nhớ thêm domain frontend vào `CORS_ORIGINS` ở Space.

## 6. Webhook SePay
Đổi URL webhook trong SePay thành
`https://<username>-studia-api.hf.space/api/v1/billing/webhook/sepay` (và `/sepay-ipn` nếu dùng cổng thanh toán).

## Giới hạn gói free cần biết
- **Ngủ sau ~48 giờ không có truy cập**; request đầu sau khi ngủ chờ 1–2 phút để khởi động lại. Có thể dùng UptimeRobot ping `/health` mỗi 30 phút để giữ thức.
- **Ổ đĩa tạm thời**: mất khi restart/rebuild. Mọi dữ liệu và file phải ở Supabase (DB + Storage), không ghi vào `data/`.
- Tiến trình nền (xử lý sách, nhắc lịch) bị cắt khi Space ngủ/restart.
- 16 GB RAM, 2 vCPU: dư cho xử lý PDF.
- Nếu cần chạy ổn định 24/7, nâng cấp hardware trả phí hoặc dùng Oracle Cloud Always Free.

## Chạy thử Docker ở máy (tuỳ chọn)
```bash
cd backend
docker build -t studia-api .
docker run --rm -p 7860:7860 --env-file .env studia-api
```
