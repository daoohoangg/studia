# Triển khai Studia

Frontend (Next.js) chạy trên **Vercel**. Backend (FastAPI) cần một nơi chạy tiến trình bình thường (Render, Railway, Fly.io, VPS…) vì xử lý sách chạy nền và dùng PDFium/OCR — không phù hợp serverless.

## 1. Supabase
1. Trong SQL Editor, chạy lần lượt: `backend/sql/setup_all.sql` (đã gồm schema + migration v2 … v7), rồi `migration_v8.sql`, rồi `migration_v9.sql`. Dự án Supabase mới tạo là trống nên bước này bắt buộc.
   - Nếu nối Supabase qua Vercel (Storage › Supabase), Vercel tự thêm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`. Frontend đọc được `NEXT_PUBLIC_SUPABASE_ANON_KEY` nên không cần khai báo lại. Backend thì chạy ngoài Vercel: tự sao chép `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` (khoá **secret**, không phải publishable) sang nơi host backend.
2. **Authentication › URL Configuration**: đặt *Site URL* = địa chỉ Vercel (vd. `https://studia.vercel.app`) và thêm vào *Redirect URLs*: `https://studia.vercel.app/**`, `http://localhost:3000/**`.
3. **Đăng nhập Google**: Authentication › Providers › Google › bật, dán *Client ID* và *Client Secret* tạo ở [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth client loại *Web application*; *Authorized redirect URI* = `https://<project-ref>.supabase.co/auth/v1/callback`).

## 2. Backend
- Dùng `backend/Dockerfile` (Render: New › Web Service › Docker, Root Directory `backend`).
- Biến môi trường: xem `backend/.env.example`. Bắt buộc: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `AUTH_REQUIRED=true`, `ENVIRONMENT=production`, `CORS_ORIGINS=https://studia.vercel.app`, `BACKEND_PUBLIC_URL=https://<backend>`, `ADMIN_EMAILS`.
- Kiểm tra: `GET https://<backend>/docs`.

### Thanh toán (SePay Cổng thanh toán)
- Biến backend: `SEPAY_MERCHANT_ID`, `SEPAY_SECRET_KEY`, `SEPAY_ENV=production`, `FRONTEND_URL=https://<vercel>`.
- Trên my.sepay.vn › Cổng thanh toán › Cấu hình › IPN: URL `https://<backend>/api/v1/billing/webhook/sepay-ipn`, kiểu xác thực **SECRET_KEY** (SePay gửi header `X-Secret-Key`).
- Gói bán và giá chỉnh trong trang Quản trị › Gói & cài đặt. Khách bấm "Thanh toán bằng mã QR" → sang trang SePay → IPN tự cộng lượt.

## 3. Audio Listening
Thư mục `frontend/public/audio` (~170 MB) **không** đưa lên Vercel (đã có trong `.vercelignore` và `.gitignore`).
1. Tạo bucket công khai (Supabase Storage › New bucket `audio`, Public) và tải 4 tệp `cambridge_21_test_*.mp3` lên.
2. Đặt `NEXT_PUBLIC_AUDIO_BASE_URL=https://<project-ref>.supabase.co/storage/v1/object/public/audio`.

## 4. Vercel
1. Import repo, **Root Directory = `frontend`** (Framework: Next.js tự nhận; `frontend/vercel.json` đã có cấu hình).
2. Environment Variables (xem `frontend/.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_API_URL` = `https://<backend>/api/v1`
   - `NEXT_PUBLIC_AUDIO_BASE_URL`
   - `NEXT_PUBLIC_AUTH_DISABLED` = `false` (hoặc bỏ trống)
3. Deploy. Sau khi có địa chỉ Vercel thật, quay lại bước 1.2 và 2 để cập nhật Site URL / `CORS_ORIGINS`.

## Chạy máy
```
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
cd frontend && cp .env.example .env.local && npm install && npm run dev
```
