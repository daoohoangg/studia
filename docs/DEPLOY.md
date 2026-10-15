# Triển khai Studia

Frontend (Next.js) chạy trên **Vercel**. Backend (FastAPI) cần một nơi chạy tiến trình bình thường (Render, Railway, Fly.io, VPS…) vì xử lý sách chạy nền và dùng PDFium/OCR — không phù hợp serverless.

## 1. Supabase
1. Chạy lần lượt các tệp trong `backend/sql/` (setup_all.sql rồi migration_v4 … v9) trong SQL Editor.
2. **Authentication › URL Configuration**: đặt *Site URL* = địa chỉ Vercel (vd. `https://studia.vercel.app`) và thêm vào *Redirect URLs*: `https://studia.vercel.app/**`, `http://localhost:3000/**`.
3. **Đăng nhập Google**: Authentication › Providers › Google › bật, dán *Client ID* và *Client Secret* tạo ở [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth client loại *Web application*; *Authorized redirect URI* = `https://<project-ref>.supabase.co/auth/v1/callback`).

## 2. Backend
- Dùng `backend/Dockerfile` (Render: New › Web Service › Docker, Root Directory `backend`).
- Biến môi trường: xem `backend/.env.example`. Bắt buộc: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `AUTH_REQUIRED=true`, `ENVIRONMENT=production`, `CORS_ORIGINS=https://studia.vercel.app`, `BACKEND_PUBLIC_URL=https://<backend>`, `ADMIN_EMAILS`.
- Kiểm tra: `GET https://<backend>/docs`.

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
