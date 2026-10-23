# Thiết kế bố cục phòng thi IELTS trên điện thoại (T7 + T13 + T17)

Người viết: UX Senior · Ngày: 2026-10-23 · Phương pháp: chỉ đọc code (không chạy server, không mở trình duyệt). Số dòng lấy từ working tree hiện tại (có thay đổi chưa commit) của `frontend/src/app/exam/[id]/page.tsx` (2136 dòng) và `frontend/src/app/globals.css`; dòng có thể lệch vài dòng khi SA làm T7 sau các việc khác. Mọi kích thước dưới đây là tính toán, phải đo lại trên máy thật (mục "Giả thuyết").

## 1. Kết luận

Chỉ cần ba thay đổi lớn để phòng thi dùng được ở 390px, và đều làm được bằng CSS theo `@media (max-width: 767px)` cộng một ít state UI: (1) đổi khung hai cột của Reading thành một cột có hai tab "Bài đọc | Câu hỏi", còn Listening thành "thanh audio dính ở trên + danh sách câu hỏi" (Listening không cần tab vì cột trái chỉ chứa trình phát); (2) đổi khung trang thành `100dvh` một cột cuộn duy nhất, header một dòng 52px, thanh điều hướng 56px, vùng chạm ≥44px, ô nhập 16px; (3) "Phần tiếp" đi qua hộp xác nhận nêu rõ không quay lại được. Nguyên nhân gốc của T17 là `width` inline theo % trên `.exam-audio-pane` cộng `flex-shrink` mặc định, nên không có media query nào sửa được nếu không dùng `!important` hoặc bỏ style inline: đây là điểm SA phải xử lý trước tiên.

Desktop giữ nguyên: mọi luật mới nằm trong `@media (max-width: 767px)` (và một khối `@media (max-height: 500px)` cho điện thoại nằm ngang); các phần tử JSX mới (thanh tab, dòng nhãn header) mặc định `display: none` ở desktop.

## 2. Nguyên tắc

1. Một vùng cuộn duy nhất cho mỗi màn. Header và thanh điều hướng cố định, vùng giữa cuộn; trang (body) không cuộn trong phòng thi. Lý do: hiện có 2 px thừa (`54px` inline so với header `56px`) khiến body cuộn được, và trên Safari di động mỗi cú cuộn body làm thanh địa chỉ co giãn, đổi `dvh`.
2. Việc chính nhìn thấy ngay: Listening thì nút phát audio; Reading thì chữ bài đọc rộng ≥340px; Writing thì ô viết cao ≥60% màn.
3. Cái gì cần nhìn trong lúc thi thì luôn nhìn thấy (đồng hồ, tên phần, tiến độ audio); cái gì chỉ để chỉnh thì cất đi (khung kéo, chọn font, "Ẩn khung trái", "Ẩn Navigator", hướng dẫn).
4. Không có thao tác chạm đơn nào kết thúc phần thi hoặc nộp bài (T13).
5. Không cử chỉ ẩn: không kéo, không vuốt. Chuyển tab bằng nút bấm.
6. Vùng chạm ≥44x44px, khoảng cách ≥6px giữa hai nút. Chữ trong ô nhập ≥16px. Không dùng `maximum-scale`.
7. Giữ phong cách: không emoji, không icon trong nút, dùng `st-btn`, `tabs/tab` (đã có ở `studia-ui.css:309-311`, cao 44px), token màu/bo góc có sẵn, chữ tiếng Việt viết hoa chữ đầu câu.

## 3. Biến CSS và cách đặt chiều cao (nền cho mọi màn)

Đặt trong `room.css`, khối `@media (max-width: 767px)`:

```
:root / .room-root { --room-header-h: 52px; --room-nav-h: 56px; --room-tabs-h: 48px; }
```

Khung trang mới (mobile): `.room-root` là cột flex cao đúng `100dvh` (dự phòng `100vh` đặt trước dòng `dvh`), `overflow: hidden`, `padding-top: var(--room-header-h)`, `padding-bottom: calc(var(--room-nav-h) + env(safe-area-inset-bottom))`. `.exam-content` là `flex: 1; min-height: 0; margin-top: 0; padding-bottom: 0 !important`. Các layout `.exam-reading-layout`, `.exam-listening-layout`, `.exam-writing-layout` là `flex: 1; min-height: 0; height: auto` (cần bỏ `height` inline, xem mục 6).

Điện thoại nằm ngang (`@media (max-height: 500px)`, áp dụng cả khi rộng 844px): `--room-header-h: 44px; --room-nav-h: 48px;`, giữ bố cục hai cột của desktop, ẩn khối hướng dẫn và sóng audio trong cột trái (xem 4.1). Chấp nhận được, không phải trọng tâm.

## 4. Thiết kế từng màn

Ký hiệu: `[ ]` là nút/ô chạm được, số là px ở 390 rộng.

### 4.0 Header phòng thi (mọi phần)

Hiện tại (`globals.css:732-743`, `1287`; JSX `page.tsx:687-725`): logo + "IELTS Mock Test" + chip chế độ, 2-4 viên `part-pill` (36px), đồng hồ (min-width 88) và "Nộp bài"; ở ≤767 chuyển `flex-wrap; height:auto` nên xuống 2-3 dòng, che đầu nội dung.

Mới (một dòng, cao 52px, `padding: 0 12px`, `gap: 8px`, `flex-wrap: nowrap`):

```
+--------------------------------------------------+ 52px
| [S]  Reading · 2/4            [ 54:21 ]  [Nộp bài]|
|      Thi thật                                    |
+--------------------------------------------------+
```

- Logo mark 22px (giữ). Chữ "IELTS Mock Test" và chip chế độ ẩn ở mobile (bọc chữ trong `<span className="room-hide-sm">`).
- Thêm phần tử mới `<span className="exam-header-now">`: dòng 1 `{Tên phần} · {thứ tự}/{tổng số phần}` (ví dụ "Reading · 2/4", font 14px/600, `--ink`), dòng 2 chế độ ("Thi thật" hoặc "Luyện tập", 11px, `--ink-muted`). Mặc định `display: none`, hiện ở ≤767. Phần tử này gắn `aria-label="Phần Reading, 2 trên 4, chế độ thi thật"`.
- Ẩn cụm `part-pill` ở mobile (thêm class `exam-header-parts` cho div ở `page.tsx:691`). Trạng thái "đã nộp" của từng phần vẫn có ở màn chuyển phần.
- Đồng hồ: `ExamTimer` giữ nguyên (không đổi file). Chỉ CSS: `.exam-timer { min-width: 72px; padding: 0 10px; }` ở mobile. Các ngưỡng màu warning/danger/critical giữ.
- "Nộp bài" giữ `st-btn st-btn-primary st-btn-sm` nhưng ở mobile `--_h: 44px` (`.exam-header .st-btn { --_h: 44px; }`). Vẫn mở hộp "Nộp bài thi?" nên không phải thao tác một chạm.
- Chế độ không giới hạn giờ: chip `room-untimed` đổi chữ thành "Không giới hạn" ở mobile (bọc " giờ" trong `room-hide-sm`) và `font-size: 12px; padding: 6px 8px`.
- Độ rộng ước tính ở 360: 12 + 22 + 8 + ~100 (nhãn) + (khoảng trống) + 72 + 8 + ~80 + 12 = ~314 trong 360. Còn dư ~46px. Nếu nhãn dài hơn thì `text-overflow: ellipsis` cho nhãn, không bao giờ xuống dòng.

Màn chuyển phần (`page.tsx:641`) cũng dùng `.exam-header`; chữ thương hiệu ở đó không bọc `room-hide-sm` nên không đổi. Xem mục 9 về phần còn lại của màn đó.

### 4.1 Listening

Hiện tại: `.exam-listening-layout` (`globals.css:945`) là flex ngang; cột trái `.exam-audio-pane` có `style width: 38%` (`page.tsx:1209`), cột phải `.exam-questions-pane` `width: auto` (`page.tsx:1343`) ăn phần dư theo nội dung nên cột trái co lại còn khoảng 60-100px (padding 24 mỗi bên): nút "Phát Audio Đề Thi" (`page.tsx:1272-1284`, `padding: 10px 22px`) xuống dòng, header thẻ audio bị cắt. Trong cột trái còn: hàng chip Part + "Ẩn khung trái" (1211-1242), thẻ audio (1245-1289) có sóng 45 cột (1254), thanh tiến độ (1267), hộp hướng dẫn (1292-1301), nút Câu trước/Câu sau (1304-1329).

Mới (ở ≤767):

```
+------------------------------------------+ header 52
| [S] Listening · 1/4     [29:12] [Nộp bài]|
+------------------------------------------+
| ======----------------------  (tiến độ 6) | thanh audio, cao ~80, KHÔNG cuộn
| [ Phát Audio Đề Thi      ] Phát 1 lần    |  nút 48px cao, chữ 16px
+------------------------------------------+
| [Part 1][Part 2][Part 3][Part 4]          | hàng chip dính, cao 52
|  Q1-10   Q11-20  Q21-30  Q31-40           |
+------------------------------------------+
| IELTS LISTENING - PART 1   10 Questions   |  vùng cuộn duy nhất
| (1) ... [ ô điền 44px ]                   |
| ...                                       |
+------------------------------------------+
| [Phần tiếp][Đánh dấu][1][2][3][4][5] ...  | nav 56, cuộn ngang
+------------------------------------------+
```

Cấu trúc từ trên xuống bên trong `.exam-listening-layout` (mobile: `flex-direction: column`):

1. `.exam-audio-pane` (cột trái cũ): `width: 100% !important` (hoặc bỏ `style.width` ở mobile, xem mục 6), `flex: none`, `padding: 8px 12px`, `overflow: visible`, `gap: 8px`, `border-bottom: 1px solid var(--hairline)`, nền `--surface`. Ẩn bằng CSS (thêm class vào các khối hiện có): hàng chip Part + "Ẩn khung trái" (`room-l-parts`), dòng tiêu đề "IELTS LISTENING — Part X / Computer-Delivered" (`room-l-title`), sóng 45 cột (`room-l-wave`), hộp "Hướng dẫn làm bài Listening" (`room-l-guide`), hai nút Câu trước/Câu sau (`room-l-prevnext`; thanh số câu đã làm việc này). Còn lại: thanh tiến độ + hàng nút.
2. `.audio-player-exam`: ở mobile `padding: 0; border: 0; background: transparent`.
3. Thanh tiến độ: cao 6px (giữ), `margin-bottom: 8px`. Nếu có thêm thời gian đã nghe thì để T9.
4. Hàng nút: `display: flex; gap: 8px; align-items: center`. Nút phát/tạm dừng: `flex: 1; min-height: 48px; font-size: 16px; padding: 0 16px` (đang là `padding: 10px 22px`, `0.85rem`). Chữ phụ "Phần nghe phát 1 lần" ở bên phải, 12px, `--ink-muted`, `white-space: nowrap`; nếu không đủ chỗ (viewport <360) thì xuống dưới nút, không cắt chữ.
5. `.exam-splitter-handle`: `display: none`.
6. `.exam-questions-pane`: `flex: 1; min-height: 0; width: 100% !important; padding: 0 12px 16px; overflow-y: auto; overscroll-behavior: contain`.
7. `.exam-part-header` (sticky) ở mobile: `top: 0; margin: 0 -12px 12px; padding: 8px 12px; background: var(--canvas)`. Bốn chip Part mỗi chip `flex: 1; min-height: 44px; padding: 0 4px; font-size: 13px`, nội dung hai dòng: "Part 1" và "Q1-10" (bọc phần "(Q1-10)" của `page.tsx:1375` trong `<span className="room-chip-range">`, ở mobile `display: block; font-size: 11px; font-weight: 500`). Ẩn chữ "Đang chọn: Câu x / 40" ở mobile (thanh số câu đã thể hiện); nút "Hiện Audio & Trình phát (Bên trái)" (1347-1362) không bao giờ hiện ở mobile.
8. Thẻ câu hỏi: giữ. Thêm class `room-qcard` cho div ở `page.tsx:1431-1442` để mobile đặt `padding: 14px !important` (đang `18px 22px`, inline). Ô điền trong dòng: xem mục 5.
9. Thanh điều hướng: xem 4.5.

Trạng thái của nút audio (khung chữ cho SA; phần logic tải/lỗi thuộc T9, T17 chỉ cần có chỗ chứa và nút phải thấy/bấm được):

| Trạng thái | Chữ nút | Màu | Dòng trạng thái dưới nút (`room-audio-status`, `aria-live="polite"`, 13px) |
|---|---|---|---|
| Chưa phát | "Phát Audio Đề Thi" | `--brand` | (trống, không chiếm chỗ) |
| Đang tải sau khi chạm (T9) | "Đang tải audio…" (`disabled`, `aria-busy="true"`) | `--brand` mờ | "Đang tải audio, tuỳ mạng có thể mất vài chục giây." |
| Đang phát | "Tạm Dừng Audio" | `--danger` như hiện tại | (trống) |
| Lỗi (T9) | "Thử lại" | `--brand` | "Không phát được audio. Kiểm tra mạng rồi bấm Thử lại. Đồng hồ vẫn chạy." (`role="alert"`, `--danger`) |
| Không có file audio (`audioUrl` rỗng: hiện nút vẫn bật nhưng không có gì phát) | "Chưa có audio cho đề này" (`disabled`) | `--surface-sunken` | "Hãy báo cho giáo viên hoặc chọn đề khác." |
| Audio phát xong | "Phát Audio Đề Thi" như hiện tại cho tới khi T9 quyết định; đề xuất "Audio đã phát xong" (`disabled`) vì chữ phụ ghi phát một lần | `--surface-sunken` | (trống) |
| Hết giờ phần Listening | Phòng thi chuyển sang màn chuyển phần, audio bị gỡ cùng component. Không cần UI riêng. | | |

Thứ tự focus (Tab): nút "Nộp bài" ở header → nút phát audio → 4 chip Part → các ô điền/đáp án theo thứ tự trong tài liệu → thanh điều hướng từ trái sang phải. Vì thanh audio nằm trước danh sách trong DOM, thứ tự này tự nhiên đúng. Đồng hồ không focus được.

Khi bàn phím ảo mở (chạm vào ô điền): thanh điều hướng và nút "Ghi chú" nổi ẩn đi (xem 4.5), thanh audio vẫn dính trên cùng và vẫn thấy nút Tạm dừng (quan trọng vì người dùng gõ khi nghe). Cuộn câu vào giữa: bỏ `behavior: "smooth"` ở `page.tsx:1112` khi đang trong mobile để không giành cuộn với trình duyệt.

Cả Listening nằm ngang (844x390): giữ hai cột của desktop; ẩn `room-l-guide`, `room-l-wave`, `room-l-title` để nút phát hiện không cần cuộn; `.exam-audio-pane` `width: 34%`.

### 4.2 Reading

Hiện tại: `.exam-reading-layout` (`globals.css:768`) flex ngang; `.exam-passage-pane` `style width: 48%` (`page.tsx:1657`) với padding 28px 32px nên chữ rộng ~120px; cột câu hỏi `width: auto`. Thanh công cụ trong khung bài đọc (1659-1714): chip Passage 1/2/3, A-/A+ (26x26), select font, "Ẩn bài đọc".

Mới (ở ≤767), hai tab, mỗi lúc chỉ một khung:

```
+------------------------------------------+ header 52
| [S] Reading · 2/4       [54:21] [Nộp bài]|
+------------------------------------------+
|   Bài đọc        |   Câu hỏi · 12/40     | tab 48 (underline brand)
+------------------------------------------+
| [Passage 1][Passage 2][Passage 3]         | cao 44
|              [A-] 15px [A+]               | cao 44
| IELTS ACADEMIC READING - PASSAGE 1        |
| Đoạn văn ... (rộng 358, chữ 15-16px)      |
| ...                                       |
+------------------------------------------+
| [Phần tiếp][Đánh dấu][1][2]... (cuộn)     | nav 56
+------------------------------------------+
```

- Thanh tab mới là phần tử đầu trong `.exam-reading-layout`: `<div className="tabs room-tabs" role="tablist" aria-label="Bài đọc và câu hỏi">` với hai `<button className="tab" role="tab" id=… aria-selected aria-controls=…>`: "Bài đọc" và "Câu hỏi · {đã trả lời}/{tổng}" (đếm trong `ReadingSection` từ `answers` và `questions`; `aria-label` đầy đủ "Câu hỏi, đã trả lời 12 trên 40"). Mặc định `display: none`; ở mobile `display: flex`, mỗi tab `flex: 1; height: 48px; font-size: 15px`, tab đang chọn `color: var(--brand)` + gạch chân 2px (class `.tab` đã có).
- State mới trong `ReadingSection`: `const [mobileTab, setMobileTab] = useState<"passage"|"questions">("passage")`. Gắn `data-tab={mobileTab}` lên `.exam-reading-layout`. Hai khung dùng `role="tabpanel"`.
- Cách ẩn khung không chọn: không dùng `display: none` (mất vị trí cuộn). Dùng `position: absolute; inset: var(--room-tabs-h) 0 0 0` cho cả hai khung, và khung không chọn có `visibility: hidden; pointer-events: none`. `visibility: hidden` giữ `scrollTop`, đồng thời loại khung khỏi thứ tự focus và cây truy cập. `scrollIntoView` trong `useEffect` (`page.tsx:1569-1580`) vẫn chạy được trên phần tử đang ẩn.
- Khung bài đọc (`.exam-passage-pane`): `width: 100% !important; padding: 12px 16px 24px; overflow-y: auto; overscroll-behavior: contain`. Thanh công cụ (1659) đổi thành cột: hàng 1 là ba chip Passage `flex: 1; min-height: 44px` (class `room-r-passages` ở div 1661); hàng 2 chỉ A-, cỡ chữ, A+ với nút 44x44 (class `room-r-font` ở div 1681; nút A-/A+ ở 1683-1693 hiện 26x26 inline nên cần `min-width: 44px; min-height: 44px` — `min-*` không bị style inline `width/height` đè theo cách ta cần? Thực tế `min-width` thắng `width` nên dùng được mà không cần `!important`). Ẩn select font (`room-r-fontfam`) và "Ẩn bài đọc" (`room-r-hide`) ở mobile. Chữ bài đọc dùng cỡ `fontSize` state (mặc định 15); đề xuất khởi tạo 16 khi `matchMedia` hẹp (khớp `passage-sm` 16px của DESIGN.md).
- Khung câu hỏi (`.exam-questions-pane`): `width: 100% !important; padding: 0 12px 16px; overflow-y: auto`. `.exam-part-header` dính ở trên cùng khung này, ba chip Passage `flex: 1; min-height: 44px`, hai dòng "Passage 1" / "Q1-13" như Listening. Ẩn "Đang chọn: Câu x / 40" và nút "Hiện khung bài đọc (Bên trái)" ở mobile.
- Hành vi chuyển tab:
  - Chạm "Câu hỏi" hoặc "Bài đọc": đổi `mobileTab`, giữ nguyên `scrollTop` của khung kia.
  - Chạm số câu ở thanh điều hướng dưới: tự chuyển sang tab "Câu hỏi" rồi cuộn câu đó vào giữa. Thực hiện bằng `useEffect([currentQ])` đặt `mobileTab = "questions"` trừ khi thay đổi đến từ chip Passage trong tab "Bài đọc" (dùng `ref` cờ `fromPassageChip`, đặt trong `scrollToPassage` ở `page.tsx:1582-1590`, đọc rồi xoá trong effect).
  - Chạm chip Passage trong tab "Bài đọc": ở lại tab "Bài đọc", đổi bài đọc, đưa đầu bài đọc lên đầu khung.
  - Chạm chip Passage trong tab "Câu hỏi": cuộn tới câu đầu của bài đó, ở lại tab "Câu hỏi", và `activePassageTab` đổi theo như hiện tại (để lần mở tab "Bài đọc" thấy đúng bài).
  - Xoay ngang rộng ≥768: quay về hai khung cạnh nhau (CSS tự lo vì mọi luật nằm trong media query).
- Trạng thái: không có "đang tải" (đề nạp trước khi vào phòng). Bài đọc rỗng: nếu `currentPassageText` rỗng thì hiện "Chưa có nội dung bài đọc cho phần này." trong khung bài đọc (hiện không có xử lý; việc nhỏ, ghi nhận).
- Thứ tự focus: header → tab "Bài đọc" → tab "Câu hỏi" → nội dung khung đang chọn → thanh điều hướng. Phím mũi tên trái/phải trên tablist chuyển tab (đúng mẫu WAI-ARIA, ưu tiên thấp).

### 4.3 Writing

Hiện tại: `.exam-writing-layout` lưới `380px 1fr` (`globals.css:781`); ở ≤767 chỉ đổi `grid-template-columns: 1fr; height: auto` (`globals.css:1217`) nên: ô viết không có chiều cao, `1fr` không có `minmax(0, …)` nên nội dung rộng đẩy ngang, thanh dưới nhét Task 1/2 + đếm từ + "Phần tiếp" + "Ẩn Navigator" (`page.tsx:867-909`).

Mới (ở ≤767), hai tab "Đề bài | Bài viết":

```
+------------------------------------------+ header 52
| [S] Writing · 3/4       [58:40] [Nộp bài]|
+------------------------------------------+
|   Đề bài         |   Bài viết            | tab 48
+------------------------------------------+
|  Task 1 - Bài viết            87 từ (cần |
|                               thêm 63)   |
| +--------------------------------------+ |
| | textarea, cao ~620 (73% màn)         | |
| |                                      | |
| +--------------------------------------+ |
| ======-----------  (thanh từ, 4px)        |
+------------------------------------------+
| [Task 1][Task 2]            [Phần tiếp]   | nav 56
+------------------------------------------+
```

- Thanh tab mới: "Đề bài" và "Bài viết", cùng thành phần `room-tabs`. State `mobileTab` mặc định `"prompt"`. Khi người dùng chạm Task 1/Task 2 ở thanh dưới thì giữ tab hiện tại; nếu đang ở "Bài viết" thì dòng tiêu đề ô viết "Task 2 — Bài viết" cho biết đang viết gì. Không tự nhảy tab.
- `.exam-writing-layout`: `display: block; position: relative; grid-template-columns: minmax(0,1fr)`; hai khung `position: absolute; inset: var(--room-tabs-h) 0 0 0`, khung không chọn `visibility: hidden` (giữ `scrollTop` và nội dung textarea; lưu ý textarea mất focus và bàn phím đóng khi sang tab "Đề bài").
- Khung đề (`.exam-prompt-pane`): `padding: 16px; border-right: 0`. Ẩn hai nút Task 1/Task 2 trong khung (`page.tsx:1946-1958`, thêm class `room-w-tasktabs`) vì thanh dưới đã có. Ảnh Task 1 `max-width: 100%` (đã có) và `height: auto`. Chữ đề 15px. Khối "Yêu cầu tối thiểu: N từ" giữ.
- Khung viết (`.exam-editor-pane`): `padding: 12px; gap: 8px`. Hàng tiêu đề (`page.tsx:1981-1993`): trái "Task 1 — Bài viết", phải "87 từ (cần thêm 63)"; cho phép xuống dòng, không cắt.
- Ô viết `.exam-writing-editor`: `flex: 1; min-height: 240px; font-size: 17px` (đã ≥16, iOS không phóng to); `padding: 14px; width: 100%; max-width: 100%; overflow-wrap: anywhere`. Ước tính chiều cao ở 390x844 (đầy đủ 844): 844 − 52 − 48 − 56 = 688 cho khung; trừ padding 24, hàng tiêu đề ~36, thanh từ ~12 ⇒ ~616px ≈ 73% màn. Ở Safari có thanh công cụ (`dvh` ≈ 664): ≈ 436px ≈ 66% của 664. Cả hai ≥60%.
- Thanh từ: giữ thanh 4px; ẩn hàng nhãn "0 / N (min) / N*1,5" (`room-w-scale` ở `page.tsx:2016`) ở mobile.
- Thanh dưới (nav) Writing: `justify-content: space-between`; trái hai nút tab Task 1 / Task 2 (đã có, `exam-nav-btn` `width:auto`; mobile `min-width: 72px; height: 44px`), phải "Phần tiếp" (qua hộp xác nhận, 4.6). Ẩn dòng "Task 1: x từ | Task 2: y từ" (class `room-w-counts`) và "Ẩn Navigator" ở mobile; đếm từ của task đang viết đã nằm trong ô viết. Nếu cần xem cả hai: nhãn tab Task đổi thành "Task 1 · 87" (tuỳ chọn).
- Thuộc tính ô viết: giữ `spellCheck={false}`, `autoCorrect="off"`, `autoComplete="off"`. Đề xuất đổi `autoCapitalize="off"` thành `"sentences"` (bàn phím điện thoại tự viết hoa đầu câu; không phải gợi ý nội dung nên không trái tinh thần "không autocomplete"). Cần PM xác nhận.
- Khi bàn phím mở: thanh dưới ẩn (4.5), ô viết dùng toàn bộ khung (`bottom` của khung = `0`); đếm từ ở hàng tiêu đề vẫn thấy nếu hàng đó nằm trong vùng nhìn thấy; đồng hồ nằm ở header cố định (xem rủi ro iOS ở mục 10).
- Hết giờ: màn "Hết giờ phần Writing" hiện có (không đổi). Trạng thái lưu: đã có autosave ngầm; UI lưu thành công/thất bại ngoài phạm vi T7.

### 4.4 Hộp nộp bài (đã có) và các hộp khác

Hộp "Nộp bài thi?" (`page.tsx:982-1055`, `.exam-modal` `padding: 32; width: 90%; max-width: 480`):

- Ở mobile (chỉ khi nằm trong `.room-root`, vì `books/page.tsx` cũng dùng `.exam-modal-overlay`): `.room-root .exam-modal { padding: 20px; width: calc(100% - 32px); max-height: calc(100dvh - 32px); overflow-y: auto; }`. `.exam-modal-overlay` giữ căn giữa (`align-items: center`).
- Hai nút "Tiếp tục làm bài" và "Nộp Bài Thi" (đang là `<button>` style inline `padding: 13px`): thêm class `room-modal-actions` cho div ở `page.tsx:1029`; mobile `button { min-height: 48px; font-size: 16px; }` và `flex-direction: column-reverse` để "Tiếp tục làm bài" (an toàn) nằm trên và nút nguy hiểm nằm dưới, cách nhau 12px. Nếu SA muốn thống nhất với yêu cầu "dùng `st-btn`": đổi hai nút thành `st-btn st-btn-secondary st-btn-block` và `st-btn st-btn-primary st-btn-block` (nút nộp hiện dùng nền `--danger`, giữ được bằng `style={{ background: "var(--danger)" }}`). Chữ giữ nguyên: "Nộp bài thi?", "Bạn có chắc muốn nộp bài thi không? Hành động này không thể hoàn tác.", "Nộp lại" khi lỗi.
- Ba ô thống kê `1fr 1fr` giữ (tối đa 3 ô, ô thứ ba chiếm hết hàng sau, chấp nhận).
- Lỗi nộp, `role="alert"`: giữ.

### 4.5 Thanh điều hướng dưới và bàn phím ảo

Hiện tại (`globals.css:809-843`; JSX `page.tsx:817-974`): `.exam-navigator` fixed, cao 60, `overflow-x: auto`; thứ tự "Phần tiếp" (cao ~28px), "Đánh dấu câu N", 40 ô `.exam-nav-btn` 34x34, "Ẩn Navigator". Chữ của nhiều nút 0.72rem.

Mới (ở ≤767):
- `.exam-navigator`: `height: calc(var(--room-nav-h) + env(safe-area-inset-bottom)); padding: 6px 8px env(safe-area-inset-bottom); gap: 6px; -webkit-overflow-scrolling: touch; scroll-snap-type: x proximity`. Ẩn thanh cuộn (`scrollbar-width: none`).
- `.exam-nav-btn`: `width: 44px; height: 44px; font-size: 14px`. Nút Task 1/Task 2 `width: auto; min-width: 72px`.
- "Phần tiếp": thêm class `room-nav-next`; `min-height: 44px; font-size: 14px; padding: 0 16px; margin-right: 12px`. "Đánh dấu": `min-height: 44px; font-size: 14px`, nhãn rút gọn: bọc " câu N" trong `<span className="room-nav-qn">` ẩn ở mobile ⇒ "Đánh dấu" / "Bỏ đánh dấu" (đặt `aria-label` đầy đủ "Đánh dấu câu 5" để đọc màn hình không mất thông tin). "Ẩn Navigator": `display: none` ở mobile; `showNav` được coi là luôn `true` khi hẹp (xem mục 6).
- Tự cuộn ngang để ô câu hiện tại nằm giữa khi `currentQuestion` đổi: effect trong component cha, đặt `navRef.current.scrollLeft` thủ công (không dùng `scrollIntoView` để khỏi cuộn trang).
- Ẩn khi gõ: một luật CSS thuần, không JS: `.room-root:has(input:focus, textarea:focus, select:focus) .exam-navigator, .room-root:has(input:focus, textarea:focus) .exam-notes-fab { display: none; }` và trong cùng điều kiện `.room-root { padding-bottom: 0 }`. `:has()` có từ iOS Safari 15.4 và Chrome 105. Thêm class `room-root` cho div gốc ở `page.tsx:685`.
- Điền đáp án nối tiếp: mọi `input.exam-inline-fill-input` thêm `enterKeyHint="next"`, `autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}`; `onKeyDown` Enter → `preventDefault()` rồi focus ô `.exam-inline-fill-input` kế tiếp trong tài liệu (nếu hết thì `blur()`). Đó là cách "chuyển câu" khi thanh số câu đã ẩn.
- Nút "Ghi chú" nổi (`room.css:11`, chế độ luyện tập): `left: 12px; bottom: calc(var(--room-nav-h) + 12px + env(safe-area-inset-bottom)); height: 44px`. Sổ ghi chú `.exam-notes` (`room.css:12`): `bottom: calc(var(--room-nav-h) + 64px + env(...)); max-height: 50dvh`. Gợi ý `.practice-hint` (`room.css:20`): `top: auto; bottom: calc(var(--room-nav-h) + 64px + env(...))` để không che hàng tab (đang `top: 68px`, nằm đè lên tab Bài đọc/Câu hỏi).
- Thông báo mất mạng (`page.tsx:727-735`) đang là phần tử trong luồng, đứng trước `.exam-content` nên bị header cố định che mất khi ở ngay y=0 (cần xác nhận bằng ảnh; nếu đúng thì lỗi cũ cả ở desktop). Ở mobile, với `.room-root` là cột flex có `padding-top` bằng header, banner nằm trong luồng ngay dưới header và đẩy `.exam-content` xuống, nên hiện ra đúng chỗ. Thêm class `room-offline` và đặt chữ ngắn lại ở mobile: giữ nguyên câu hiện tại nhưng `font-size: 13px; padding: 8px 12px`.

### 4.6 Hộp xác nhận "Phần tiếp" (T13)

Áp dụng cho nút ở thanh dưới của Listening, Reading, Writing, Speaking (`page.tsx:821-831`, `885-894`, `923-932`) khi đây không phải phần cuối. Ở phần cuối nút ghi "Nộp Bài" và đã đi qua hộp "Nộp bài thi?" nên giữ nguyên. Áp dụng cả desktop (không phụ thuộc media query).

```
+------------------------------------+
| Kết thúc phần Reading?             |
| Bạn còn 6 câu chưa làm và 2 câu    |
| đang đánh dấu. Sau khi chuyển sẽ   |
| không quay lại phần này được.      |
|                                    |
| [ Làm tiếp ]  (st-btn-primary)     |
| [ Kết thúc phần ] (st-btn-secondary)|
+------------------------------------+
```

- Component: dùng khung `.exam-modal-overlay` + `.exam-modal` có sẵn, thêm `role="alertdialog" aria-modal="true" aria-labelledby aria-describedby`. State mới ở cha: `const [confirmNext, setConfirmNext] = useState(false)`.
- Chữ:
  - Tiêu đề: "Kết thúc phần {Listening|Reading|Writing|Speaking}?"
  - Mô tả theo phần, luôn kết thúc bằng câu "Sau khi chuyển sẽ không quay lại phần này được.":
    - Listening/Reading: "Bạn còn {n} câu chưa làm" (n = tổng − `answeredCount`), thêm " và {f} câu đang đánh dấu" khi f>0. Nếu n=0 và f=0: "Bạn đã trả lời tất cả các câu."
    - Writing: "Bạn mới viết {k}/2 bài." (k = số task có chữ), thêm số từ nếu thiếu: "Task 2 mới có {w} từ, yêu cầu tối thiểu {250}." (lấy `task2_min_words` đã có ở props).
    - Speaking: "Bạn chưa hoàn thành phần Speaking." chỉ khi `speakingPhase !== "done"`; ngược lại "Bạn đã hoàn thành phần Speaking."
  - Nút chính (mặc định, `autoFocus`): "Làm tiếp" (đóng hộp). Nút phụ: "Kết thúc phần" (gọi `nextSection()`).
- Hành vi: Esc hoặc chạm nền mờ = "Làm tiếp". Nút "Làm tiếp" nằm trên, cách nút kia ≥12px, cả hai cao 48px ở mobile (xếp dọc, `st-btn st-btn-block`). Trả focus về nút "Phần tiếp" khi đóng.
- Hết giờ khi hộp đang mở: `ExamTimer.onExpire` gọi `nextSection()` trực tiếp, không qua hộp. Trong `nextSection` (và `startSection`) phải thêm `setConfirmNext(false)`, nếu không hộp sẽ hiện lại ở phần kế sau màn chuyển phần.
- Không đổi `nextSection` về logic. Nút thanh dưới đổi `onClick` từ `nextSection()` sang hàm mới: phần cuối thì `nextSection()` như cũ, phần khác thì `setConfirmNext(true)`.
- Nội dung "Nộp bài" ở header: giữ, vì đã đi qua hộp. Chỉ thêm ở dòng đầu hộp nộp khi `flags` có phần tử: giữ câu hiện tại.

## 5. Ô nhập đáp án (mọi phần)

Áp dụng ở ≤767:

| Phần tử | Hiện tại | Mới |
|---|---|---|
| `.exam-inline-fill-input` (`globals.css:962`; JSX Listening 1155, 1179; Reading 1614, 1639) | `font-size: 15px`; Reading ghi đè inline `fontSize*0.95` (14,25px) | `font-size: 16px !important` (cần `!important` vì Reading có style inline); `min-height: 44px; padding: 8px 10px; min-width: 120px; max-width: 100%` |
| `.exam-input` (`globals.css:878`) | `15px`, `width: 180px` | `font-size: 16px`; `width: min(180px, 100%)` |
| `.exam-writing-editor` | `17px` | giữ |
| `select` chọn font bài đọc | 12px | bị ẩn ở mobile (nếu SA giữ lại thì `font-size: 16px`) |
| Tất cả nút trong phòng thi | nhiều nút cao 26-34px | `min-height: 44px` (xem bảng mục 6) |

Chữ sai chính tả: `page.tsx:1177` ghi "Cầu {item.number}", đúng là "Câu {item.number}" (Reading đã đúng ở dòng 1637). Sửa kèm.

## 6. Selector và khối JSX cần đổi (file:dòng)

Ghi chú: các style inline (`width`, `height`, `padding`, `fontSize`) không bị media query đè được nếu không dùng `!important`. Hai cách: (A) bỏ style inline, thay bằng class hoặc `data-*` và để CSS lo (ưu tiên, desktop giữ nguyên số liệu); (B) giữ inline và thêm `!important` trong media query. Dùng (A) cho `height`, `width` của khung; (B) chấp nhận được cho `padding` thẻ câu hỏi, cỡ chữ ô điền.

### 6.1 CSS

| File:dòng | Selector | Thay đổi ở ≤767 (desktop không đổi) |
|---|---|---|
| `globals.css:728-730` | `body.exam-mode` | giữ. Không đặt `overflow: hidden` lên body, vì màn chuyển phần và hết giờ cần cuộn trang |
| `globals.css:732-743`, `1287` | `.exam-header` | thay luật `flex-wrap: wrap; height: auto` bằng `flex-wrap: nowrap; height: var(--room-header-h); padding: 0 12px; gap: 8px` |
| `globals.css:746` | `.exam-timer` | `min-width: 72px; padding: 0 10px` |
| `globals.css:766` | `.exam-content` | `margin-top: 0; min-height: 0; flex: 1` (trong `.room-root` dạng cột flex) |
| `globals.css:768`, `945` | `.exam-reading-layout`, `.exam-listening-layout` | `flex-direction: column; height: auto; flex: 1; min-height: 0` |
| `globals.css:769-779` | `.exam-passage-pane`, `.exam-questions-pane` | `width: 100% !important` (nếu còn inline), `padding` như 4.2, `position: absolute; inset: var(--room-tabs-h) 0 0 0`, `visibility` theo `data-tab` |
| `globals.css:781`, `1217` | `.exam-writing-layout` | thay luật `1fr; height: auto` bằng `display: block; position: relative; flex: 1; min-height: 0` |
| `globals.css:782-808` | `.exam-prompt-pane`, `.exam-editor-pane`, `.exam-writing-editor` | như 4.3 |
| `globals.css:809-821` | `.exam-navigator` | như 4.5 |
| `globals.css:822-843` | `.exam-nav-btn` | `44x44` |
| `globals.css:844-877` | `.exam-option`, `.exam-option-key` | giữ (đã cao ≥52px); `.exam-option-key` 28px là phần hiển thị, không phải mục tiêu chạm riêng |
| `globals.css:878` | `.exam-input` | 16px |
| `globals.css:921-944` | `.room-root .exam-modal(-overlay)` | như 4.4; không đổi luật gốc vì `books/page.tsx` dùng chung |
| `globals.css:946-947` | `.exam-audio-pane`, `.audio-player-exam` | như 4.1 |
| `globals.css:948-961` | `.exam-splitter-handle` | `display: none` |
| `globals.css:962-975` | `.exam-inline-fill-input` | như mục 5 |
| `globals.css:980-992` | `.exam-part-header` | `top: 0; margin: 0 -12px 12px; padding: 8px 12px` |
| `globals.css:993-1016` | `.exam-speaking-layout` | `min-height: 0; padding: 20px 16px; justify-content: flex-start; overflow-y: auto; flex: 1` (xem mục 9) |
| `room.css` (mới) | `.room-root`, `.room-tabs`, `.room-hide-sm`, `.room-chip-range`, `.room-nav-qn`, `.room-qcard`, `.room-modal-actions`, `.room-offline`, `.exam-header-now`, `.exam-header-parts` | định nghĩa mới; ở desktop `.room-tabs`, `.exam-header-now` là `display: none` |
| `room.css:11-12`, `20` | `.exam-notes-fab`, `.exam-notes`, `.practice-hint` | vị trí so với `--room-nav-h` như 4.5 |
| `room.css` (mới) | `@media (max-height: 500px)` | biến header 44 / nav 48, ẩn `room-l-guide`, `room-l-wave`, `room-l-title` |

Nên đặt khối mobile mới ở cuối `room.css` (được nạp sau `globals.css` qua `page.tsx:18`) và xoá hai luật cũ ở `globals.css:1217` và `1287` để tránh hai nguồn sự thật.

### 6.2 JSX trong `page.tsx`

| Dòng | Khối | Thay đổi |
|---|---|---|
| 261-266 | state phòng thi | thêm `confirmNext` (T13) |
| 504-525 | `nextSection`, `startSection` | thêm `setConfirmNext(false)`; logic giữ nguyên |
| 685 | div gốc phòng thi | thay `style` inline `minHeight: 100vh` bằng `className="room-root"` (CSS desktop: `background: var(--canvas); min-height: 100vh`) |
| 687-725 | header | thêm `room-hide-sm` quanh chữ thương hiệu và chip chế độ; class `exam-header-parts` cho div 691; thêm `<span className="exam-header-now">`; `room-hide-sm` cho " giờ" ở `room-untimed` (706). **Không đụng** props của `ExamTimer` (708-719) |
| 727-735 | banner mất mạng | thêm class `room-offline` |
| 750 | `.exam-content` | giữ `style paddingBottom`; mobile ghi đè `!important` |
| 817-974 | navigator | `room-nav-next` cho các nút "Phần tiếp" (821, 885, 923); `onClick` đổi thành hàm yêu cầu xác nhận; `room-nav-qn` quanh " câu N" ở nút đánh dấu (840) kèm `aria-label`; `room-w-counts` (881); ẩn "Ẩn Navigator" bằng class (851, 895, 933); `ref` cho thanh để cuộn ô hiện tại |
| 948-973 | nút "Hiện Question Navigator" | khi hẹp, coi `showNav` luôn `true`: `const navShown = showNav || narrow` |
| (mới, sau 1055) | hộp xác nhận "Phần tiếp" | JSX hộp ở 4.6 |
| 1029 | hàng nút hộp nộp | thêm class `room-modal-actions` |
| 1061-1074 | `ListeningSection` đầu hàm | hook `useNarrow()` (`matchMedia("(max-width: 767px)")`); `showLeft = narrow \|\| !leftCollapsed` |
| 1194 | root Listening | bỏ `height` inline, thay bằng `data-nav={showNav ? "on" : "off"}`; CSS desktop giữ đúng `calc(100vh - 54px - 60px)` và `calc(100vh - 54px)` |
| 1209 | `.exam-audio-pane` | giữ `style width %` ở desktop; mobile `!important` hoặc đặt `width` qua biến `--split` (`style={{ "--split": "38%" }}` và CSS `width: var(--split)` ở desktop, `100%` ở mobile). Cách biến CSS sạch hơn |
| 1211, 1246-1251, 1254, 1292, 1304 | hàng chip, dòng tiêu đề, sóng, hướng dẫn, Câu trước/sau | thêm `room-l-parts`, `room-l-title`, `room-l-wave`, `room-l-guide`, `room-l-prevnext` |
| 1272-1288 | nút phát + chữ phụ | giữ logic `onToggleAudio`; thêm class `room-audio-btn`; chỗ cho `room-audio-status` |
| 1112 | `scrollIntoView` smooth | `behavior: narrow ? "auto" : "smooth"` |
| 1155, 1179, 1614, 1639 | ô điền | thêm `enterKeyHint="next"`, `autoCapitalize="off"`, `autoCorrect="off"`, `spellCheck={false}`, `onKeyDown` Enter → ô kế |
| 1177 | "Cầu" | sửa thành "Câu" |
| 1375, 1777 | chip Part/Passage | bọc "(Q…)" trong `room-chip-range` |
| 1380, 1782 | "Đang chọn: Câu x / 40" | thêm class `room-hide-sm` |
| 1431, 1833 | thẻ câu hỏi | thêm class `room-qcard` |
| 1506-1520 | `ReadingSection` đầu hàm | `mobileTab` state, `useNarrow`, ref cờ `fromPassageChip` |
| 1569-1580 | effect `[currentQ]` | khi hẹp và không phải từ chip Passage: `setMobileTab("questions")` |
| 1654 | root Reading | bỏ `height` inline như 1194; thêm `data-tab`, `data-nav`; thanh `room-tabs` làm con đầu tiên |
| 1657 | `.exam-passage-pane` | `--split` như trên |
| 1659-1714 | thanh công cụ bài đọc | `room-r-passages` (1661), `room-r-font` (1681), `room-r-fontfam` (1696), `room-r-hide` (1706) |
| 1942-1980 | `WritingSection` | `mobileTab` state mặc định `"prompt"`, `data-tab`, thanh `room-tabs`, `role="tabpanel"` |
| 1946 | hai nút Task trong khung đề | class `room-w-tasktabs` |
| 2003 | `autoCapitalize` | đề xuất `"sentences"` (cần PM duyệt) |
| 2016 | hàng nhãn thang đếm từ | class `room-w-scale` |

### 6.3 File mới nhỏ

- Hook `useNarrow()` (đặt trong `frontend/src/lib/useMediaQuery.ts` hoặc cuối `page.tsx`): `matchMedia("(max-width: 767px)")`, lắng nghe `change`, giá trị khởi tạo `false` rồi đồng bộ trong `useEffect`. Trang đã render màn "Đang tải" trước nên không lệch hydration.
- Hộp xác nhận: JSX ngay trong `page.tsx` hoặc tách `components/exam/ConfirmNextSection.tsx` (khuyến nghị tách, vì `page.tsx` đã 2100 dòng; nhận props `{section, unanswered, flagged, writingInfo, onStay, onConfirm}`).

## 7. Điều SA PHẢI giữ nguyên

- `components/ExamTimer.tsx` không sửa: tính theo mốc kết thúc tuyệt đối (`endsAt`), `onExpire` giữ trong `ref`, lắng nghe `visibilitychange`, `key={currentSection}` ở `page.tsx:709` (đồng hồ mới mỗi phần), props `initialSeconds={remainingOverride ?? sectionDuration}`. Không đổi `key`, và không để `ExamTimer` bị gỡ rồi gắn lại khi đổi tab Bài đọc/Câu hỏi hoặc khi xoay màn hình. Header phải luôn được render một lần ở cùng vị trí cây (không tạo hai header cho desktop/mobile bằng `{narrow ? <A/> : <B/>}`). Cách đúng: cùng một header, CSS đổi hiển thị.
- Logic nộp: `handleSubmitExam`, `submittingRef`, `submitError`, `submitLoading`, nút "Nộp lại", màn "Hết giờ" (`page.tsx:563-601`) và chữ của chúng. Không dùng lại `window.alert`.
- `isPublishedBuiltin` ở `page.tsx:305` và màn lỗi `loadError` (609-616): đề bị ẩn vẫn báo "Đề này đang được biên soạn lại…". Các hook mới không được chạy trước kiểm tra này theo cách làm đổi thứ tự.
- Autosave: `saverRef`, `setAnswer`, debounce Writing 3 s (`page.tsx:420-442`), `AnswerSaver.flush()` khi nộp. Các `onChange` của ô nhập và textarea phải giữ gọi `onAnswer`/`onTask1Change`/`onTask2Change`. `visibility: hidden` giữ nguyên DOM nên giá trị ô nhập không mất; không dùng `display: none` hay `{tab === … && <Pane/>}` (gỡ gắn sẽ mất `scrollTop`, mất focus, và với Writing có thể mất ký tự đang gõ nếu state nằm trong component con).
- Trạng thái `answers`, `flags`, `notes`, `currentQuestion`, `sectionDone`, `remainingOverride`, `status` giữ ở component cha như hiện tại. State UI mới (`mobileTab`, `confirmNext`) chỉ là hiển thị.
- `nextSection()`, `startSection()` và màn chuyển phần với đếm 45 giây: không đổi hành vi. Chỉ thêm `setConfirmNext(false)`.
- Audio: giữ `<audio>` luôn được render trong `ListeningSection` kể cả khi khung trái bị ẩn/thu gọn (`page.tsx:1195-1205` nằm ngoài khối `!leftCollapsed`); giữ `onEnded={() => onToggleAudio()}`. Không đổi logic `useEffect` phát/dừng ở T7 (để T9).
- ID để cuộn: `listening-q-{n}`, `reading-q-{n}`, `part-header-*`, `passage-header-*` giữ nguyên.
- Desktop: toàn bộ luật mới nằm trong media query; không đổi giá trị mặc định của bất kỳ selector nào ngoài hai chỗ bắt buộc đã nêu (chuyển `height` inline thành `data-nav` có giá trị tương đương; thay `minHeight` inline của div gốc bằng class có cùng giá trị).

## 8. Thứ tự triển khai (SA làm tuần tự, kiểm từng bước)

Mỗi bước: chạy `typecheck`, mở `/exam/demo?...` bằng trình duyệt thu nhỏ 390x844 và 1280x1000, so sánh desktop với ảnh chụp trước khi làm.

1. Chụp ảnh nền desktop 1280x1000 của Listening, Reading, Writing, hộp nộp (để so sánh không đổi). Thêm class/`data-*` còn thiếu vào JSX (mục 6.2) không kèm CSS mới. Kiểm: desktop y hệt.
2. Khung trang mobile: `.room-root`, biến `--room-*`, `100dvh`, bỏ `height` inline thành `data-nav`, `.exam-content` flex. Kiểm: ở 390x844 body không cuộn; header/nav không che nội dung.
3. Header một dòng (4.0). Kiểm: 4 phần thi vẫn một dòng cao 52px ở 390 và 360; chế độ "Không giới hạn" không xuống dòng; desktop y hệt.
4. T17, Listening (4.1): thanh audio trên cùng, ẩn splitter/hướng dẫn/sóng, cột câu hỏi một cột, chip Part hai dòng. Kiểm: nút "Phát Audio Đề Thi" thấy ngay không cuộn, cao ≥48px, chữ không rớt từng chữ ở 390 và 360; phát audio được, đồng hồ chạy đều. Đây là mốc P0, có thể phát hành riêng trước các bước sau.
5. Thanh điều hướng (4.5) cùng vùng chạm, tự cuộn ô hiện tại, ẩn khi gõ bằng `:has()`, Enter→ô kế, ô nhập 16px (mục 5), sửa "Cầu".
6. Reading hai tab (4.2). Kiểm: bài đọc rộng ≥340px, giữ `scrollTop` khi đổi tab, chạm số câu tự sang tab "Câu hỏi".
7. Writing hai tab (4.3). Kiểm: ô viết cao ≥60% màn khi chưa có bàn phím, không có cuộn ngang, đổi tab không mất chữ.
8. T13: hộp xác nhận "Phần tiếp" (4.6), cả desktop. Kiểm: các trường hợp Esc, hết giờ khi hộp đang mở, phần cuối vẫn "Nộp Bài".
9. Vá nhỏ cho hộp nộp (4.4), nút nổi Ghi chú, gợi ý luyện tập (4.5), xoay ngang (`max-height: 500px`).
10. Biên bản thử trên iPhone Safari và Android Chrome (T14), quyết định thêm hay không các việc ở mục 10 (visualViewport, `interactive-widget`).

## 9. Ngoài phạm vi nhưng thấy khi đọc (ghi để PM xếp việc)

- Màn chuyển phần (`page.tsx:639-673`): lưới `repeat(N, 1fr)` trong `padding: 32` cho 4 phần ở 390px khiến mỗi ô ~70px, chữ "Listening" bị xuống dòng/tràn; `h1` 40px. Gợi ý ở mobile: lưới 2 cột, `main` padding 16, `h1` 32px (cần bỏ style inline hoặc `!important`).
- Speaking (`page.tsx:2084-2115`): hàng micro 72px + chữ + nút "Câu tiếp" (`margin-left: 16`) rộng ~360px, có thể tràn ở 360. Gợi ý `flex-wrap: wrap`.
- Banner mất mạng có thể đang bị header che (xem 4.5); cần ảnh chụp để xác nhận.
- Chữ "Đang chọn: Câu x / 40" lặp ở hai chỗ (header sticky của Listening và của Reading); ở mobile đã ẩn.

## 10. Tiêu chí chấp nhận (kiểm chứng được)

Khung kiểm: 390x844 (iPhone 14), 360x740 (Android tầm trung), xoay ngang 844x390 mức chấp nhận được; light và dark; trình duyệt tích hợp cho đo kích thước, máy thật cho các mục đánh dấu (M). Đo bằng `getBoundingClientRect()` và `document.documentElement.scrollWidth`.

Chung
1. A1. Ở 390x844 và 360x740, `document.documentElement.scrollWidth === window.innerWidth` ở Listening, Reading, Writing, hộp nộp, hộp "Phần tiếp" (không cuộn ngang).
2. A2. `window.scrollY` không đổi được khi vuốt trong phòng thi (body không cuộn) ở 3 phần; vùng giữa là vùng cuộn duy nhất.
3. A3. Header: `getBoundingClientRect().height` ≤ 52 và là một dòng ở 390 và 360 với đủ 4 phần thi; không phần tử nào của header có `offsetTop` khác nhau (không wrap); dòng đầu nội dung không bị header che.
4. A4. Chiều cao khung dùng `dvh`: không còn `100vh` trong luật của phòng thi ở ≤767 (kiểm bằng tìm kiếm trong `room.css` và `globals.css`); đáy khung cuộn khớp mép trên thanh điều hướng (M: iPhone Safari khi thanh địa chỉ co/giãn).
5. A5. Tất cả `button`, `.tab`, `.exam-nav-btn`, `input`, `select` nhìn thấy trong phòng thi có `getBoundingClientRect()` ≥ 44x44 (ngoại lệ: chip trạng thái không bấm được). Khoảng cách giữa hai nút kề nhau ≥6px.
6. A6. Mọi `input` và `textarea` có `getComputedStyle().fontSize` ≥ 16px; chạm vào ô điền trên iOS Safari trang không tự phóng to (M: `visualViewport.scale` vẫn 1).
7. A7. Không có `window.alert`; không có thay đổi ở desktop: ảnh chụp 1280x1000 của 4 màn trùng ảnh nền ở bước 1 (sai khác ≤ vài pixel do chữ).

Listening (T17)
8. L1. Ở 390 và 360, nút "Phát Audio Đề Thi" nằm hoàn toàn trong màn hình khi chưa cuộn, cao ≥48px, rộng ≥160px, chữ trên một dòng.
9. L2. Không còn hai cột: `.exam-audio-pane` rộng bằng viewport; `.exam-splitter-handle` không hiển thị.
10. L3. Phát audio 2 phút: đồng hồ giảm đúng 2:00 ± 2 s (không hồi quy T2); khi cuộn danh sách câu hỏi, thanh audio và nút Tạm dừng vẫn thấy.
11. L4. Vùng câu hỏi cao ≥ 400px ở 390x844 (Safari có thanh công cụ) và ≥ 380px ở 360x740.

Reading
12. R1. Có hai tab "Bài đọc" và "Câu hỏi · x/40"; khung bài đọc rộng ≥340px ở 390 (và ≥ 328 ở 360).
13. R2. Cuộn bài đọc 600px, sang tab "Câu hỏi", cuộn, quay lại: `scrollTop` mỗi khung còn nguyên.
14. R3. Chạm số 27 ở thanh dưới: tab "Câu hỏi" được chọn và câu 27 trong tầm nhìn; `ref` chip Passage 2 trong tab "Bài đọc" không tự nhảy sang tab "Câu hỏi".
15. R4. Xoay ngang 844x390 hoặc mở rộng ≥768: hiện lại hai khung cạnh nhau, không còn thanh tab.

Writing
16. W1. Tab "Đề bài" và "Bài viết"; chiều cao textarea ≥60% `window.innerHeight` ở 390x844 khi chưa mở bàn phím (ở viewport 664 cao thì ≥ 60% cũng đạt).
17. W2. Gõ 80 từ ở tab "Bài viết", sang "Đề bài" rồi quay lại: còn đủ 80 từ; đếm từ đúng.
18. W3. Thanh dưới chỉ có Task 1, Task 2, "Phần tiếp"; không cuộn ngang ở 360.

Bàn phím ảo và thanh điều hướng
19. K1. (M) Chạm ô điền câu 5 trên iOS Safari và Android Chrome: ô vẫn thấy phía trên bàn phím, thanh số câu và nút "Ghi chú" ẩn; bấm "Next/Tiếp" của bàn phím thì focus sang ô câu 6; ở ô cuối thì bàn phím đóng.
20. K2. Thanh điều hướng hiện lại ngay khi ô mất focus.

Hộp "Phần tiếp" (T13)
21. N1. Bấm "Phần tiếp" ở Listening/Reading/Writing/Speaking thì hiện hộp có chữ "Kết thúc phần {X}?", số câu chưa làm đúng, câu "Sau khi chuyển sẽ không quay lại phần này được."; "Làm tiếp" được focus mặc định; Esc hoặc chạm nền = ở lại.
22. N2. Không có thao tác chạm đơn nào chuyển phần hoặc nộp bài; ở phần cuối vẫn là "Nộp Bài" → hộp "Nộp bài thi?".
23. N3. Hết giờ khi hộp đang mở: vào màn chuyển phần, và sau khi phần mới bắt đầu hộp không hiện lại.
24. N4. Đồng hồ chạy bình thường khi hộp mở (không dừng).

Không hồi quy
25. G1. Chạy lại ba kịch bản T1-T3 đã nghiệm thu (đề ẩn báo đúng chữ; đồng hồ + audio; lỗi nộp hiện hộp lỗi và "Nộp lại"), kết quả như báo cáo `2026-10-23-ux-accept-p0.md`.

## 11. Giả thuyết cần thử máy thật (T14)

- **Header cố định khi bàn phím mở trên iOS**: iOS cuộn khung nhìn khi focus, `position: fixed` bám theo layout viewport nên header (có đồng hồ) có thể trượt khỏi màn khi gõ Writing. Nếu đúng: dùng `visualViewport` (`resize`/`scroll`) đặt `.room-root` thành `position: fixed` với `top = offsetTop`, `height = visualViewport.height` (biến `--room-vvh`), hoặc để đồng hồ nhỏ nằm trong hàng tiêu đề ô viết khi bàn phím mở.
- **`dvh` không co lại khi có bàn phím** (iOS Safari và Chrome Android mặc định): kiểm xem ô viết có bị bàn phím che đoạn đang gõ không. Phương án: `interactive-widget=resizes-content` cho Chrome Android (đặt `viewport` riêng cho route `/exam/[id]` qua `layout.tsx` phía server vì `page.tsx` là client component), `viewportFit: "cover"` cho vùng an toàn ở chế độ PWA (hiện `env(safe-area-inset-bottom)` bằng 0 vì `layout.tsx:17` chưa có `viewport-fit=cover`). Cả hai thay đổi `viewport` ảnh hưởng toàn site nếu đặt ở `app/layout.tsx`, nên chỉ đặt cho route thi.
- **`visibility: hidden` và `scrollTop`**: giữ vị trí cuộn trên Safari/Chrome di động (theo hiểu biết hiện tại là có; `display: none` thì mất). Kiểm nhanh khi làm bước 6.
- **Cỡ chữ đủ đọc**: bài đọc 15-16px trên 358px là khoảng 38-42 ký tự một dòng; thử với 5 học viên (UX-3 cũng đề xuất phỏng vấn) xem có cần mặc định 16 hay 17.
- **Nhãn "Câu hỏi · 12/40"**: 12 là số câu đã trả lời hay số câu đang xem? Thiết kế chọn "đã trả lời"; cần thử xem người dùng có hiểu không (đổi nhãn thành "Câu hỏi · đã làm 12/40" nếu mơ hồ).
- **Nút "Phần tiếp" nằm đầu thanh cuộn ngang**: có thể bị người dùng bỏ qua hoặc bấm nhầm sát "Đánh dấu". Hộp xác nhận giảm hậu quả; nếu vẫn thấy bấm nhầm khi thử, chuyển nút này về cuối danh sách câu hỏi (khối "Hết phần" cuối khung cuộn).
- **`:has()` ẩn thanh điều hướng**: hỗ trợ iOS 15.4+ và Chrome 105+; thử trên máy cũ nhất mà học viên dùng. Nếu cần lùi: dùng một class `room-typing` bật bằng `focusin/focusout` trên `.room-root`.
- **iOS chặn `play()`** (UX-8): bố cục mới không xử lý; để T9 thử trên iPhone thật cùng lúc, vì nút phát giờ ở vị trí cố định và dễ bấm hơn.
- **Ảnh chụp thật**: mọi số px trong báo cáo này suy ra từ CSS. Cần chụp 390x844 và 360x740 sau mỗi bước để đối chiếu, đặc biệt chiều cao hàng chip Part hai dòng và độ rộng nhãn header khi tên phần dài.
