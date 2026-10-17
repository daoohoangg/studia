# Triển khai Studia

Frontend (Next.js) chạy trên **Vercel**. Backend (FastAPI) cần một nơi chạy tiến trình bình thường (Render, Railway, Fly.io, VPS…) vì xử lý sách chạy nền và dùng PDFium/OCR — không phù hợp serverless.

## 1. Supabase
1. Trong SQL Editor, chạy lần lượt: `backend/sql/setup_all.sql` (đã gồm schema + migration v2 … v7), rồi `migration_v8.sql`, `migration_v9.sql`, `migration_v10.sql` (lịch học theo giờ, ảnh khoảnh khắc, nhật ký email nhắc). Dự án Supabase mới tạo là trống nên bước này bắt buộc.
   - Nếu nối Supabase qua Vercel (Storage › Supabase), Vercel tự thêm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`. Frontend đọc được `NEXT_PUBLIC_SUPABASE_ANON_KEY` nên không cần khai báo lại. Backend thì chạy ngoài Vercel: tự sao chép `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` (khoá **secret**, không phải publishable) sang nơi host backend.
2. **Authentication › URL Configuration**: đặt *Site URL* = địa chỉ frontend (vd. `http://localhost:3000` khi test máy, hoặc `https://studia.vercel.app` khi deploy) và thêm vào *Redirect URLs*: `http://localhost:3000/**`, `https://studia.vercel.app/**`, `https://*.vercel.app/**`.
3. **Đăng nhập Google (OAuth 2.0)**:
   - **Google Cloud Console** ([console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)):
     - Tạo hoặc chọn Project trên Google Cloud.
     - Vào **OAuth consent screen**: chọn User Type **External** → Đặt tên ứng dụng (vd: `Studia`), email hỗ trợ, email nhà phát triển → Lưu. Nếu đang ở chế độ *Testing*, cần vào mục **Test users** thêm các email Gmail sẽ dùng để đăng nhập thử nghiệm.
     - Vào **Credentials** › **Create Credentials** › **OAuth client ID** › Loại: **Web application**.
     - **Authorized JavaScript origins**:
       - `http://localhost:3000`
       - `https://buvoldwkeaeiyrpjqaxe.supabase.co`
       - `https://studia.vercel.app` (nếu đã deploy)
     - **Authorized redirect URIs** (BẮT BUỘC):
       - `https://buvoldwkeaeiyrpjqaxe.supabase.co/auth/v1/callback` *(thay `buvoldwkeaeiyrpjqaxe` bằng project-ref của bạn nếu dùng Supabase khác)*
     - Bấm **Create** và sao chép **Client ID** cùng **Client Secret**.
   - **Supabase Dashboard** ([supabase.com/dashboard](https://supabase.com/dashboard)):
     - Vào dự án › **Authentication** › **Providers** › chọn **Google** › Bật công tắc **Enable Sign in with Google**.
     - Dán **Client ID** và **Client Secret** từ Google Cloud.
     - Bấm **Save**.
     - Frontend của Studia đã tích hợp sẵn nút đăng nhập Google tại `/login` và route callback `/auth/callback` tự động hoàn tất phiên đăng nhập và đưa người dùng vào hệ thống.

## 2. Backend
- Dùng `backend/Dockerfile` (Render: New › Web Service › Docker, Root Directory `backend`).
- Biến môi trường: xem `backend/.env.example`. Bắt buộc: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `AUTH_REQUIRED=true`, `ENVIRONMENT=production`, `CORS_ORIGINS=https://studia.vercel.app`, `BACKEND_PUBLIC_URL=https://<backend>`, `ADMIN_EMAILS`.
- **Email nhắc giờ học** (trang Lịch học, nhắc trước 10 phút): điền `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` (Gmail: `smtp.gmail.com`, cổng 587, `SMTP_SECURITY=starttls`, dùng *App Password*). Bỏ trống `SMTP_HOST` thì không gửi thư. Backend phải chạy liên tục (một tiến trình quét mỗi 30 giây) nên không đặt ở nơi tự ngủ khi không có truy cập. `TZ_OFFSET_HOURS=7` là múi giờ Việt Nam. Vào Lịch học › Ngày › "Gửi email thử" để kiểm tra.
- **Gói bán trên trang giới thiệu**: lấy từ Quản trị › Gói & cài đặt. Gói mẫu có giá 0 và chưa mở bán nên trang giới thiệu chỉ ghi "Sắp mở bán"; đặt giá và bật "Đang bán" để khách chọn được.
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
