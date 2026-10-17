# Studia — Bộ nhận diện thương hiệu

Tối giản, sang trọng, xoay quanh một ý: **học là cuộc đối thoại dẫn tới tiến bộ**.
Tagline: *Học đúng điều cần học.*

Xem toàn bộ: mở [index.html](index.html) trong trình duyệt.

## Trong thư mục

| Thư mục | Nội dung |
|---|---|
| `images/01…10-*.png` | 10 trang hướng dẫn thương hiệu (3840 × 2400): bìa, ý niệm, cấu trúc, biến thể logo, màu sắc, kiểu chữ, hoạ tiết, biểu tượng ứng dụng, ấn phẩm, ứng dụng số |
| `images/og-image.png` | Ảnh chia sẻ liên kết 1200 × 630 |
| `images/social-*.png` | Ảnh đại diện 1080², bài đăng 1080 × 1350, ảnh bìa 1500 × 500 |
| `logo/*.svg` | Biểu tượng, wordmark, lockup — bản chính, đảo màu, đơn sắc; icon ứng dụng |

## Nguyên tắc nhanh

- **Màu:** Mực đêm `#0F1F4D` ~60% · Giấy ngà `#F8F6F2` ~28% · Xanh học thuật `#2344C9` ~8% · Cam bứt phá `#F2611F` ≤4%, mỗi bố cục chỉ một điểm cam.
- **Chữ:** Bricolage Grotesque (tiêu đề, con số band) · Be Vietnam Pro (giao diện) · Literata (bài đọc, câu tagline).
- **Logo:** vùng an toàn = chiều cao một bong bóng; tối thiểu lockup 96px, biểu tượng 16px.
- Hình học biểu tượng giữ nguyên như `frontend/src/components/Logo.tsx`, nên app và bộ nhận diện luôn khớp nhau.

## Sinh lại

```bash
node brand/src/build.mjs        # render tất cả (cần Chrome/Edge, có mạng để tải Google Fonts)
node brand/src/build.mjs 05     # chỉ render lại trang 05
```

Mọi màu, chữ, nội dung nằm trong `src/build.mjs`; `src/pages/` là HTML trung gian được sinh ra.
