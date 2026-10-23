# SA – Bố cục phòng thi trên điện thoại (T17 + T7 + T13) (2026-10-23)

## Kết luận (1–3 câu)
Đã làm đủ 10 bước theo thiết kế UX (bước 10 là việc của UX, SA chỉ chuẩn bị). Mọi luật mới nằm trong `@media (max-width: 767px)`; desktop giữ giá trị cũ (style inline `width`/`height` đổi sang biến CSS `--split`, `--qw`, `--layout-h` có cùng giá trị). `npm run typecheck` sạch, và đã đo thật trên bản xem thử riêng ở 390x844 và 360x740: Listening/Reading/Writing đạt các tiêu chí đo được; chưa thử trên iPhone/Android thật nên các mục bàn phím ảo và thanh địa chỉ Safari cần UX đo.

## Đã thay đổi (file:dòng, lý do)
`page.tsx` giữ CRLF (2256/2256 dòng CRLF), vá bằng script Python đọc nhị phân, mỗi đoạn khớp đúng 1 lần (đã sao lưu bản trước vá ở scratchpad). `room.css` là LF (giữ LF). Không đụng `ExamTimer.tsx`, `handleSubmitExam`, `submitError`, `submittingRef`, `isPublishedBuiltin`, autosave, logic chấm, `nextSection`/`startSection` (chỉ thêm `setConfirmNext(false)`).

**Bước 1 – class/biến CSS, desktop không đổi**
- `frontend/src/app/exam/[id]/room.css:25-43` (khối "desktop"): `.room-root` (thay `style` inline `background/minHeight`), `.room-root .exam-listening-layout/.exam-reading-layout { height: var(--layout-h, …) }`, `width: var(--split)`, `width: var(--qw)`, và các class `room-l-*`, `room-audio-*`, `room-w-*` mang đúng giá trị inline cũ.
- `page.tsx:719` root `className="room-root"`; `:1272` (Listening) và `:1755` (Reading) `style={{ …, "--layout-h": showNav ? "calc(100vh - 54px - 60px)" : "calc(100vh - 54px)" }}`; khung audio/bài đọc `"--split"`, khung câu hỏi `"--qw"`.

**Bước 2 – khung trang (room.css, khối `@media (max-width: 767px)`)**: `.room-root` cột flex `height: 100vh; height: 100dvh; overflow: hidden`, `padding-top: --room-header-h (52)`, `padding-bottom: calc(--room-nav-h (56) + env(safe-area-inset-bottom))`; `.exam-content`/các layout `flex: 1; min-height: 0; height: auto`. Chỗ duy nhất cần `!important` cho khung: `padding-bottom: 0 !important` của `.exam-content` (inline `paddingBottom`).

**Bước 3 – header một dòng**: `page.tsx:722-728` bọc "IELTS Mock Test" và chip chế độ bằng `room-hide-sm`, thêm `<span class="exam-header-now">` ("Reading · 2/4" + "Thi thật/Luyện tập", `role="group"` + `aria-label`); `:731` `exam-header-parts` (ẩn viên phần thi); "Không giới hạn" + `room-hide-sm` " giờ"; `room-header-right`; `room-offline` cho banner mất mạng. CSS: header 52px không wrap, nút Nộp bài 44px (`--_h: 44px`), timer `min-width: 72px`. Cùng một header cho mọi kích thước, `ExamTimer` không bị gỡ/gắn lại.

**Bước 4 – Listening (mốc P0)**: `page.tsx` `ListeningSection`: `useNarrow()` + `showLeft = narrow || !leftCollapsed`; thêm class `room-l-parts`, `room-l-title`, `room-l-wave`, `room-l-guide`, `room-l-prevnext`, `room-audio-row`, `room-audio-btn` (chuyển `padding`/`fontSize` inline sang CSS), `room-audio-note`, `room-chips`, `room-chip-range` (chip Part hai dòng "Part 1" / "(Q1-10)"), `room-hide-sm` cho "Đang chọn: Câu x / 40", `room-qcard`; nút "Hiện Audio (Bên trái)" không hiện khi hẹp (`!narrow`). CSS: thanh audio ở trên (`flex: none`, `position: relative; z-index: 6` để nội dung cuộn không lọt qua mép), ẩn splitter/hướng dẫn/sóng/tiêu đề/Câu trước-Câu sau, nút phát `flex: 1; min-height: 48px; font-size: 16px`, chip Part `min-height: 44px` dính trên khung cuộn duy nhất; `scrollIntoView` dùng `behavior: "auto"` khi hẹp.

**Bước 5 – thanh điều hướng + ô nhập**: `page.tsx:271-278` `navRef` + effect đưa ô câu hiện tại về giữa (chỉ khi hẹp); `room-nav-next`, `room-nav-hide` ("Ẩn Navigator" ẩn khi hẹp, thanh luôn hiện: `(showNav || narrow)`), `room-nav-task`, `room-w-counts`, nút đánh dấu "Đánh dấu"/"Bỏ đánh dấu" + `<span class="room-nav-qn"> câu N</span>` ẩn khi hẹp, `aria-label` đầy đủ. `:1118-1132` `focusNextFill` + `FILL_INPUT_PROPS` (`enterKeyHint="next"`, `autoCapitalize/autoCorrect="off"`, `spellCheck={false}`, Enter nhảy ô kế, hết thì `blur()`) gắn vào 4 ô điền (Listening 2, Reading 2). CSS: nút nav 44x44, `font-size: 14px`, ô điền `16px !important` (Reading có inline) + `min-height: 44px`, `.exam-input` 16px, `:has(input:focus, textarea:focus, select:focus)` ẩn thanh nav và nút Ghi chú + `padding-bottom: 0`. Sửa chữ "Cầu" thành "Câu" (đúng dòng ~1255 ở Listening; chữ sai là "C" + "â" + dấu huyền rời nên grep thường không khớp).

**Bước 6 – Reading hai tab**: `ReadingSection`: state `mobileTab`, `fromPassageChip`, `prevQ`, `passagePaneRef`; thanh `tabs room-tabs` (`role="tablist"`, "Bài đọc" / "Câu hỏi · x/40" kèm `aria-label` "đã trả lời x trên y"), `data-tab` trên layout, `role="tabpanel"` khi hẹp. CSS: hai khung `position: absolute` trong layout, khung không chọn `visibility: hidden; pointer-events: none` (không gỡ khỏi DOM, giữ `scrollTop`). Effect `[currentQ]`: đổi câu thì sang tab "Câu hỏi", trừ khi đến từ chip Passage ở tab "Bài đọc" (chip đó ở lại tab, cuộn bài đọc về đầu). So sánh `prevQ` (không dùng cờ "lần đầu") nên không nhảy tab ở lần gắn đầu và trong StrictMode. Thanh công cụ: chip Passage `min-height: 44px`, A-/A+ `min 44x44` (không cần `!important`), ẩn chọn font và "Ẩn bài đọc" (`display: none !important` vì inline `display:flex`).

**Bước 7 – Writing hai tab**: `WritingSection`: state `mobileTab` ("prompt" mặc định), thanh tab "Đề bài" / "Bài viết", `data-tab`; CSS giống Reading; ẩn nút Task 1/2 trong khung đề (`room-w-tasktabs`) và nhãn thang (`room-w-scale`), ẩn "Task 1: x từ | Task 2: y từ" và "Ẩn Navigator"; thanh dưới chỉ còn Task 1, Task 2, "Phần tiếp". Textarea `flex: 1; min-height: 240px`.

**Bước 8 – T13 hộp xác nhận "Phần tiếp" (cả desktop)**: `frontend/src/components/exam/ConfirmNextSection.tsx` (mới): `role="alertdialog"`, `aria-labelledby/describedby`, "Làm tiếp" (`autoFocus`, nút chính) trên, "Kết thúc phần" dưới, Esc/chạm nền = ở lại, trả focus về nút đã mở. `page.tsx:269` `confirmNext`, `:528` `requestNext` (phần cuối vẫn đi thẳng vào hộp "Nộp bài thi?"), `:702` `confirmSummary()` (Listening/Reading: "Bạn còn n câu chưa làm và f câu đang đánh dấu." hoặc "Bạn đã trả lời tất cả các câu."; Writing: "Bạn mới viết k/2 bài." + số từ Task 2 nếu thiếu; Speaking: hoàn thành hay chưa), `:1106` render; 3 nút "Phần tiếp" (Listening/Reading, Writing, Speaking) đổi `onClick` sang `requestNext`. `nextSection` và `startSection` thêm `setConfirmNext(false)` nên hết giờ khi hộp đang mở không để hộp hiện lại ở phần sau; đồng hồ không bị chạm.

**Bước 9 – hộp nộp, Ghi chú, gợi ý, ngang**: `page.tsx:1076` `room-modal-actions` (bỏ `fontSize` inline, chuyển vào CSS), hộp thoại mobile `width: calc(100% - 32px)`, `max-height: calc(100dvh - 32px)`, nút xếp dọc ("Tiếp tục làm bài" trên, nút nộp dưới) cao 48px/16px; `.exam-notes-fab`, `.exam-notes`, `.practice-hint` theo `--room-nav-h`; `@media (max-height: 500px)` ẩn hướng dẫn/sóng/tiêu đề audio. Sửa nhỏ trong cùng media query: Speaking hàng micro `room-sp-row { flex-wrap: wrap }`; banner mất mạng `font-size: 13px; padding: 8px 12px`.

**File mới**: `frontend/src/lib/useMediaQuery.ts` (`useMediaQuery`, `useNarrow`: giá trị đầu `false`, đồng bộ sau khi gắn), `frontend/src/components/exam/ConfirmNextSection.tsx`.

## Bằng chứng kiểm thử
- `cd frontend && npm run typecheck` → **sạch** (chạy sau bước patch lớn và sau lần sửa cuối `ConfirmNextSection.tsx`).
- Xem thử cô lập: sao chép `src` sang `frontend/.preview-sa-mobile` (junction `node_modules`), `NEXT_PUBLIC_AUTH_DISABLED=true`, cổng 3199, trình duyệt thu nhỏ. Đã **tắt server, gỡ junction rồi xoá thư mục**; `frontend/node_modules` còn nguyên. Không chạm `next dev` cổng 3000 và không chạy `next build`.
- Đo thật ở **390x844** (đề `cambridge16_test1`, chế độ Thi thật): `scrollWidth = 390`; header cao 52, cột câu hỏi 137→788 (651px, ≥400); nút phát audio 239x48 ở (12, 80), nằm trong màn hình khi chưa cuộn; 152 nút/ô nhìn thấy đều ≥44x44; ô nhập `font-size 16px`; Part chip 118x44; **Reading**: tab "Bài đọc"/"Câu hỏi · 0/40", khung bài đọc rộng 390, cuộn bài đọc 600 và câu hỏi 400 giữ nguyên sau khi qua lại hai tab; chạm số 27 ở thanh dưới khi đang ở "Bài đọc" thì chuyển sang tab "Câu hỏi"; chạm chip Passage 2 ở tab "Bài đọc" thì ở lại tab; chạm chip Passage 3 ở tab "Câu hỏi" thì ở lại; **gõ ô điền**: thanh nav ẩn, `padding-bottom: 0`, Enter nhảy ô kế, bỏ focus thì thanh hiện lại; **Writing**: textarea 366x606 = 72% màn, đặt 80 từ rồi qua lại hai tab vẫn đủ 80 từ; thanh dưới Task 1 (72x44), Task 2, "Phần tiếp" (101x44); **hộp "Phần tiếp"**: hiện đúng chữ ("Bạn còn 40 câu chưa làm. Sau khi chuyển sẽ không quay lại phần này được."), Esc đóng, "Kết thúc phần" sang màn chuyển phần.
- **360x740** (chế độ Luyện tập): header 52 một dòng (nhãn 139px, timer 72, Nộp bài 79x44), nút phát 209x48, `scrollWidth = 360`, cột câu hỏi 547px, nút Ghi chú 81x44 và gợi ý luyện tập không đè nhau.
- **Desktop 1280x1000** đo lại: header 56, layout cao 886 (= 100vh − 54 − 60 như cũ), thanh nav 60, splitter 8px, không hiện thanh tab/`exam-header-now`, nút phát vẫn `13.6px; padding 10px 22px`. Chưa so ảnh chụp trước/sau từng pixel (không có ảnh nền từ trước khi sửa). Lưu ý: ở 1280 khung audio vẫn bị ép còn ~306px (nút phát xuống dòng) vì `flex-shrink` mặc định, đây là hành vi **đã có** ở desktop và không đổi.
- Ca biên: đồng hồ/audio không đổi mã; phát audio thật chưa thử (bản xem thử không có file audio).

## Hiệu năng / chi phí
Không đổi. Hai effect mới nhẹ (cuộn thanh nav chỉ khi hẹp; `matchMedia` dùng `change`).

## Tiêu chí chấp nhận (mục 10 của thiết kế)
| # | Tiêu chí | Kết quả |
|---|---|---|
| A1 | Không cuộn ngang | **Chắc** ở 390 và 360 (Listening, Reading, Writing; hộp "Phần tiếp" đã mở ở 390 không làm tràn). Hộp nộp bài chưa mở ở 360: cần đo |
| A2 | Body không cuộn trong phòng thi | Gần chắc: `scrollY = 0`, root `100dvh; overflow: hidden`; cần UX vuốt thử |
| A3 | Header ≤52, một dòng, 4 phần | **Chắc** ở 390 và 360 (52px, các con cùng `top`) |
| A4 | Dùng `dvh`, đáy khớp mép nav | Mã dùng `100dvh` (kèm `100vh` dự phòng, `50vh`/`100vh` dự phòng ở hai chỗ); **cần đo Safari iOS khi thanh địa chỉ co/giãn** |
| A5 | Vùng chạm ≥44, khoảng cách ≥6 | **Chắc** trong Listening ở 390 (0 nút <44) và nav gap 6px; Reading/Writing đo kích thước nút chính đạt, chưa quét toàn bộ từng màn |
| A6 | Ô nhập ≥16px, iOS không phóng to | `font-size` đo được 16px (**chắc**); việc iOS không phóng to cần máy thật |
| A7 | Không `alert`; desktop không đổi | Không thêm `alert`; desktop **đo lại số liệu chính trùng**, nhưng cần UX so ảnh 1280x1000 |
| L1 | Nút phát trong màn, ≥48 cao, ≥160 rộng, một dòng | **Chắc** (239x48 ở 390; 209x48 ở 360) |
| L2 | Không còn hai cột; splitter ẩn | **Chắc** |
| L3 | Phát audio 2 phút: đồng hồ đúng; thanh audio dính khi cuộn | Thanh audio **chắc** nằm ngoài vùng cuộn; đồng hồ + audio thật **cần đo** (mã audio/đồng hồ không đổi) |
| L4 | Vùng câu hỏi ≥400 (390x844) / ≥380 (360x740) | **Chắc**: 651 và 547px (viewport đầy đủ; Safari có thanh công cụ cần đo) |
| R1 | Hai tab, bài đọc ≥340 rộng | **Chắc** (390px) |
| R2 | Giữ `scrollTop` hai khung | **Chắc** (600/400 giữ nguyên); trên Safari/Chrome di động cần máy thật |
| R3 | Chạm số câu sang tab "Câu hỏi", chip Passage không tự nhảy tab | **Chắc** (đã thử cả hai); giới hạn: chạm đúng số câu đang chọn khi đang ở tab "Bài đọc" thì không đổi tab (câu không đổi nên effect không chạy) |
| R4 | Xoay ngang/≥768 quay lại hai khung | Chắc theo mã (mọi luật nằm trong media query; thanh tab `display: none` ở desktop); chưa xoay thật |
| W1 | Ô viết ≥60% | **Chắc**: 72% ở 390x844; ở viewport 664 cao ước tính ~66%, cần đo |
| W2 | Đổi tab không mất chữ | **Chắc** (80 từ còn đủ) |
| W3 | Thanh dưới chỉ Task 1/Task 2/Phần tiếp, không cuộn ngang ở 360 | Chắc ở 390 (3 nút); ở 360 chưa chạy riêng Writing: cần đo nhanh |
| K1 | Bàn phím ảo iOS/Android | **Cần máy thật** (logic Enter-nhảy ô và ẩn nav đã đúng trên trình duyệt thu nhỏ) |
| K2 | Nav hiện lại khi mất focus | **Chắc** |
| N1 | Hộp "Phần tiếp": chữ, số câu, Esc, focus mặc định | **Chắc** (chữ, Esc, "Kết thúc phần" đã thử; Listening/Reading); Writing/Speaking đọc mã |
| N2 | Không có thao tác một chạm chuyển phần/nộp | **Chắc** theo mã (3 nút đều qua `requestNext`; phần cuối vẫn "Nộp Bài" → hộp "Nộp bài thi?") |
| N3 | Hết giờ khi hộp đang mở | Chắc theo mã (`nextSection` xoá `confirmNext`); **cần đo** bằng `mins=listening:1` |
| N4 | Đồng hồ chạy khi hộp mở | Chắc theo mã (không đụng timer); quan sát đồng hồ giảm khi hộp mở ở bản xem thử |
| G1 | Không hồi quy T1–T3 | Không đổi mã T1–T3; **cần UX chạy lại** kịch bản |

## Rủi ro và việc còn lại
- **Sửa phát sinh khi đo**: nội dung cuộn bị lọt vài pixel qua mép dưới thanh audio (chữ "IELTS LISTENING — PART 1" thấp thoáng); đã sửa bằng `position: relative; z-index: 6` trên `.exam-audio-pane` (xác nhận đã hết khi thử ở trình duyệt). UX nên nhìn lại ảnh.
- **Việc còn lại / ngoài phạm vi**: (1) màn chuyển phần (lưới `repeat(N, 1fr)` 4 ô trong `padding: 32` ở 390px, `h1` 40px) chưa sửa: cần bỏ style inline hoặc `!important`, tách thành việc riêng; (2) banner mất mạng: sau khi root là cột flex có `padding-top` bằng header thì banner nằm dưới header (không bị che nữa ở mobile); desktop có thể vẫn bị header che, chưa đo; (3) `autoCapitalize="sentences"` cho ô Writing: cần PM duyệt, chưa đổi; (4) thông báo "Chưa có nội dung bài đọc" khi bài đọc rỗng, và cỡ chữ bài đọc mặc định 16px khi hẹp: chưa làm (việc nhỏ); (5) trạng thái nút audio "Đang tải/Lỗi/Chưa có audio" thuộc T9; (6) hộp "Phần tiếp": nhãn "Câu hỏi · x/40" là số câu đã trả lời, cần UX kiểm xem người dùng có hiểu không; (7) giả thuyết của UX mục 11 (header trượt khỏi màn khi bàn phím mở trên iOS, `dvh` không co khi có bàn phím, `visualViewport`, `interactive-widget`) **chưa xử lý**, chờ T14; (8) điện thoại nằm ngang (844x390) chỉ ẩn khối phụ, giữ header 56/nav 60 của desktop và hai cột 38%: chưa đúng đặc tả `--room-header-h: 44px` (chấp nhận, không phải trọng tâm); (9) các luật mobile cũ ở `globals.css:1217` (`.exam-writing-layout` một cột) và `:1287` (`.exam-header` wrap) **chưa xoá**: `.room-root …` có độ ưu tiên cao hơn nên đè được, và màn chuyển phần vẫn cần luật header cũ; (10) `.room-root:has(...)` cần iOS ≥15.4 / Chrome ≥105.
- Đã chạy `taskkill`/gỡ junction và xoá thư mục xem thử. **File nhật ký `E:\tmp_sa_preview.log` còn sót** (hệ thống chặn xoá đường dẫn gốc ổ đĩa) — người dùng có thể xoá tay.

## Việc người dùng phải tự làm
- Commit các thay đổi (SA không commit). Không có migration, biến môi trường hay khoá API.
- Xoá `E:\tmp_sa_preview.log` (tệp nhật ký tạm).

## URL demo cho UX (390x844, không cần backend, cần `NEXT_PUBLIC_AUTH_DISABLED=true` như bản xem thử riêng của UX)
- Cả bốn phần: `/exam/demo?type=cambridge16_test1&sm=real&sections=listening,reading,writing,speaking`
- Chỉ Listening có audio ở máy dev: `/exam/demo?type=cambridge16_test1&sm=real&sections=listening&mins=listening:30`
- Chỉ Reading + Writing (thử hộp "Phần tiếp" và hai tab): `/exam/demo?type=cambridge16_test1&sm=real&sections=reading,writing&mins=reading:2,writing:2`
- Hết giờ khi hộp đang mở (N3): `sections=listening,reading&mins=listening:1,reading:1`
- Chế độ luyện tập (nút Ghi chú, gợi ý): đổi `sm=practice`
