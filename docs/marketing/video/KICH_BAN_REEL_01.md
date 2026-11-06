# Kịch bản Reel 01: "Cuốn sách của bạn thành lộ trình học"

## 1. Tóm tắt

| Mục | Nội dung |
|---|---|
| Tên video | Reel 01: Tải về rồi để đó |
| Thời lượng | **24,6 giây** = 738 khung (30 fps), 1080×1920, 9:16 |
| Thông điệp | Tài liệu bạn tải về rồi để đó, thả vào Studia sẽ thành bài học mỗi ngày, flashcard và quiz, học được ngay. |
| Người xem mục tiêu | Người Việt 18–28 tuổi tự ôn IELTS, máy có sẵn nhiều PDF nhưng không biết bắt đầu từ đâu, hay lướt Reels/TikTok và thường xem khi tắt tiếng. |
| Tính năng | Tải PDF (kể cả bản scan) → lộ trình theo ngày + flashcard + quiz; trang nào xử lý xong học được ngay. Coal dẫn dắt từ đầu đến cuối; kết bằng chuỗi lửa (gợi chuỗi ngày học). |
| Vì sao chọn | Giữ tính năng đề xuất: nỗi đau "PDF nằm im" ai cũng gặp, và kết quả dễ thấy bằng hình (file → danh sách ngày → thẻ → quiz) nên xem không cần tiếng vẫn hiểu. |

Mạch truyện: Tải về rồi để đó (đồng cảm) → mở ra thì ngợp (vấn đề) → Coal: thả vào Studia (giải pháp) → bài học theo ngày → flashcard → quiz → học đều thì lửa bùng to → logo + lời mời (CTA).

---

## 2. Quy ước chung cho người dựng

### 2.1 Khung và vùng an toàn
- Khung 1080×1920. Toạ độ (x, y) tính từ góc trên trái, đơn vị px.
- **Chữ quan trọng chỉ nằm trong x 80–1000, y 220–1540.** Ở y > 1100, giữ chữ trong x ≤ 960 (cột nút like/bình luận của IG/TikTok nằm ở mép phải).
- Coal và hình trang trí được phép tràn nhẹ ra ngoài vùng an toàn.

### 2.2 Màu (không gradient, không emoji)
| Token | Mã | Dùng cho |
|---|---|---|
| navy | `#0F1F4D` | viền sticker, bóng cứng, nền cảnh 7, logo |
| ink | `#0E1630` | chữ chính trên nền sáng |
| ink-2 | `#3A4260` | chữ phụ |
| muted | `#5E6480` | chữ meta |
| control | `#80869E` | bụi, đáp án bị loại |
| ivory | `#F8F6F2` | nền cảnh 1, 4, 8 |
| white | `#FFFFFF` | mặt thẻ |
| hairline | `#E5E0D8` | thanh chữ giả, đường chia |
| brand | `#2344C9` | nền cảnh 3, nút "Được" |
| brand-hover | `#1A3399` | lòng ô thả file |
| brand-tint | `#E9EEFD` | nền cảnh 2 |
| accent | `#F2611F` | điểm nhấn, nút CTA |
| accent-tint | `#FFEDE3` | nền cảnh 5 |
| success | `#0D7A5F` | đáp án đúng |
| success-tint | `#E1F4EC` | nền cảnh 6 |
| marker | `#FFE27A` | gạch dạ quang, số chuỗi |
| navy-2 | `#1B2A5E` | quầng tròn sau Coal ở cảnh 7 |
| dark-line | `#273055` | viền mốc chưa đạt ở cảnh 7 |
| dark-muted | `#949BB8` | chữ mốc chưa đạt ở cảnh 7 |

### 2.3 Font (Google Fonts, có bộ ký tự tiếng Việt)
- **Bricolage Grotesque 800**: tiêu đề, số đếm, wordmark. `letter-spacing: -0.02em; line-height: 1.0`.
- **Be Vietnam Pro 400/600/700/800**: giao diện, nút, nhãn.
- **Literata 500/600 và 400 italic**: từ và câu tiếng Anh.
- Luật vừa khung: nếu một dòng tiêu đề rộng hơn 920 px, giảm cỡ chữ mỗi lần 4 px (thấp nhất 80 px). Không được tự xuống dòng.

### 2.4 Kiểu "sticker" (lấy từ bộ ảnh `brand/social/b-coal`)
Thẻ và nút: nền phẳng, viền `6px solid #0F1F4D` (nút nhỏ 5px), bo góc như ghi trong từng phần, **bóng cứng** `box-shadow: 0 10px 0 #0F1F4D` (thẻ lớn 0 12px 0). Không làm mờ bóng.

### 2.5 Ảnh Coal
- Lấy từ `frontend/public/coal/<tư thế>.webp` (663×648, nền trong suốt). Chiều cao = chiều rộng × 0,977. Ảnh đã có bóng dưới chân, không cần vẽ thêm.
- `transform-origin: 50% 92%` (dưới chân) cho mọi phép co giãn.

### 2.6 Easing và chuyển động dùng lại
| Tên | Định nghĩa |
|---|---|
| `SPRING` | `cubic-bezier(0.34,1.56,0.64,1)` |
| `OUT` | `cubic-bezier(0.22,1,0.36,1)` |
| `IN` | `cubic-bezier(0.55,0,1,0.45)` |
| `INOUT` | `cubic-bezier(0.65,0,0.35,1)` |
| **POP** (vào hoặc đổi tư thế Coal) | 0,30 s: scale 0.9→1.05 trong 0,12 s (`OUT`), rồi 1.05→1 trong 0,18 s (`INOUT`). Khi đổi tư thế thì thay ảnh **ngay ở khung đầu** của POP. |
| **POP-IN** (xuất hiện từ không) | 0,45 s: scale 0→1.05 (0,3 s `OUT`) rồi →1 (0,15 s `INOUT`); kèm opacity 0→1 trong 0,1 s đầu. |
| **NHÚN** (Coal đứng chờ) | Lặp chu kỳ 0,8 s: translateY 0→-12→0 px (`INOUT`). Ở đáy: scaleX 1.04 / scaleY 0.96; ở đỉnh: scaleX 0.98 / scaleY 1.03. Tạm dừng NHÚN trong lúc POP. |
| **LỘ CHỮ** (mask-up) | Mỗi dòng nằm trong khung `overflow:hidden` cao bằng một dòng; phần chữ bên trong translateY 105%→0, 0,35 s `OUT`. |
| **GẠCH DẠ QUANG** | Hình chữ nhật `#FFE27A` nằm sau cụm chữ, cao 45% dòng, đáy chữ nhật ở 85% chiều cao dòng, tràn 8 px hai bên; scaleX 0→1 từ trái, 0,3 s `OUT`. |
| **QUÉT** (chuyển cảnh) | Hai mảng full khung, `skewX(-8deg)`, rộng 1300 px. Lớp 1 (màu nhấn ghi ở từng cảnh) chạy translateX −1400→0 trong 0,25 s `INOUT`, bắt đầu lúc T−0,30. Lớp 2 (màu nền cảnh sau) chạy giống vậy, bắt đầu T−0,24. Đúng mốc T: bỏ cảnh cũ, lớp 2 thành nền cảnh mới, bỏ lớp 1. |
| **CHẠM** (ngón tay giả) | Vòng tròn viền 6px `#0F1F4D`, đường kính 60→140 px, opacity 1→0, 0,35 s `OUT`, tâm đặt giữa nút. Nút bị chạm: translateY +8 px và bóng còn 0 px trong 0,1 s, rồi trả về trong 0,15 s `SPRING`. |

Dựng theo số khung (frame), không theo đồng hồ thật, để mỗi lần render ra giống hệt nhau.

---

## 3. Bảng phân cảnh tổng quát

| # | Thời gian (s) | Khung | Nền | Chữ chính | Coal |
|---|---|---|---|---|---|
| 1 | 0,0–2,3 | 0–68 | `#F8F6F2` | "Tải về rồi..." / "để đó." | sleepy |
| 2 | 2,3–4,7 | 69–140 | `#E9EEFD` | "Mở ra: 312 trang." / "Học từ đâu đây?" | lost |
| 3 | 4,7–8,1 | 141–242 | `#2344C9` | "Thả vào Studia." + chip "Trang 1–24: học được rồi" | hello → excited |
| 4 | 8,1–11,1 | 243–332 | `#F8F6F2` | "Thành bài học" / "mỗi ngày." | focus |
| 5 | 11,1–15,3 | 333–458 | `#FFEDE3` | "Flashcard từ" / "sách của bạn." + "Ôn lại đúng lúc sắp quên." | smile → happy |
| 6 | 15,3–18,6 | 459–557 | `#E1F4EC` | "Quiz để nhớ lâu." + "Đúng rồi!" | cheer |
| 7 | 18,6–21,8 | 558–653 | `#0F1F4D` | "Học đều mỗi ngày," / "lửa càng bùng to." | happy → fire0 → fire2 → fire3 → fire4 |
| 8 | 21,8–24,6 | 654–737 | `#F8F6F2` | logo, "Cuốn sách của bạn / thành lộ trình học.", CTA | fireM |

Chữ dài nhất mỗi dòng ≤ 7 từ. Mỗi câu hiện rõ ≥ 1,2 s trước khi bị lớp quét phủ (đã tính trong mốc giờ bên dưới).

---

## 4. Chi tiết từng cảnh

### Cảnh 1 — Móc câu: "Tải về rồi... để đó." (0,0–2,3)
**Nền** `#F8F6F2`. **Khung 0 đã phải có nội dung** (dòng A, thẻ PDF, huy hiệu, Coal) để người lướt dừng lại ngay.

| Vật thể | Vị trí / kích thước | Nội dung, kiểu |
|---|---|---|
| Tiêu đề dòng A | x 80, y 300–396, căn trái | "Tải về rồi..." Bricolage 800, 96 px, `#0E1630` |
| Tiêu đề dòng B | x 80, y 400–496 | "để đó." Bricolage 800, 96 px, `#0E1630` |
| Thẻ PDF (mục 5.1) | x 160–920, y 640–860, xoay −4° | dạng "bụi phủ": có mạng nhện ở góc trên trái |
| Huy hiệu đếm ngày | tâm x 540, y 920–1010, viên thuốc, nền `#0F1F4D`, bo 45, đệm ngang 40 | "Mở lần cuối: **97** ngày trước" Be Vietnam Pro 700, 40 px, `#F8F6F2`; số "97" màu `#FFE27A` |
| Coal | `sleepy.webp`, rộng 440, x 320–760, y 1060–1490 | ngủ gật |
| Bụi | 8 chấm tròn `#80869E` 6–10 px rải quanh thẻ | |

**Chuyển động**
- 0,0: dòng A, thẻ, huy hiệu, Coal đã đứng sẵn.
- 0,0–1,1: số trong huy hiệu đếm 1→97 (số nguyên, `OUT`).
- 0,35–0,65: dòng B LỘ CHỮ.
- 0,0–2,3: Coal "thở": scaleY 1→1.03→1, chu kỳ 1,6 s `INOUT` (không NHÚN). Bụi trôi lên 20 px suốt cảnh, tuyến tính.
- 1,15–1,45: huy hiệu rung nhẹ khi đếm xong (rotate 0→−3°→3°→0, 0,3 s).
- **Chuyển cảnh** T = 2,3: QUÉT, lớp 1 `#2344C9`, lớp 2 `#E9EEFD` (2,0–2,3).

### Cảnh 2 — Vấn đề: "Mở ra: 312 trang. Học từ đâu đây?" (2,3–4,7)
**Nền** `#E9EEFD`.

| Vật thể | Vị trí / kích thước | Nội dung, kiểu |
|---|---|---|
| Dòng 1 | x 80, y 300–396 | "Mở ra: 312 trang." Bricolage 800, 96 px, `#0E1630` |
| Dòng 2 | x 80, y 400–496 | "Học từ đâu đây?" Bricolage 800, 96 px, `#0E1630` |
| Chip đếm trang | góc phải trên ở (960, 540), cao 80, nền `#FFFFFF`, viền 5 px, bo 40, bóng 0 8px 0 | "Trang **1** / 312" Be Vietnam Pro 800, 40 px, `#0E1630` |
| Chồng trang (mục 5.2) | 4 tờ 520×700, tâm x 420, đáy y 1360, xoay quanh góc dưới trái | |
| Coal | `lost.webp`, rộng 400, x 560–960, y 1100–1490, nằm trên chồng trang | dấu "?" có sẵn trong ảnh |

**Chuyển động**
- 2,35–2,70: dòng 1 LỘ CHỮ. 2,80–3,10: dòng 2 LỘ CHỮ.
- 2,35–2,85: 4 tờ xoè từ 0° về −12°, −6°, 0°, +6° (`SPRING`, so le 0,05 s).
- 2,40: Coal POP-IN.
- 2,50–3,60: số trang đếm 1→312 (`IN`, nhanh dần).
- 2,90–3,50: "lật lia lịa": lần lượt 4 tờ trên cùng bay ra (translate(−600, −200), rotate −30°, 0,2 s `IN`, so le 0,15 s); tờ dưới cùng mang số "312" ở chân trang.
- 3,60–3,90: chip rung (rotate ±4°, 3 nhịp).
- 2,8–4,7: Coal nghiêng đầu (rotate −4°↔4°, chu kỳ 1,0 s `INOUT`).
- **Chuyển cảnh** T = 4,7: QUÉT, lớp 1 `#FFE27A`, lớp 2 `#2344C9` (4,4–4,7).

### Cảnh 3 — Giải pháp: "Thả vào Studia." (4,7–8,1)
**Nền** `#2344C9`.

| Vật thể | Vị trí / kích thước | Nội dung, kiểu |
|---|---|---|
| Dòng 1 | x 80, y 300–396 | "Thả vào Studia." Bricolage 800, 96 px, `#FFFFFF` |
| Ô thả file | x 120–960, y 560–860, bo 40, nền `#1A3399`, viền nét đứt 6 px `#F8F6F2` (nét 24, khoảng 16) | chữ giữa ô "Thả PDF vào đây" Be Vietnam Pro 600, 40 px, `#E9EEFD` |
| Thẻ PDF (mục 5.1) | rơi vào giữa ô: x 160–920, y 600–820, không xoay, không bụi; có thanh tiến độ | |
| Chip xong | tâm x 540, y 900–990, nền `#E1F4EC`, viền 5 px, bo 45, bóng 0 8px 0 | ô tròn 44 px `#0D7A5F` có dấu tick trắng + "Trang 1–24: học được rồi" Be Vietnam Pro 800, 40 px, `#0D7A5F` |
| Coal | `hello.webp` rồi `excited.webp`, rộng 460, x 310–770, y 1040–1490 | |

**Chuyển động**
- 4,75: Coal `hello` POP-IN, kèm trồi lên từ y+200 (`SPRING`, 0,45 s), sau đó NHÚN.
- 4,85–5,20: dòng 1 LỘ CHỮ.
- 4,80–5,10: ô thả file hiện ra (scale 0.95→1, opacity 0→1, `OUT`); nét đứt chạy vòng (stroke-dashoffset −40 px/s).
- 5,20–5,70: thẻ PDF rơi từ y −300 xuống chỗ đứng (`IN`). Chữ "Thả PDF vào đây" mờ dần 5,4–5,6.
- 5,70–5,90: thẻ chạm đáy thì co giãn: scaleX 1.05 / scaleY 0.9 → 1 (`SPRING`).
- 5,75: Coal đổi sang `excited` (POP).
- 5,90–7,80: thanh tiến độ trong thẻ chạy 0→35% (tuyến tính). Ý nghĩa: sách vẫn đang được xử lý, nhưng phần đầu đã học được.
- 6,20–6,50: chip xong POP-IN. 6,50–6,80: dấu tick vẽ nét (stroke-dashoffset về 0).
- **Chuyển cảnh** T = 8,1: QUÉT, lớp 1 `#F2611F`, lớp 2 `#F8F6F2` (7,8–8,1).

### Cảnh 4 — Lộ trình theo ngày (8,1–11,1)
**Nền** `#F8F6F2`.

| Vật thể | Vị trí / kích thước | Nội dung, kiểu |
|---|---|---|
| Dòng 1 | x 80, y 300–396 | "Thành bài học" Bricolage 800, 96 px, `#0E1630` |
| Dòng 2 | x 80, y 400–496 | "mỗi ngày." Bricolage 800, 96 px, `#0E1630`; GẠCH DẠ QUANG sau "mỗi ngày" |
| Thẻ Ngày 1 (mục 5.3) | x 120–960, y 600–800 | |
| Thẻ Ngày 2 | x 120–960, y 836–1036 | |
| Thẻ Ngày 3 | x 120–960, y 1072–1272 | |
| Coal | `focus.webp`, rộng 300, x 660–960, y 1247–1540, nằm trên thẻ 3 | |

**Chuyển động**
- 8,15–8,50: dòng 1 LỘ CHỮ. 8,30–8,65: dòng 2 LỘ CHỮ. 8,70–9,00: GẠCH DẠ QUANG.
- Ba thẻ bay vào từ phải (translateX +1000→0, 0,45 s `SPRING`), bắt đầu lần lượt 8,45 / 8,60 / 8,75.
- 9,10: Coal POP-IN, sau đó NHÚN.
- 9,30: nhãn "Hôm nay" trên thẻ Ngày 1 POP-IN.
- 9,80–10,20: thẻ Ngày 1 đập nhịp (scale 1→1.03→1, `INOUT`).
- **Chuyển cảnh** T = 11,1: QUÉT, lớp 1 `#2344C9`, lớp 2 `#FFEDE3` (10,8–11,1).

### Cảnh 5 — Flashcard và ôn đúng lúc (11,1–15,3)
**Nền** `#FFEDE3`.

| Vật thể | Vị trí / kích thước | Nội dung, kiểu |
|---|---|---|
| Dòng 1 | x 80, y 300–396 | "Flashcard từ" Bricolage 800, 96 px, `#0E1630` |
| Dòng 2 | x 80, y 400–496 | "sách của bạn." Bricolage 800, 96 px, `#0E1630` |
| Thẻ từ (mục 5.4) | x 160–920, y 560–1160 | mặt trước "mitigate", mặt sau nghĩa + ví dụ |
| Coal | `smile.webp` rồi `happy.webp`, rộng 220, x 770–990, y 360–575 (ngồi trên mép phải thẻ) | |
| 4 nút đánh giá (mục 5.5) | y 1220–1330, x 124–956 | Quên / Khó / Được / Dễ |
| Dòng phụ | tâm x 540, y 1380–1440 | "Ôn lại đúng lúc sắp quên." Be Vietnam Pro 700, 44 px, `#0E1630` |

**Chuyển động**
- 11,15–11,50: dòng 1 LỘ CHỮ. 11,30–11,65: dòng 2 LỘ CHỮ.
- 11,20–11,60: thẻ từ bay lên từ y+420, rotate 8°→0 (`SPRING`).
- 11,50: Coal `smile` POP-IN, sau đó NHÚN.
- 11,60–12,80: mặt trước đứng yên 1,2 s (đủ để đọc "mitigate").
- 12,80–13,25: lật thẻ: rotateY 0→180°, `INOUT`, `perspective: 1600px`, `backface-visibility: hidden`.
- 13,25: Coal đổi sang `happy` (POP).
- 13,30 / 13,36 / 13,42 / 13,48: 4 nút trồi lên (translateY +60→0, opacity 0→1, 0,3 s `SPRING`).
- 13,40–13,70: dòng phụ LỘ CHỮ.
- 14,20: CHẠM vào nút "Được"; 14,30 nút đổi nền `#2344C9`, chữ `#FFFFFF`.
- **Chuyển cảnh** T = 15,3: QUÉT, lớp 1 `#0D7A5F`, lớp 2 `#E1F4EC` (15,0–15,3).

### Cảnh 6 — Quiz (15,3–18,6)
**Nền** `#E1F4EC`.

| Vật thể | Vị trí / kích thước | Nội dung, kiểu |
|---|---|---|
| Dòng 1 | x 80, y 300–396 | "Quiz để nhớ lâu." Bricolage 800, 96 px, `#0E1630` |
| Thẻ câu hỏi (mục 5.6) | x 120–960, y 440–820 | |
| 4 ô đáp án (mục 5.6) | lưới 2×2, mỗi ô 410×130, cách 20: x 120–530 và 550–960; y 870–1000 và 1020–1150 | A resilient · B mitigate · C reluctant · D abundant |
| Nhãn "Đúng rồi!" | x 120–420, y 1220–1310, nền `#FFE27A`, viền 5 px, bo 45, bóng 0 8px 0 | "Đúng rồi!" Be Vietnam Pro 800, 44 px, `#0E1630` |
| Coal | `cheer.webp`, rộng 340, x 600–940, y 1190–1522 | |

**Chuyển động**
- 15,35–15,70: dòng 1 LỘ CHỮ.
- 15,40–15,80: thẻ câu hỏi rơi từ y −200 (`SPRING`).
- 15,60 / 15,68 / 15,76 / 15,84: 4 ô đáp án POP-IN.
- 16,60: CHẠM ô B. 16,65: ô B đổi nền `#0D7A5F`, chữ `#FFFFFF`, hiện tick trắng ở góc phải; ô A, C, D đổi chữ và viền sang `#80869E`, bóng còn 0.
- 16,70–17,00: chỗ trống trong câu được điền "mitigate" màu `#0D7A5F` (lộ từ trái sang phải bằng mặt nạ `clip-path inset`, `OUT`), gạch chân 4 px cùng màu.
- 16,70: nhãn "Đúng rồi!" POP-IN.
- 16,75: Coal POP-IN kèm nhảy (translateY −60→0, 0,45 s `SPRING`), sau đó NHÚN.
- **Chuyển cảnh** T = 18,6: QUÉT, lớp 1 `#F2611F`, lớp 2 `#0F1F4D` (18,3–18,6).

### Cảnh 7 — Học đều, lửa bùng to (18,6–21,8)
**Nền** `#0F1F4D`.

| Vật thể | Vị trí / kích thước | Nội dung, kiểu |
|---|---|---|
| Dòng 1 | x 80, y 260–344 | "Học đều mỗi ngày," Bricolage 800, 84 px, `#F8F6F2` |
| Dòng 2 | x 80, y 350–434 | "lửa càng " `#F8F6F2` + "bùng to." `#F2611F`, Bricolage 800, 84 px |
| Bộ đếm chuỗi | tâm x 540, y 480–660, cùng đường chân chữ | số Bricolage 800, 170 px, `#FFE27A` + " ngày" Bricolage 800, 64 px, `#F8F6F2` |
| Quầng tròn | tâm (540, 1063), nền phẳng `#1B2A5E`, nằm sau Coal | bán kính đổi theo từng mốc |
| Coal | rộng 620, x 230–850, y 760–1366, tâm (540, 1063) | đổi tư thế theo từng mốc |
| Hàng mốc | 5 viên thuốc 150×70, cách 18, x 129–951, y 1420–1490, bo 35 | "1" "3" "7" "14" "30" Bricolage 800, 36 px. Chưa đạt: viền 4 px `#273055`, chữ `#949BB8`. Đã đạt: nền và viền `#FFE27A`, chữ `#0F1F4D` |
| Tia sáng | 12 thanh 10×60 px `#FFE27A`, bo 5, xếp vòng bán kính 400 quanh tâm Coal | chỉ hiện ở mốc 30 |

**Các mốc** (mỗi lần: đổi tư thế Coal bằng POP; số cũ trượt lên ra ngoài, số mới trượt lên vào trong 0,2 s `OUT`; viên mốc tương ứng sáng lên bằng POP; quầng tròn đổi bán kính trong 0,3 s `SPRING`)

| Lúc (s) | Số | Coal | Bán kính quầng |
|---|---|---|---|
| 18,65 | 1 | `happy.webp` (POP-IN) | 0→220 |
| 19,10 | 3 | `fire0.webp` | 260 |
| 19,55 | 7 | `fire2.webp` | 300 |
| 20,00 | 14 | `fire3.webp` | 340 |
| 20,45 | 30 | `fire4.webp` | 400 |

**Chuyển động khác**
- 18,70–19,05: dòng 1 LỘ CHỮ. 19,20–19,55: dòng 2 LỘ CHỮ.
- Coal NHÚN suốt cảnh, mỗi mốc nhún nhanh hơn: chu kỳ 0,8 → 0,7 → 0,6 → 0,5 → 0,45 s.
- 20,45–20,75 (cao trào): cả khung rung (translate ±6 px, 6 nhịp); 12 tia sáng POP-IN rồi xoay chậm 20°/s; 10 tia lửa nhỏ (hình thoi 18 px, xen kẽ `#F2611F` và `#FFE27A`) bắn ra từ tâm Coal theo hướng toả tròn, bay 260–420 px, 0,5 s `OUT`, opacity 1→0.
- 20,45–21,30: giữ `fire4`, tia sáng vẫn xoay.
- **Chuyển cảnh** T = 21,8 bằng hai vòng tròn nở (iris), tâm (540, 1063): vòng `#F2611F` bán kính 0→2300 trong 21,30–21,60 (`IN`), rồi vòng `#F8F6F2` bán kính 0→2300 trong 21,50–21,80 (`IN`). Ý: lửa bùng lên phủ cả màn hình.

### Cảnh 8 — Khung kết, đồng thời là ảnh bìa (21,8–24,6, giữ 2,8 s)
**Nền** `#F8F6F2`. Mọi thứ căn giữa theo trục x 540. Toàn bộ nằm trong y 260–1530, nên khi IG cắt lưới 3:4 (y 240–1680) vẫn thấy đủ.

| Vật thể | Vị trí / kích thước | Nội dung, kiểu |
|---|---|---|
| Logo | cụm rộng khoảng 392: dấu logo 92×92 + cách 20 + wordmark; y 260–360 | dấu logo SVG (mục 5.7) + "studia" Bricolage 800, 84 px, `#0F1F4D`, chữ thường |
| Tiêu đề dòng 1 | y 440–528 | "Cuốn sách của bạn" Bricolage 800, 88 px, `#0E1630` |
| Tiêu đề dòng 2 | y 535–623 | "thành lộ trình học." Bricolage 800, 88 px, `#0E1630`; GẠCH DẠ QUANG sau "lộ trình học" |
| Coal | `fireM.webp` (đeo kính râm, có quầng sáng), rộng 520, x 280–800, y 680–1188 | |
| Nút CTA | x 130–950, y 1230–1350, nền `#F2611F`, viền 6 px `#0F1F4D`, bo 60, bóng 0 10px 0 `#0F1F4D` | "Miễn phí cuốn sách đầu tiên" Be Vietnam Pro 800, 46 px, `#0E1630` |
| Dòng link | y 1400–1462 | "Link ở bio →" Be Vietnam Pro 800, 48 px, `#0F1F4D` |
| Khẩu hiệu | y 1490–1530 | "Học đúng điều cần học." Be Vietnam Pro 600, 32 px, `#5E6480` |

**Chuyển động**
- 21,85: logo POP-IN.
- 21,95–22,30: tiêu đề dòng 1 LỘ CHỮ. 22,05–22,40: dòng 2 LỘ CHỮ. 22,45–22,75: GẠCH DẠ QUANG.
- 22,00–22,45: Coal POP-IN (scale bắt đầu từ 0.6), rồi NHÚN 2 chu kỳ (22,45–24,05), dừng ở tư thế gốc.
- 22,30–22,75: nút CTA trượt lên từ y+160 (`SPRING`).
- 22,50–22,85: dòng link LỘ CHỮ. 22,60–22,90: khẩu hiệu LỘ CHỮ.
- 23,30–23,70: nút CTA đập nhịp (scale 1→1.04→1, `INOUT`).
- 23,00–24,00: mũi tên "→" đẩy qua lại x 0→10→0, chu kỳ 0,5 s, kết thúc ở 0.
- **24,10–24,60: đứng yên hoàn toàn.** Ảnh bìa đề xuất: khung 732 (24,4 s).

---

## 5. Thành phần giao diện mô phỏng cần vẽ

### 5.1 Thẻ PDF
- 760×220, nền `#FFFFFF`, viền 6 px, bo 32, bóng 0 12px 0.
- Bên trái (đệm 40): biểu tượng tệp 120×150, nền `#FFEDE3`, viền 5 px `#0F1F4D`, bo 14; góc trên phải gập chéo 36 px tô `#F2611F`; chữ "PDF" Be Vietnam Pro 800, 34 px, `#F2611F` ở giữa.
- Bên phải (x bắt đầu 200 trong thẻ): "Tai-lieu-cua-ban.pdf" Be Vietnam Pro 700, 40 px, `#0E1630`; dưới đó "312 trang · bản scan" Be Vietnam Pro 400, 32 px, `#5E6480`.
- Cảnh 1 thêm mạng nhện ở góc trên trái: SVG 120×120, 3 tia và 2 cung, nét 3 px `#80869E`.
- Cảnh 3 thêm thanh tiến độ: x 200–720 trong thẻ, cách đáy thẻ 30, cao 14, bo 7; rãnh `#E5E0D8`, phần chạy `#F2611F`.

### 5.2 Chồng trang (cảnh 2)
- 4 tờ 520×700, nền `#FFFFFF`, viền 5 px, bo 18.
- Tờ trên cùng: một thanh tiêu đề `#0E1630` 300×28, bo 14; dưới là 9 thanh chữ giả `#E5E0D8` cao 18, cách 26, dài 380/440/410/460/300/440/420/360/250; số trang ở chân "1" Be Vietnam Pro 600, 28 px, `#5E6480`.
- Tờ dưới cùng ghi chân trang "312".

### 5.3 Thẻ bài học theo ngày (cảnh 4)
- 840×200, nền `#FFFFFF`, viền 6 px, bo 32, bóng 0 10px 0.
- Ô ngày bên trái 140×140 (đệm 30), bo 24: chữ "NGÀY" Be Vietnam Pro 800, 26 px + số Bricolage 800, 64 px.
  - Ngày 1: nền `#2344C9`, chữ `#FFFFFF`.
  - Ngày 2, 3: nền `#E9EEFD`, chữ `#0F1F4D`.
- Bên phải (x bắt đầu 200 trong thẻ): tên bài Be Vietnam Pro 700, 40 px, `#0E1630`; dòng meta Be Vietnam Pro 400, 30 px, `#5E6480`.

| Ngày | Tên bài | Meta |
|---|---|---|
| 1 | Từ vựng: Environment | Trang 1–8 · 12 thẻ · 15 phút |
| 2 | Đọc: tìm ý chính | Trang 9–16 · 1 quiz · 18 phút |
| 3 | Nghe: điền thông tin | Trang 17–24 · 20 phút |

- Thẻ Ngày 1 có nhãn "Hôm nay" ở góc trên phải (cách mép 24): viên thuốc nền `#F2611F`, viền 4 px, bo 24, Be Vietnam Pro 800, 26 px, `#0E1630`.

### 5.4 Thẻ từ (cảnh 5)
760×600, nền `#FFFFFF`, viền 6 px, bo 40, bóng 0 14px 0.

**Mặt trước**
- Chip "verb" ở góc trên trái (đệm 40): nền `#E9EEFD`, bo 20, Be Vietnam Pro 700, 28 px, `#2344C9`.
- "mitigate": Literata 600, 120 px, `#0E1630`, căn giữa, tâm chữ ở y 820 (toạ độ khung).
- "/ˈmɪtɪɡeɪt/": Be Vietnam Pro 400, 36 px, `#5E6480`, ngay dưới.
- Chân thẻ: "Chạm để lật" Be Vietnam Pro 600, 28 px, `#5E6480`.

**Mặt sau**
- "giảm nhẹ, làm dịu bớt": Be Vietnam Pro 800, 60 px, `#0E1630`, tâm ở y 720.
- Đường chia 600 px, cao 3 px, `#E5E0D8`.
- Ví dụ, Literata 400 italic, 44 px, `#3A4260`, hai dòng căn giữa: "Trees help mitigate the" / "effects of flooding." Chữ "mitigate" có GẠCH DẠ QUANG tĩnh.
- Chân thẻ: "Trang 3 · tài liệu của bạn" Be Vietnam Pro 600, 28 px, `#5E6480`.

### 5.5 Nút đánh giá (cảnh 5)
- 4 nút 196×110, cách 16, nền `#FFFFFF`, viền 5 px, bo 28, bóng 0 8px 0.
- Chữ Be Vietnam Pro 800, 36 px: "Quên" `#C0281C`, "Khó" `#A15C00`, "Được" `#2344C9`, "Dễ" `#0D7A5F`.

### 5.6 Quiz (cảnh 6)
**Thẻ câu hỏi**: 840×380, nền `#FFFFFF`, viền 6 px, bo 36, bóng 0 12px 0.
- Nhãn "Câu 3/10" ở góc trên trái (đệm 36): Be Vietnam Pro 700, 28 px, `#0D7A5F`.
- Câu hỏi: Literata 500, 50 px, `#0E1630`, căn giữa, cao dòng 64, ba dòng:
  - "Sea walls can ______"
  - "the damage caused"
  - "by storms."
- Chỗ trống là gạch dưới 200 px, dày 5 px, `#0E1630`; sau khi trả lời đúng thì thay bằng "mitigate".

**Ô đáp án**: nền `#FFFFFF`, viền 5 px, bo 28, bóng 0 8px 0. Chữ cái đáp án Be Vietnam Pro 800, 32 px, `#5E6480` ở bên trái (đệm 32), từ Literata 600, 48 px, `#0E1630`.
- A resilient
- B mitigate (đáp án đúng)
- C reluctant
- D abundant

### 5.7 Dấu logo Studia
SVG `viewBox="0 0 48 48"`, lấy từ `frontend/public/icon.svg`, bỏ ô nền:
```
<path fill="#0F1F4D" d="M4 13.5A9.5 9.5 0 0 1 13.5 4H34a2 2 0 0 1 2 2v17H13.5A9.5 9.5 0 0 1 4 13.5z"/>
<path fill="#F2611F" d="M12 25h22.5a9.5 9.5 0 0 1 0 19H14a2 2 0 0 1-2-2z"/>
```

---

## 6. Gợi ý âm thanh (tuỳ chọn)
Chỉ dùng tiếng tự tạo (Web Audio hoặc jsfxr) hoặc thư viện CC0. Không dùng nhạc có bản quyền. Video vẫn phải hiểu khi tắt tiếng.

| Lúc (s) | Tiếng |
|---|---|
| 0,0–1,1 | tích tắc nhỏ theo nhịp đếm (cao độ tăng dần) |
| 2,0 / 4,4 / 7,8 / 10,8 / 15,0 / 18,3 | whoosh ngắn (tiếng ồn trắng qua bộ lọc thông dải, quét tần số, 0,25 s) |
| 2,9–3,5 | 4 tiếng sột soạt lật giấy |
| 4,75 | pop (sine 600→900 Hz, 80 ms) |
| 5,70 | bụp trầm khi thẻ chạm đáy (sine 120 Hz, 120 ms) |
| 6,20 | ting (sine 1320 Hz, tắt dần 300 ms) |
| 8,45 / 8,60 / 8,75 | 3 tiếng "vụt" nhẹ khi thẻ bay vào |
| 12,80 | tiếng "phạch" lật thẻ |
| 14,20 / 16,60 | click nút |
| 16,65 | hai nốt "đúng" (E5→A5) |
| 18,65 / 19,10 / 19,55 / 20,00 | pop, cao dần mỗi mốc |
| 20,45 | "bùng" lửa (ồn trắng qua bộ lọc thông thấp + sine 80 Hz, 400 ms) |
| 21,30 | whoosh dài |
| 22,30 | ting nhẹ khi nút CTA vào |

Nhạc nền (nếu muốn): vòng lặp tự soạn 100 BPM, chỉ marimba + kick nhẹ, âm lượng −18 dB.

---

## 7. Caption, hashtag, biến thể móc câu

### 7.1 Caption đăng kèm
> Tài liệu IELTS tải về rồi để đó? Thả vào Studia, Coal chia thành bài học cho từng ngày, kèm flashcard và quiz làm từ chính cuốn sách của bạn. Trang nào xử lý xong là học được ngay, bản scan cũng được. Miễn phí cuốn sách đầu tiên, không cần thẻ ngân hàng. Link ở bio.

**Hashtag**: #IELTS #tuhocIELTS #hoctienganh #flashcard #studytok

### 7.2 Hai biến thể móc câu để thử A/B
Chỉ thay cảnh 1 (0,0–2,3). Mốc giờ, kiểu QUÉT và cảnh 2 trở đi giữ nguyên. Bản mặc định trong kịch bản là **A**.

**Biến thể B: "Mai học IELTS (lần thứ 12)"**
- Nền `#F8F6F2`.
- Dòng 1 (x 80, y 300–396, hiện sẵn từ khung 0): "Mai học IELTS." Bricolage 800, 96 px, `#0E1630`.
- Dòng 2 (y 400–496): "(lần thứ 12)" Bricolage 800, 96 px, `#F2611F`, LỘ CHỮ lúc 0,35–0,65. Số trong dòng 2 đếm 1→12 trong 0,35–1,1 (`OUT`).
- Thay thẻ PDF bằng tờ lịch 360×400 (tâm x 540, y 620–1020), nền `#FFFFFF`, viền 6 px, bo 32, bóng 0 12px 0, dải đầu `#F2611F` cao 90. Chữ "Thứ Hai" Be Vietnam Pro 800, 40 px, `#0E1630`; dưới là việc cần làm "Học IELTS" bị gạch ngang bằng nét `#C0281C` 6 px (nét vẽ ra trong 0,9–1,2).
- Coal `wet0.webp` (giọt nước rơm rớm), rộng 440, x 320–760, y 1060–1490; run nhẹ (translateX ±3 px, chu kỳ 0,15 s), không trách móc.

**Biến thể C: "Tai-lieu-cua-ban (7).pdf"**
- Nền `#F8F6F2`.
- Dòng 1 (hiện sẵn từ khung 0): "Tải lần thứ 7 rồi..." Bricolage 800, 96 px, `#0E1630`.
- Dòng 2 (LỘ CHỮ lúc 0,35–0,65): "vẫn chưa mở." Bricolage 800, 96 px, `#0E1630`.
- 7 thẻ PDF thu nhỏ (thẻ mục 5.1 ở scale 0.8, rộng 608) chồng lệch nhau 28 px, tâm x 540, bắt đầu từ y 640. Tên tệp lần lượt "Tai-lieu-cua-ban.pdf", "Tai-lieu-cua-ban (1).pdf" … "Tai-lieu-cua-ban (7).pdf". Mỗi thẻ thả từ trên xuống mỗi 0,12 s trong 0,0–0,84 (`SPRING`); thẻ cuối nằm trên cùng.
- Coal `surprised.webp`, rộng 400, x 560–960, y 1100–1500, POP lúc 0,9.

Đo trong 48 giờ đầu: tỉ lệ xem qua giây thứ 3 và thời gian xem trung bình. Giữ biến thể nào thắng cho các Reel sau.

---

## 7. Lồng tiếng (giọng nữ, đã dựng)

Gemini TTS, giọng `Leda`, dặn "giọng nữ trẻ miền Bắc, ngọt, ấm, tự nhiên như nói chuyện với bạn thân". Dự phòng: Microsoft Hoài My. Nhạc nền và hiệu ứng tự hạ ~8 dB khi có giọng. Nguồn: `brand/video/reel-01/voice.py`.

| Thời điểm (s) | Cảnh | Lời thoại |
|---|---|---|
| 0,15 | 1 | Tải về rồi… để đó hả? |
| 2,40 | 2 | Ba trăm trang… học từ đâu đây? |
| 4,85 | 3 | Thả vào Studia nè, trang nào xong là học liền. |
| 8,25 | 4 | Sách thành bài học, mỗi ngày một chút. |
| 11,30 | 5 | Flashcard từ chính cuốn sách, nhắc bạn ôn đúng lúc sắp quên. |
| 15,45 | 6 | Làm quiz nhỏ, nhớ lâu hơn hẳn. |
| 18,75 | 7 | Học đều mỗi ngày, lửa Coal cháy to! |
| 21,95 | 8 | Cuốn đầu tiên, miễn phí nha! |
