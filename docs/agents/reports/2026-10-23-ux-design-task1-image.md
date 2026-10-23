# Thiết kế cách xem hình Writing Task 1 trong phòng thi (T37)

Người viết: UX Senior · Ngày: 2026-10-23 · Phương pháp: chỉ đọc code và báo cáo trước (không chạy server, không mở trình duyệt). Số dòng lấy từ working tree hiện tại (chưa commit), `frontend/src/app/exam/[id]/page.tsx` (2256 dòng) và `room.css` (151 dòng); dòng có thể lệch vài dòng. Mọi số px dưới đây là tính toán, phải đo lại (mục "Giả thuyết").

Kích thước gốc các ảnh Task 1 (đọc từ header PNG): C16 Test 1 840x1020, Test 2 1040x1093, Test 3 1060x1077, Test 4 1040x1093; C21 Test 1 1240x704, Test 2 720x986, Test 3 1260x904, Test 4 900x940. Ảnh C16 gần vuông hoặc cao, nên "gò vào chiều rộng cột" luôn ra ảnh cao 300–400px nhưng chữ chỉ 25–45% cỡ gốc.

## 1. Kết luận

Cột đề 320–540px không bao giờ đủ để đọc chữ 20px của ảnh gốc (mặt bằng sân bay C16 Test 3 cần ít nhất ~60% cỡ gốc cho số cổng và chú giải). Vì vậy giải pháp cốt lõi là **lớp xem hình (lightbox) mở bằng nút "Phóng to hình", có Vừa khung / 100% / 150% / 200%, cuộn trong khung, đồng hồ thi vẫn thấy**, mở được từ cả hai tab trên điện thoại, trong tab "Bài viết" bằng nút "Xem hình đề" ngay hàng tiêu đề ô viết. Quanh đó là các sửa nhỏ: hình chuyển xuống SAU câu đề và hộp "Yêu cầu tối thiểu" (đúng thứ tự sách, và dòng số từ luôn thấy ngay), cột đề rộng hơn một chút khi đề có hình, nhãn khung chung "Task 1 — Summarise the information", alt lấy từ câu mô tả đề, khung giấy trắng có viền ở dark mode, và trạng thái đang tải / lỗi tải.

Không chọn: chia ba cột, hình ghim cố định cạnh ô viết, thu nhỏ hình nổi trên ô viết (lý do ở mục 3). Phần "ghim hình cạnh ô viết trong lúc gõ" ghi là giả thuyết để thử với người học, không làm trong T37.

## 2. Nguyên tắc

1. Đọc được số liệu và nhãn mà KHÔNG rời trang viết: mở lớp xem hình rồi đóng là về đúng chỗ, chữ đang viết không đổi, không mất focus vô cớ, không phải tải lại.
2. Đồng hồ thi luôn thấy: lớp xem hình không phủ lên header (ExamTimer).
3. Không đảo màu hay lọc ảnh làm sai dữ liệu: ở dark mode chỉ đặt khung giấy trắng và có thể giảm sáng nhẹ (xem 4.6), tuyệt đối không `invert`.
4. Một kiểu cho cả hai nền tảng: cùng một component, CSS đổi bố cục. Nút có chữ, không icon, dùng `st-btn`.
5. Hỏng ảnh không được chặn việc viết: lỗi tải hình chỉ hiện thông báo và nút thử lại, ô viết vẫn dùng bình thường.
6. Không đụng phạm vi T32 (xem mục 8).

## 3. Phương án và đánh đổi

| Phương án | Được | Mất | Quyết định |
|---|---|---|---|
| A. Chỉ nới cột đề (ví dụ 45%) | Không thêm thành phần mới | Vẫn chỉ ~45% cỡ gốc ở 1280 (ảnh 1060px còn ~470px), ô viết hẹp lại, mobile không đổi | Không đủ, chỉ lấy một phần nhỏ (4.2) |
| B. Lightbox modal có cuộn và mức phóng | Đọc ở 100–200%, giải quyết cả desktop lẫn mobile, ít đổi bố cục | Xem hình thì không gõ cùng lúc được, người học phải nhớ chi tiết | CHỌN |
| C. Ghim hình thành cột thứ ba / nổi trên ô viết | Vừa xem vừa gõ thật sự | Ở 1280 ba cột quá hẹp, mobile mất ~40% chiều cao ô viết, cần kéo/di chuyển (cử chỉ ẩn), phức tạp | Không làm; thử giả thuyết sau |
| D. Hình thu nhỏ cố định phía trên ô viết ở mobile | Luôn thấy hình | Chiếm ~100px mà vẫn không đọc nổi chữ nhỏ | Không làm |
| E. Nút nổi (FAB) "Xem hình" ở mobile | Luôn thấy nút | Che chữ đang gõ, va với nút "Ghi chú" nổi và bàn phím | Không làm; dùng hàng tiêu đề ô viết |
| F. Đảo màu ảnh ở dark mode | Hết chói | Làm sai màu đường/cột trong biểu đồ | Cấm |

Đánh đổi chính của B: người học không thể vừa xem 200% vừa gõ. Chấp nhận vì (i) bài Task 1 chỉ cần tra số liệu theo lượt; (ii) hình vẫn nằm trong cột đề ở desktop và hình thu nhỏ đủ để định hướng; (iii) mở/đóng chỉ một thao tác (Esc, nút "Đóng").

## 4. Thiết kế

### 4.1 Thành phần dùng chung

- `Task1Figure` (trong khung đề): `<figure class="exam-fig">` chứa ảnh thu nhỏ + nút "Phóng to hình" (`st-btn st-btn-secondary st-btn-sm`).
- `ImageLightbox`: hộp thoại xem hình, render bằng `createPortal` vào `document.body` (để CSS `overflow:hidden` / `position` của `.exam-writing-layout` ở mobile không cắt). Vì portal nằm ngoài `.room-root`, CSS của nó dùng class riêng `.room-lb*` ở top-level, KHÔNG viết dưới `.room-root`.
- Trạng thái ảnh sống ở `WritingSection` để thumbnail, nút ở hàng ô viết và lightbox dùng chung: `imgState: "loading" | "ready" | "error"`, `imgTry: number` (số lần thử lại), `lbOpen: boolean`, `zoom: "fit" | 100 | 150 | 200`.

### 4.2 Desktop (>= 768px)

```
1280x800 (header 56, nav 60, vùng 684)
+-----------------------+-----------------------------------------+
| TASK 1 - SUMMARISE    | Task 1 - BÀI VIẾT            0 từ (cần  |
| THE INFORMATION       |                              thêm 150)  |
| You should spend ...  | +-------------------------------------+ |
| The plans below show  | |                                     | |
| the site of an        | |   textarea                          | |
| airport ...           | |                                     | |
| Summarise ...         | |                                     | |
| Write at least 150    | |                                     | |
| words.                | |                                     | |
| [Yêu cầu tối thiểu:   | |                                     | |
|  150 từ]              | |                                     | |
| +-------------------+ | |                                     | |
| | (khung giấy)      | | |                                     | |
| |   hình thu nhỏ    | | |                                     | |
| |                   | | |                                     | |
| +-------------------+ | +-------------------------------------+ |
| [Phóng to hình]       | ======----------- thanh từ              |
+-----------------------+-----------------------------------------+
   cột đề ~512px (40%)             cột viết ~768px
```

Thứ tự trong cột đề, từ trên xuống (đổi so với hiện tại):
1. Nút Task 1/Task 2 (giữ).
2. Nhãn khung: "Task 1 — Summarise the information" / "Task 2 — Essay" (xem 4.5).
3. Các đoạn chữ đề (giữ nguyên cách tách `\n\n`).
4. Hộp xanh "Yêu cầu tối thiểu: N từ" (giữ y nguyên, lên trước hình).
5. `Task1Figure`: hình thu nhỏ rồi nút "Phóng to hình".

Lý do thứ tự: sách Cambridge đặt hình DƯỚI toàn bộ khối chữ đề (đề nói "below"); và dòng số từ tối thiểu không còn nằm dưới hình cao 330–390px nên không còn mục 8 ở T37 (cuộn dư 106–230px). Phần cuộn dư còn lại chỉ là phần dưới của hình, không mất thông tin bắt buộc.

Cột đề rộng hơn khi đề có hình: `grid-template-columns: clamp(380px, 40%, 520px) minmax(0, 1fr)`, gắn bằng thuộc tính `data-fig="1"` trên `.exam-writing-layout` khi đề có `task1Image` (áp dụng cho CẢ Task 1 lẫn Task 2 của đề đó, để chuyển Task không làm cột nhảy rộng/hẹp). Ước tính: 1280 -> cột 512px, vùng ảnh ~434px (trừ padding 24x2 và thanh cuộn 15) so với 321px hiện tại, tăng ~35%; 1024 -> 410px, vùng ảnh ~347px (tăng ~8%). Thành thật: đây chỉ giúp "nhìn thoáng"; đọc số liệu vẫn cần lightbox. Đề không có hình giữ 380px.

Ảnh thu nhỏ: `width: 100%; height: auto; display: block`. Con trỏ `zoom-in`, bấm vào ảnh = mở lightbox (chỉ chuột; truy cập bằng bàn phím đi qua nút "Phóng to hình", nên ảnh không cần `tabindex`). Hover: viền khung đổi `--brand`.

Nút "Phóng to hình": dưới ảnh, trái, `margin-top: 10px`, `st-btn st-btn-secondary st-btn-sm`, cao 32px (desktop), `aria-haspopup="dialog"`.

### 4.3 Điện thoại (<= 767px)

Giữ nguyên hai tab "Đề bài | Bài viết" đã làm. Thêm:

Tab "Đề bài" (390x844):
```
+------------------------------------------+ header 52
| [S] Writing · 3/4        [58:40] [Nộp bài]|
+------------------------------------------+
|   Đề bài         |   Bài viết            | tab 48
+------------------------------------------+
| TASK 1 - SUMMARISE THE INFORMATION        |
| You should spend ...                      |
| The plans below show ...                  |
| Summarise ... Write at least 150 words.   |
| [Yêu cầu tối thiểu: 150 từ]               |
| +--------------------------------------+ |
| |  hình thu nhỏ rộng 358                | |
| +--------------------------------------+ |
| [ Phóng to hình ]  (st-btn, 44px, rộng   |
|   toàn hàng)                              |
+------------------------------------------+
| [Task 1][Task 2]            [Phần tiếp]   |
+------------------------------------------+
```

Tab "Bài viết" (có hình, Task 1):
```
+------------------------------------------+ header 52
|   Đề bài         |   Bài viết            | tab 48
+------------------------------------------+
| Task 1    [ Xem hình đề ]   87 từ (cần   |  hàng tiêu đề, cao >= 44
|                              thêm 63)    |
| +--------------------------------------+ |
| | textarea                             | |
| +--------------------------------------+ |
| ======-----------  (thanh từ 4px)         |
+------------------------------------------+
| [Task 1][Task 2]            [Phần tiếp]   |
+------------------------------------------+
```

- Hàng tiêu đề ô viết (`page.tsx:2101-2112`) ở mobile, chỉ khi Task 1 có hình, thêm giữa nhãn và số từ nút `st-btn st-btn-secondary st-btn-sm room-w-viewimg` cao 44px, chữ "Xem hình đề". Nhãn rút còn "Task 1" (bỏ " — Bài viết" bằng `room-hide-sm`, `aria-label` giữ "Task 1 — Bài viết"). Nút không cố định nổi; nằm trong luồng nên không đè chữ đang gõ và không va nút "Ghi chú". Desktop: `display: none` (hình đã nằm trong cột đề).
- Chiều cao ô viết: hàng tiêu đề đã có sẵn (~36px) nên chiều cao thêm của nút tối đa ~8px (nút 44 thay hàng 36); ô viết ở 390x844 còn ~608px = 72% màn (vẫn >= 60%).
- Ở 360px: nhãn "Task 1" (~46px) + nút "Xem hình đề" (~104px) + số từ "87 từ (cần thêm 63)" (~125px) + 2 khoảng 8px = ~291 trong 336 khả dụng. Nếu số từ dài hơn, cho phép xuống 2 dòng trong chính ô số từ (`text-align: right`), nút không bao giờ bị cắt.
- Khi bấm "Xem hình đề": mở lightbox; bàn phím ảo đóng (do focus chuyển sang lightbox). Khi đóng: focus về nút "Xem hình đề" (KHÔNG focus lại textarea để khỏi bật bàn phím bất ngờ); người học chạm vào ô viết để gõ tiếp.

### 4.4 Lớp xem hình (lightbox)

Chung: `role="dialog" aria-modal="true" aria-labelledby="lb-title"`. Nền `--surface-sunken`. Vị trí `position: fixed; left: 0; right: 0; bottom: 0; top: var(--lb-top)` với `--lb-top: 56px` (desktop, bằng chiều cao `.exam-header` ở `globals.css:735`) và `52px` (mobile, bằng `--room-header-h`). `z-index: 10000`: cao hơn thanh điều hướng (9998) để phủ nó, nhưng không phủ header (9999 vì ở vùng y < 56) nên ExamTimer và nút "Nộp bài" vẫn thấy. Hộp "Nộp bài thi?" (99999) vẫn nằm trên cùng. Mở lớp xem hình không dừng đồng hồ.

Desktop 1280x800 (vùng 744px dưới header):
```
+-------------------------------------------------------------------+ y=56
| Hình đề Task 1     [Vừa khung][100%][150%][200%]          [Đóng]  | toolbar 52
| The plans below show the site of an airport now and ... (1 dòng)  | caption 28
+-------------------------------------------------------------------+
|                                                                   |
|          +---------------------------+                            |
|          | khung giấy trắng, ảnh      |   stage: overflow:auto    |
|          | (Vừa khung: ~690px cao)    |   tabindex=0              |
|          +---------------------------+                            |
|                                                                   |
+-------------------------------------------------------------------+
```
- Tiêu đề (`id="lb-title"`): "Hình đề Task 1" (18px/600). Caption: câu mô tả đề (đoạn chữ đầu tiên chứa "below", xem 4.5), 1 dòng, `text-overflow: ellipsis`, `title` đầy đủ, 13px `--ink-muted`; mục đích: nhắc người học đang xem hình của đề nào mà không phải đóng.
- Nhóm mức phóng: 4 nút `st-btn st-btn-secondary st-btn-sm` kiểu phân đoạn, nút đang chọn thêm lớp `is-active` (nền `--brand-tint`, chữ `--brand-hover`) và `aria-pressed="true"`. Chữ chính xác: "Vừa khung", "100%", "150%", "200%". Nhóm có `role="group" aria-label="Mức phóng"`.
- "Đóng": `st-btn st-btn-primary st-btn-sm`, bên phải, chữ "Đóng" (kèm gợi ý `title="Đóng (Esc)"`).
- Stage: `overflow: auto; display: flex; padding: 16px; overscroll-behavior: contain;`. Con (khung giấy) dùng `margin: auto` để căn giữa an toàn khi nhỏ và cuộn đủ khi lớn (tránh lỗi mất mép trên/trái của flex căn giữa). Khung giấy: `background: #fff; padding: 12px; border-radius: 8px; box-shadow: var(--shadow-lg)`.
- "Vừa khung": ảnh `max-width: 100%; max-height: calc(100vh - var(--lb-top) - 52px - 28px - 56px); width: auto; height: auto; object-fit: contain`. Tính cho 1280x800: vùng ảnh ~608px cao, T3 1077 -> hệ số ~0,56, chữ cổng 20px -> ~11px (gần đọc được); bấm "100%" để rõ.
- 100/150/200%: ảnh `width: naturalWidth * k px; max-width: none; height: auto`. T3 ở 100% rộng 1060px (< 1232 khung) cuộn dọc ~470px; ở 200% rộng 2120px, cuộn hai chiều. `naturalWidth` lấy từ `onLoad` của chính ảnh lightbox.
- Mặc định khi mở lần đầu: desktop "Vừa khung"; ghi nhớ mức đã chọn trong `zoom` cho đến khi rời Writing.
- Click chuột vào ảnh: chuyển "Vừa khung" <-> "100%" (con trỏ `zoom-in` / `zoom-out`); chỉ khi `pointerType === "mouse"`, trên cảm ứng không làm gì (tránh bấm nhầm khi kéo). Click nền stage (ngoài khung giấy) bằng chuột: đóng.

Mobile 390x844 (vùng 792px dưới header, toolbar nằm DƯỚI để dễ chạm bằng ngón cái):
```
+------------------------------------------+ y=52
| Hình đề Task 1                           | 40
| The plans below show the site of an ...  | caption 2 dòng, 13px
+------------------------------------------+
|                                          |
|  stage: cuộn hai chiều, tabindex=0       |
|  mặc định 100% (ảnh gốc), góc trên trái |
|                                          |
+------------------------------------------+
| [Vừa khung] [100%] [150%]      [ Đóng ]  | toolbar 56 + safe-area
+------------------------------------------+
```
- Mobile chỉ có 3 mức: "Vừa khung", "100%", "150%" (ẩn "200%" bằng CSS vì 150% đã đủ ở màn hình nhỏ và 360px không đủ chỗ cho 5 nút). Mỗi nút cao 44px, `min-width: 56px` ("Vừa khung" `min-width: 84px`), khoảng cách 8px. Nút "Đóng" `st-btn st-btn-primary`, 44px, `min-width: 72px`, nằm bên phải. Tổng ở 360: 84 + 56 + 56 + 24 + 72 + 24 (đệm) = 316 <= 336.
- Stage: `touch-action: pan-x pan-y pinch-zoom` để cuộn bằng một ngón và chụm hai ngón vẫn hoạt động (nếu `viewport` của trang không khoá zoom; hiện không có `maximum-scale`, giữ nguyên). Hai tay phóng to sẽ phóng cả trang, người dùng thoát bằng nút "Vừa khung"/"Đóng"; ghi vào giả thuyết.
- Mặc định mobile là "100%" chứ không phải "Vừa khung" vì "Vừa khung" ở 358px chỉ bằng tình trạng hiện tại (tỉ lệ 0,34 với C16 T3), không thêm giá trị. Dòng gợi ý 12px `--ink-muted` dưới caption, chỉ mobile: "Kéo để xem các phần khác. Bấm Vừa khung để xem toàn bộ hình." (dùng chung `aria-describedby` của stage).
- Ngang (844x390): vùng `390 - 44 = 346`, toolbar 44, caption ẩn, stage ~290px cao; vẫn dùng được.

Phím tắt (khi lightbox mở, focus nằm trong hộp):
- `Esc`: đóng. `+` hoặc `=`: tăng một mức (Vừa khung -> 100 -> 150 -> 200). `-`: giảm một mức. `0`: Vừa khung. `1`: 100%.
- Mũi tên, PageUp/PageDown, Home/End: cuộn stage (hành vi gốc của vùng cuộn có `tabindex=0`; không chặn).
- Không dùng phím chữ cái khác (tránh va với ô viết khi hộp đóng).

Thứ tự focus và bẫy focus:
1. Khi mở: focus chuyển vào stage (`tabindex="0"`, `role="region"`, `aria-label="Hình đề Writing Task 1. Dùng phím mũi tên để cuộn."`), để mũi tên cuộn ngay.
2. Tab: các nút mức phóng (trái sang phải) -> "Đóng" -> vòng lại stage. Shift+Tab ngược lại. Bẫy: nghe `keydown` Tab trên hộp, nếu ở phần tử cuối/đầu thì chuyển vòng (không dùng `inert` trên phần còn lại nếu SA lo tương thích; ưu tiên `inert` trên `.room-root` khi mở nếu đã dùng ở nơi khác, không bắt buộc).
3. Đóng (Esc, nút, click nền): trả focus về phần tử đã mở (nút "Phóng to hình" hoặc "Xem hình đề"), lưu bằng `ref` trước khi mở.
4. Khi mở: thêm `aria-hidden`-tương đương cho phần còn lại không cần thiết; tối thiểu giữ `aria-modal="true"`.

### 4.5 Nhãn tiêu đề, alt text, thứ tự chữ

Nhãn khung (`page.tsx:2080`): thay "Task 1 — Summarise the graph" bằng **"Task 1 — Summarise the information"**; Task 2 giữ "Task 2 — Essay". Lý do: đây đúng từ ngữ của chính đề IELTS ("Summarise the information by selecting and reporting the main features"), đúng với biểu đồ, bảng, sơ đồ quy trình, bản đồ và mặt bằng, không cần suy đoán loại hình hay trường dữ liệu mới. Nhãn loại hình chính xác hơn (ví dụ "Map", "Process") là không cần thiết cho người học và dễ sai; bỏ.

Alt text (`page.tsx:2085`), quy tắc không cần thêm trường: `descSentence` = đoạn đầu tiên trong `task1Prompt.split("\n\n")` khớp `/\b(below|following)\b/i` (fallback: đoạn thứ hai, rồi đoạn đầu). `alt = "Hình của đề Writing Task 1. " + descSentence`. Ví dụ C16 Test 3: "Hình của đề Writing Task 1. The plans below show the site of an airport now and how it will look after redevelopment next year." Cùng chuỗi `descSentence` dùng cho caption của lightbox. Tuỳ chọn (không bắt buộc): nếu dữ liệu có trường `writing_task1_image_alt` thì ưu tiên. Hạn chế đã biết: alt mô tả đề chứ không mô tả số liệu trong hình; mô tả số liệu cho người khiếm thị là việc riêng, ngoài T37.

Thứ tự khối chữ: xem 4.2. Ghi chú SA: `prompt.split("\n\n")` giữ nguyên; chỉ đổi vị trí khối `<img>` xuống sau hộp "Yêu cầu tối thiểu".

### 4.6 Dark mode

`.exam-fig` (khung quanh ảnh thu nhỏ): `background: #fff; padding: 6px; border: 1px solid var(--hairline); border-radius: 10px;` (light mode không thấy khác biệt, dark mode biến khối trắng thành "tờ giấy" có chủ ý trên nền `#0b1022`). Ảnh: `border-radius: 6px`. Dark mode: `[data-theme='dark'] .exam-fig img, [data-theme='dark'] .room-lb-paper img { filter: brightness(0.92); }` để giảm chói mà không đổi sắc (không `invert`, không `hue-rotate`). Lightbox: stage `--surface-sunken` (tối) quanh tờ giấy trắng có `box-shadow`, thị giác nhẹ hơn cả màn trắng. Nếu thử máy thật thấy chữ nhạt đi quá, bỏ `brightness` và giữ khung (xem giả thuyết).

### 4.7 Trạng thái

| Trạng thái | Ở khung đề / hàng ô viết | Trong lightbox |
|---|---|---|
| Đang tải | Khung `exam-fig` cao tối thiểu 180px (mobile 140px), nền `--surface-sunken`, chữ giữa 13px `--ink-muted` "Đang tải hình đề…", `role="status"`. Nút "Phóng to hình" và "Xem hình đề" `disabled` + `aria-disabled` | Không mở được (nút disabled) |
| Sẵn sàng | Ảnh hiện, nút bật | Ảnh hiện theo mức phóng |
| Lỗi tải | Khung chữ "Không tải được hình đề. Kiểm tra mạng rồi bấm Tải lại. Đồng hồ vẫn chạy." (`role="alert"`, `--danger`), nút `st-btn st-btn-secondary st-btn-sm` "Tải lại hình" (đặt `imgTry + 1`, thêm `?r=n` vào `src`). Nút "Phóng to hình"/"Xem hình đề" disabled. Ô viết hoạt động bình thường | Nếu ảnh trong lightbox lỗi (mạng mất khi mở): hiện cùng thông báo + "Tải lại hình" ở giữa stage |
| Đã phóng to | (khung đề giữ ảnh thu nhỏ) | Nút mức đang chọn có `aria-pressed="true"`, không thông báo trạng thái thêm |
| Không có hình | Không render `Task1Figure`, không hàng nút ở ô viết, cột đề giữ 380px | Không có |

Ghi chú tải ảnh: `<img>` trong khung đề luôn được render khi `isTask1 && task1Image` (kể cả khi tab "Đề bài" ở mobile bị ẩn bằng `visibility`), nên ảnh tải sẵn khi người học vào tab "Bài viết" và bấm "Xem hình đề" thì đã sẵn (ảnh lightbox dùng cùng URL nên lấy từ cache). Khi chuyển Task 1 -> Task 2 -> Task 1 `<img>` bị gỡ rồi gắn lại; để không nhấp nháy "Đang tải" lần hai, dùng `useRef<Set<string>>` ghi `src` đã tải thành công, và đọc `img.complete && img.naturalWidth > 0` ngay khi gắn.

## 5. Selector và khối cần đổi (file:dòng)

| File:dòng | Khối | Thay đổi |
|---|---|---|
| `frontend/src/app/exam/[id]/page.tsx:2046-2056` | đầu `WritingSection` | thêm state `imgState`, `imgTry`, `lbOpen`, `zoom`, `ref` phần tử gọi (để trả focus); tính `descSentence`; `hasFig = !!task1Image`; dùng `useNarrow()` (đã import ở dòng 17) để chọn mức phóng mặc định |
| `page.tsx:2057` | `.exam-writing-layout` | thêm `data-fig={hasFig ? "1" : undefined}`; giữ `data-tab={mobileTab}` |
| `page.tsx:2080` | nhãn khung | "Task 1 — Summarise the information" |
| `page.tsx:2083-2086` | khối `{isTask1 && task1Image && <img>}` | xoá ở vị trí này |
| `page.tsx:2087-2091` | đoạn chữ đề | giữ nguyên |
| `page.tsx:2092-2096` | hộp "Yêu cầu tối thiểu" | giữ nguyên nội dung; hình chèn NGAY SAU hộp (trước `</div>` đóng prompt pane ở ~2097) |
| `page.tsx` (sau 2096, mới) | `Task1Figure` | `<Task1Figure src alt state onLoad onError onRetry onOpen />` hiện khi `isTask1 && hasFig` |
| `page.tsx:2101-2112` | hàng tiêu đề ô viết | thêm nút "Xem hình đề" (class `room-w-viewimg`) khi `isTask1 && hasFig`; bọc " — Bài viết" bằng `room-hide-sm` |
| `page.tsx` (cuối `WritingSection`, mới) | `<ImageLightbox open …/>` | render cạnh gốc, dùng portal |
| `frontend/src/components/exam/Task1Figure.tsx` (mới) | khung hình + nút "Phóng to hình" + trạng thái tải/lỗi | gói `<figure className="exam-fig">` |
| `frontend/src/components/exam/ImageLightbox.tsx` (mới) | lightbox: portal, focus trap, phím tắt, mức phóng | props `{ open, src, alt, caption, zoom, onZoom, onClose, state, onRetry, returnFocusRef }` |
| `frontend/src/app/globals.css:781` | `.exam-writing-layout` | thêm `.exam-writing-layout[data-fig="1"] { grid-template-columns: clamp(380px, 40%, 520px) minmax(0, 1fr); }` (giữ luật gốc `380px 1fr`) |
| `globals.css:1217` | luật mobile `grid-template-columns: 1fr` | giữ; trong `room.css` khối mobile đã đặt `display: block` cho `.exam-writing-layout`, nên `data-fig` không ảnh hưởng ở mobile (kiểm bằng đo) |
| `frontend/src/app/exam/[id]/room.css` (mới, cuối file) | `.exam-fig*`, `.room-lb*`, `.room-w-viewimg` | định nghĩa theo 4.2, 4.4, 4.6, 4.7; `.room-w-viewimg { display: none }` ở desktop, `display: inline-flex` trong `@media (max-width: 767px)` |
| `room.css:28` | khối `display:none` mặc định ở desktop | thêm `.room-w-viewimg` |
| `room.css:111-114` | mobile Writing | thêm `.room-root .exam-fig { margin-top: 16px }`, nút "Phóng to hình" `width: 100%; --_h: 44px` |
| `room.css` khối `@media (max-width: 767px)` | lightbox | `--lb-top: 52px`; toolbar dưới; ẩn nút "200%" (`.room-lb-z200 { display: none }`); caption 2 dòng |
| `room.css` `@media (max-height: 500px)` | xoay ngang | ẩn caption lightbox |

Ghi chú: các class `.room-lb*` đặt NGOÀI mọi selector `.room-root` vì lightbox render qua portal vào `body`. Không dùng `100vh` thuần cho chiều cao stage ở mobile: dùng `100dvh` có dự phòng `100vh` đặt trước, như phần còn lại của phòng thi.

## 6. Thứ tự triển khai (nhỏ, kiểm từng bước)

1. Sửa nhỏ không đổi bố cục: nhãn "Task 1 — Summarise the information"; alt theo `descSentence`. Kiểm: đọc DOM của 8 đề.
2. Đổi thứ tự: chuyển `<img>` xuống sau hộp "Yêu cầu tối thiểu"; thêm `.exam-fig` (khung giấy trắng, viền, `brightness` ở dark). Kiểm: ở 1280x800 và 1024x768 hộp "Yêu cầu tối thiểu" nằm hoàn toàn trong vùng nhìn thấy không cuộn (8 đề); ảnh dark không chói.
3. `Task1Figure` với trạng thái đang tải / lỗi / thử lại (chưa có lightbox, nút "Phóng to hình" tạm vô hiệu). Kiểm: tắt mạng (chặn `/exam-images/*`) thấy thông báo lỗi và nút "Tải lại hình", ô viết vẫn gõ được.
4. `ImageLightbox` desktop: mở/đóng, 4 mức phóng, phím tắt, focus trap, trả focus. Kiểm: C16 Test 3 ở 1280x800, "100%" đọc được số cổng 1–18 và hai chú giải.
5. Cột đề rộng hơn (`data-fig`). Kiểm: chuyển Task 1 <-> Task 2 không làm cột đổi rộng; ô viết >= 590px ở 1024.
6. Mobile: nút "Xem hình đề" ở hàng ô viết, toolbar lightbox dưới, mặc định 100%, 3 mức phóng. Kiểm 390x844 và 360x740.
7. Chạy lại các kiểm tra "Điều SA phải giữ nguyên" (mục 7) trước khi báo xong.

Có thể phát hành riêng sau bước 4 (giải quyết ca nặng nhất).

## 7. Điều SA PHẢI giữ nguyên

- `ExamTimer` và header không sửa; lightbox không phủ header (top bằng chiều cao header), không gỡ/gắn lại timer, đồng hồ không dừng khi mở lớp xem hình.
- `submitError`, `submittingRef`, hộp "Nộp bài thi?" (z-index 99999 vẫn cao hơn lightbox 10000), nút "Nộp lại".
- `isPublishedBuiltin` và màn "Đề này đang được biên soạn lại…" (không đổi thứ tự hook trước kiểm tra này).
- Autosave: `onTask1Change`/`onTask2Change`, debounce 3 giây ở Writing, `AnswerSaver.flush()`. Textarea không bị gỡ/gắn lại khi mở lightbox hoặc đổi tab mobile; lightbox render qua portal nên không thay đổi cây của textarea.
- Bố cục mobile đã làm: tab "Đề bài | Bài viết" (`room-tabs`, `data-tab`, `visibility: hidden` cho khung ẩn), thanh dưới Task 1 / Task 2 / "Phần tiếp", `100dvh`, hộp xác nhận "Phần tiếp". Không dùng `display: none` cho khung ẩn.
- Lưu chữ khi đổi Task 1 <-> Task 2 và khi đổi tab: `task1Text` / `task2Text` ở component cha, không đưa vào state mới.
- Desktop không thay đổi gì ngoài những chỗ nêu ở mục 5; hộp "Yêu cầu tối thiểu" và thang đếm từ giữ nguyên chữ.
- Phong cách: không emoji, không icon trong nút, nút dùng `st-btn`; không `window.alert`.

## 8. Ranh giới với T32

KHÔNG gộp vào T37: cuộn dư 56px của trang (UXW-7), nút "Ghi chú" nổi đè nút "Câu trước" ở 1366/1024, thanh công cụ bài đọc rớt chữ, banner luyện tập che chip, tương phản tiêu đề phần light mode, cột bài đọc >= 40% của Reading, nút "Bắt đầu thi". T37 chỉ đụng: cột đề của Writing (khi có hình) và việc dòng số từ tối thiểu luôn nằm trong tầm nhìn. T37 vẫn nên đo `scrollHeight` của trang nhưng không phải sửa mục 56px.

## 9. Tiêu chí chấp nhận (đo được)

Khung đo: desktop 1280x800 và 1024x768; mobile 390x844 và 360x740; light và dark; tám đề có hình (C16 Test 1–4, C21 Test 1–4), ca khó nhất C16 Test 3 (1060x1077). Dùng `getBoundingClientRect()`, `document.documentElement.scrollWidth`.

Đọc hình
1. D1. C16 Test 3, 1280x800: bấm "Phóng to hình" hiện hộp có `role="dialog"`; chọn "100%" thì ảnh hiển thị rộng 1060px (`getBoundingClientRect().width` của `<img>` = 1060 +- 2) và số cổng 1–18 cùng hai chú giải đọc được bằng mắt trên ảnh chụp.
2. D2. Desktop, mở "Vừa khung": ảnh nằm trọn trong stage không cuộn (chiều cao ảnh <= chiều cao stage - 32); đổi sang "200%" thì stage có thanh cuộn hai chiều.
3. D3. Mobile 390x844 và 360x740, mở lightbox: mặc định "100%", `naturalWidth` = chiều rộng hiển thị; vuốt một ngón cuộn được ảnh; không có cuộn ngang của trang (`scrollWidth` = `innerWidth`).
4. D4. Mọi nút trong lightbox cao >= 44px và rộng >= 44px ở mobile; khoảng cách giữa hai nút >= 6px; ở 360px toolbar không xuống dòng.

Điều khiển và truy cập
5. K1. Esc đóng lớp xem hình và focus quay về đúng nút đã mở ("Phóng to hình" hoặc "Xem hình đề"). Tab giữ vòng trong hộp (không rơi ra ngoài).
6. K2. Phím `+`, `-`, `0`, `1` đổi mức phóng đúng; nút mức đang chọn có `aria-pressed="true"`.
7. K3. Sau khi mở rồi đóng lớp xem hình, nội dung textarea Task 1 không đổi (so chuỗi trước/sau) và đếm từ không đổi; `Task 1 <-> Task 2` vẫn giữ chữ.
8. K4. Ảnh có `alt` bắt đầu "Hình của đề Writing Task 1." và chứa câu mô tả đề (ví dụ T3 chứa "airport"); nhãn khung đề ghi "Task 1 — Summarise the information" ở cả 8 đề.

Bố cục và dòng số từ
9. L1. 1280x800 và 1024x768, cả 8 đề: đáy hộp "Yêu cầu tối thiểu" nằm trong vùng nhìn thấy của `.exam-prompt-pane` khi `scrollTop = 0` (không cuộn cột đề để thấy "Write at least 150 words" và hộp).
10. L2. Đề có hình: cột đề rộng 410px +- 4 ở 1024 và 512px +- 4 ở 1280, giữ nguyên khi đổi Task 1 <-> Task 2; textarea >= 590px ở 1024. Đề không có hình: cột vẫn 380px.
11. L3. Mobile 390x844 Task 1: textarea cao >= 60% `innerHeight` (>= 507px) khi chưa mở bàn phím; hàng tiêu đề ô viết không bị cắt ở 360 (nút "Xem hình đề" thấy đủ, số từ không đè nút).
12. L4. Mobile tab "Đề bài": ảnh rộng bằng vùng nội dung (~358px), nút "Phóng to hình" rộng toàn hàng, cao 44px, thấy được sau khi cuộn không quá một màn từ đầu tab.

Trạng thái và dark mode
13. S1. Chặn `/exam-images/*` (offline): khung hiện đúng chữ "Không tải được hình đề. Kiểm tra mạng rồi bấm Tải lại. Đồng hồ vẫn chạy." và nút "Tải lại hình"; textarea vẫn gõ và lưu được; hai nút phóng to bị disabled. Bỏ chặn rồi bấm "Tải lại hình": ảnh hiện.
14. S2. Mạng chậm (throttle): thấy "Đang tải hình đề…", nút phóng to disabled, đến khi ảnh xong thì bật.
15. S3. Dark mode: ảnh nằm trong khung trắng có viền, không có khối trắng tràn sát mép cột; bộ lọc ảnh chỉ là `brightness` (không `invert`); đo độ tương phản chữ ảnh trong dark vẫn >= 4,5:1 (đen trên nền ~#EBEBEB).

Không hồi quy
16. G1. Ba kịch bản P0 (đề ẩn báo đúng, đồng hồ + audio, lỗi nộp hiện hộp lỗi và "Nộp lại") và hồi quy T22/T38 (nộp bài demo C16 Test 4 ra "KẾT QUẢ BÀI THI", "Writing · nhận xét") vẫn như báo cáo trước.
17. G2. Mở lớp xem hình rồi bấm "Nộp bài" ở header: hộp "Nộp bài thi?" hiện ở trên cùng và dùng được; đồng hồ giảm đều trong lúc lớp xem hình mở (đo hai mốc cách nhau 30 giây khớp +- 2 giây).

## 10. Giả thuyết cần thử máy thật

- Phần mềm đọc màn hình (NVDA/VoiceOver): `aria-modal` và vòng focus trong portal có đủ, hay cần `inert` cho `.room-root`. Thử TalkBack ở mobile.
- Nút "Back" của Android khi lớp xem hình đang mở có thể rời hẳn trang thi. Nếu đúng, thêm `history.pushState` khi mở và đóng lớp bằng `popstate` (kiểm Next.js router không bị ảnh hưởng). Đây là rủi ro nên ưu tiên thử.
- Chụm hai ngón trong lightbox phóng cả trang (visual viewport) thay vì chỉ ảnh: nếu gây rối, bỏ `pinch-zoom` khỏi `touch-action` và chỉ dựa vào nút mức phóng.
- Mức "100%" mặc định ở mobile: ảnh gốc (khoảng 200 dpi cắt từ PDF) trên màn DPR 3 có sắc nét đủ đọc chữ 20px; ở "200%" desktop ảnh có bị mờ. Nếu mờ, SA xuất lại ảnh ở độ phân giải cao hơn (dữ liệu, không thuộc T37).
- Người học có muốn ghim hình cạnh ô viết khi gõ (phương án C) hay mở/đóng là đủ: phỏng vấn 5 học viên và đo số lần mở lớp xem hình mỗi bài (sự kiện `task1_image_open`); nếu > 4 lần/bài trên mobile thì cân nhắc thu nhỏ nổi hoặc tách đôi màn hình.
- `brightness(0.92)` trong dark mode: giảm chói mà không làm chữ nhạt quá mức, và khung giấy trắng có đỡ chói không so với chỉ có khung; thử trên màn OLED ban đêm.
- Cột đề 40% ở 1024 làm ô viết còn ~594px: soạn 250 từ có đủ thoải mái; nếu phàn nàn, đặt trần 36%.
- Đặt hình sau hộp "Yêu cầu tối thiểu": có người học bỏ qua hình vì phải cuộn khi đề dài (Test 1 có 2 biểu đồ trong một ảnh cao 1020px). Đo tỉ lệ mở lớp xem hình theo đề.
- Số px trên đây tính từ CSS và kích thước PNG; cần chụp thật ở 4 khung đo sau mỗi bước để đối chiếu, nhất là chiều cao toolbar lightbox và độ rộng hàng "Task 1 | Xem hình đề | số từ" ở 360.
