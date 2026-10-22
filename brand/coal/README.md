# Coal — linh vật cục than của Studia

Cục than nhỏ muốn thành kim cương: càng bị ép càng sáng. Phong cách vẽ tay: nét mực tím `#2b2233` trên nền kem `#fdf9ef`, mắt to, tay chân là nét mảnh. **Lõi than hồng ở bụng** sáng hay tối theo tâm trạng (vui thì rực, buồn thì le lói).

## Nội dung

| Tệp | Mô tả |
|---|---|
| `coal.js` | Bộ vẽ nhân vật bằng SVG thuần: `Coal.coal({...})`, 6 khung truyện `Coal.panel(1..6)`, CSS chuyển động `Coal.CSS` |
| `comic.html` | Trang xem: Coal chuyển động (đi bộ, đổi cảm xúc) và 6 khung truyện. Mở bằng máy chủ tĩnh, ví dụ `python -m http.server --directory brand/coal` |
| `panels/coal-01..06.svg/png` | 6 khung truyện 1080×1080 |
| `build.mjs` | Xuất lại 6 file SVG: `node brand/coal/build.mjs` |
| `designs.js`, `designs/` | 12 phong cách hoạt hình cho Coal: khối than đơn giản, có tay chân, màu theo token của web (SVG + PNG từng kiểu và bảng tổng hợp `coal-12-phong-cach`). Xuất lại: `node brand/coal/build-designs.mjs` |

## Truyện: "Coal và bài nghe chép đầu tiên"
1. Sáng nào Coal cũng ngủ nướng (buồn ngủ, điện thoại báo giờ học).
2. Hôm nay Coal quyết tâm (kính, sách IELTS, ngọn lửa nhỏ).
3. Người ta đọc nhanh quá (tai nghe, lo lắng, dấu hỏi).
4. Điểm thấp, lửa le lói (buồn, mưa, 45%).
5. Chậm lại, nghe từng cụm (tốc độ 0.75×, bút chì, lửa sáng lại).
6. 100%, than cũng thành kim cương (phấn khích, pháo giấy, kim cương).

## Dùng nhân vật

```js
Coal.coal({
  mood: "happy",        // idle | happy | joy | proud | focus | surprised | worried | sad | sleepy
  armL: "down", armR: "wave",   // down | up | wave | hips | hold | out | cheer
  look: [1, 0],         // hướng nhìn, mỗi trục -1..1
  glasses: true, headphones: false,
  prop: null,           // "book" | "pencil" | "phone" (pencil/phone cần armR "up")
  glow: null,           // 0..1, ghi đè độ sáng lõi than theo cảm xúc
  walking: false,       // true: chân bước
})
```
Kết quả là chuỗi `<g>` trong hệ toạ độ 200×220 (chân chạm y≈200); đặt vào `<svg>` rồi nhúng `Coal.CSS` trong `<style>` để có nháy mắt, thở, vẫy tay, lửa nhấp nháy. Tự tắt chuyển động khi người dùng bật `prefers-reduced-motion`.

## Xuất PNG
SVG tự đủ để dùng. Muốn PNG, dùng bất kỳ bộ render SVG nào, ví dụ `@resvg/resvg-js` (`new Resvg(svg, { fitTo: { mode: "width", value: 1080 }, font: { loadSystemFonts: true } })`). Chữ trong khung dùng Be Vietnam Pro, không có thì rơi về Segoe UI/Arial.

## 12 phong cách
Khối than 8 đỉnh bo góc, tay chân "mì" nét tròn, màu phẳng đúng `DESIGN.md` (ink `#0e1630`, brand `#2344c9`, navy `#0f1f4d`, accent cam `#f2611f` chỉ làm điểm nhấn, marker `#ffe27a`; không gradient).

1. Viền mực cổ điển · 2. Phẳng không viền · 3. Xanh Studia (tai nghe, nghe chép) · 4. Tia lửa cam (streak) · 5. Mọt sách (sách IELTS) · 6. Nét vẽ tay (mũ cử nhân, bút chì) · 7. Luyện nói (micro) · 8. Thẻ từ vựng · 9. Cú đêm (mũ ngủ) · 10. Ngầu kiểu pop-art · 11. Nhãn dán · 12. Chibi mini.

Mỗi kiểu có nháy mắt, nhún nhẹ, vẫy tay (nếu đang giơ tay) và tự tắt khi bật `prefers-reduced-motion`. Hàm `CoalDesigns.fig({...})` vẽ nhân vật với tuỳ chọn riêng (màu, viền, dáng tay, phụ kiện) nếu muốn tạo thêm kiểu.

## Bộ tư thế đang dùng trong app (`sprites/`)
App dùng bộ minh hoạ 25 tư thế (`sprites/coal-sheet.webp`), đã cắt sẵn thành WebP trong suốt ở `frontend/public/coal/`. Chạy lại `python brand/coal/sprites/slice_sheet.py` khi thay bảng ảnh. Component `Mascot` (`frontend/src/components/mascot/Mascot.tsx`) chọn tư thế bằng `spriteFor(mood, wet, fire)`:

| Điều kiện | Tư thế |
|---|---|
| Ướt mức 1 / 2 / 3 / 4 | `wet0` (`wet1` nếu đang buồn ngủ) / `wet2` / `wet3` / `wet4` |
| Cháy mức 1 / 2 / 3 / 4 | `fire0` / `fire2` / `fire3` / `fire4` |
| Hoan hô khi đang có lửa (chạm mốc streak) | `fire1` (Coal hoá ngọn lửa nháy mắt) |
| Cảm xúc thường | `hello` `happy` `cheer` `love` `focus` `surprised` (lo lắng) `sleepy` `sad` `lost` `fireM` |
| Chỉ gọi bằng `sprite="..."` | `smile` `excited` `happy-alt` `love-alt` `cheer-alt` |

Ảnh tĩnh nên chuyển động làm bằng CSS (`mascot.css`): nhún, nảy khi ăn mừng, đập nhịp khi yêu thương, thở khi ngủ, rung khi lo, run khi ướt sũng, phát sáng khi cháy, nhún nhanh khi `talking`.

