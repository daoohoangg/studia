# Mẫu email Studia

Sinh lại bằng `python build.py` (sửa nội dung trong `build.py`, đừng sửa tay file `.html`).

## Dán vào Supabase
**Authentication › Emails › Templates**, mỗi mẫu một tab:

| Tab Supabase | File | Subject gợi ý |
|---|---|---|
| Confirm sign up | `confirm-signup.html` | Xác nhận email để bắt đầu học cùng Studia |
| Invite user | `invite.html` | Bạn được mời vào Studia |
| Magic link | `magic-link.html` | Liên kết đăng nhập Studia của bạn |
| Change email address | `change-email.html` | Xác nhận đổi email Studia |
| Reset password | `reset-password.html` | Đặt lại mật khẩu Studia |
| Reauthentication | `reauthentication.html` | Mã xác nhận Studia |

Logo lấy từ `{{ .SiteURL }}/icon-192.png`, nên **Site URL** (Authentication › URL Configuration) phải là domain production đang public.

## Gửi từ tên/địa chỉ riêng (khuyên dùng)
Supabase mặc định gửi từ `noreply@mail.app.supabase.io` và giới hạn vài email/giờ. Vào **Authentication › SMTP Settings**, bật Custom SMTP (Resend, Brevo, Gmail App Password…) và đặt Sender name `Studia`.
