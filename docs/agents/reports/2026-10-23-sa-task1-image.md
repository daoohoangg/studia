# SA – Cách xem hình Writing Task 1 (T37) (2026-10-23)

## Kết luận (1–3 câu)
Đã làm đủ 7 bước theo thiết kế UX: lớp xem hình (portal) với Vừa khung/100%/150%/200%, nút "Xem hình đề" ở mobile, cột đề `clamp(380px, 40%, 520px)` khi đề có hình, hình xuống sau "Yêu cầu tối thiểu", nhãn/alt mới, khung giấy trắng ở dark mode, trạng thái đang tải/lỗi/tải lại. `npm run typecheck` sạch; đã đo thật trên bản xem thử riêng (C16 Test 3, một ca C21 Test 1) ở 1280x800, 1024x768, 390x844, 360x740. Chưa thử máy thật (Back Android, TalkBack, chụm hai ngón).

## Đã thay đổi (file:dòng, lý do)
`page.tsx` giữ CRLF (vá bằng script Python đọc nhị phân, mỗi đoạn khớp đúng 1 lần, sao lưu ở scratchpad). `room.css` là tệp hỗn hợp (21 dòng đầu CRLF, phần còn lại LF): phần thêm theo LF như vùng xung quanh. Hai file mới theo CRLF như `ConfirmNextSection.tsx`.

- Bước 1 (nhãn + alt): `page.tsx:2097` "Task 1 — Summarise the information"; tính `descSentence` (đoạn đầu khớp `below|following`, dự phòng đoạn 2 rồi đoạn 1) và `figAlt = "Hình của đề Writing Task 1. " + descSentence` ở khối hook đầu `WritingSection` (~`:2056-2072`).
- Bước 2 (thứ tự + khung giấy): bỏ `<img>` cũ ở trên chữ đề; `Task1Figure` chèn ngay sau hộp "Yêu cầu tối thiểu" (`page.tsx:2111`); `room.css:40-50` `.exam-fig`, `.exam-fig-paper` (nền `#fff`, viền, bo), dark mode chỉ `filter: brightness(.92)` (không invert).
- Bước 3 (trạng thái): `src/components/exam/Task1Figure.tsx` (mới): đang tải ("Đang tải hình đề…", `role=status`), lỗi (đúng chữ thiết kế, `role=alert`, nút "Tải lại hình" thêm `?r=n`), nút "Phóng to hình" disabled khi chưa sẵn sàng; kiểm `img.complete` lúc gắn để khỏi nhấp nháy khi chuyển Task 1↔2. Trạng thái `imgState/imgTry/lbOpen/lbZoom/lbOpenerRef` ở `WritingSection` (không đổi `task1Text/task2Text`).
- Bước 4 (lightbox): `src/components/exam/ImageLightbox.tsx` (mới): `createPortal` vào `body`, `role=dialog aria-modal`, focus vào vùng cuộn khi mở, bẫy Tab, Esc đóng, phím `+ = - 0 1`, trả focus về nút đã mở, click chuột nền stage = đóng, click ảnh (chỉ chuột) đổi Vừa khung↔100%, `touch-action: pan-x pan-y pinch-zoom`, lỗi tải ảnh trong hộp có "Tải lại hình". `page.tsx:2168` render cuối `WritingSection`. CSS `.room-lb*` ở cuối `room.css` (ngoài `.room-root`), `top: 56px` (52px mobile) nên header/ExamTimer vẫn thấy; `z-index: 10000` < hộp nộp bài 99999.
- Bước 5 (cột đề): `page.tsx:2074` `data-fig`; `room.css:41` `.room-root .exam-writing-layout[data-fig="1"]` (đặt ở room.css theo ràng buộc, không sửa `globals.css`).
- Bước 6 (mobile): `page.tsx:2117-2128` hàng tiêu đề ô viết: `room-w-head`, nhãn "Task 1" + `<span class="room-hide-sm"> — Bài viết</span>` (aria-label đủ chữ), nút "Xem hình đề" (`room-w-viewimg`, ẩn ở desktop), `room-w-wc` cho số từ. `room.css:~125-134` (mobile) nút 44px, nút "Phóng to hình" rộng toàn hàng; lightbox mobile (toolbar dưới, 3 mức, mặc định 100%, caption 2 dòng, gợi ý kéo); `@media (max-height: 500px)` ẩn caption/gợi ý.
- Bước 7: rà các điều phải giữ (bên dưới). Không đụng `ExamTimer.tsx`, `handleSubmitExam`, `submitError`, `submittingRef`, `isPublishedBuiltin`, autosave, `globals.css`.

## Bằng chứng kiểm thử
- `cd frontend && npm run typecheck` sạch (sau vá và sau lần chỉnh cuối). Backend không đổi nên không chạy pytest.
- Xem thử cô lập: sao chép `src`+`public`+`.env.local` sang `frontend/.preview-sa-task1` (junction `node_modules`), `next dev -p 3198`. Đã tắt server, gỡ junction, xoá thư mục; `frontend/node_modules` còn nguyên; không chạm cổng 3000, không `next build`.
- C16 Test 3, 1280x800 (cửa sổ 1270 do thanh cuộn): cột đề 508 (40%), ô viết 762; ảnh thu nhỏ 435px; đáy hộp "Yêu cầu tối thiểu" 412 < đáy khung 740 (không cuộn). Mở lightbox: `role=dialog`, top = 56, header z 9999, focus ở `room-lb-stage`; Vừa khung 598x608 (stage 664 cao); phím `1` = 1060 (đúng D1), `+` → 1590 → 2120, `+` nữa không đổi, stage cuộn hai chiều ở 200%; `-` → 1590; `0` → Vừa khung; `aria-pressed` đúng. Tab từ "Đóng" quay về stage, Shift+Tab từ stage sang "Đóng"; Esc đóng và focus về "Phóng to hình". Đồng hồ 29:48 → 29:38 trong lúc mở/đóng (không dừng).
- Giữ chữ: gõ chữ, mở/đóng lightbox, chuyển Task 2 rồi Task 1: nội dung và nút textarea (cùng node DOM) không đổi; Task 2 không hiện hình, cột vẫn 508.
- 1024x768: cột đề 405, ô viết 608 (>= 590), đáy hộp 435 < 708.
- 390x844: không cuộn ngang; tab "Đề bài": ảnh rộng 344, nút "Phóng to hình" 358x44; tab "Bài viết": hàng tiêu đề 366x44 "TASK 1 | Xem hình đề (110x44) | 0 từ (cần thêm 150)", ô viết cao 582 = 69% màn; lightbox mở ở "100%" (ảnh 1060), thanh dưới 4 nút cao 44 ("Vừa khung" 90, "100%" 56, "150%" 56, "Đóng" 72), không có 200%, gợi ý hiện; đóng thì focus về "Xem hình đề".
- 360x740: hàng tiêu đề 46 + 110 + 123 trong 336 (không đè), toolbar 4 nút trong 1 dòng, `scrollWidth` 360.
- Lỗi tải: đổi `src` sang ảnh không tồn tại → khung hiện đúng chữ + "Tải lại hình", cả hai nút phóng to disabled; bấm "Tải lại hình" → `src` có `?r=1`, trạng thái về "ready".
- Dark (C21 Test 1): khung giấy `rgb(255,255,255)`, filter `brightness(0.92)`; stage `rgb(9,13,28)`; hộp "Yêu cầu tối thiểu" nằm trong khung; alt chứa câu "The graph below gives…". Click nền stage bằng chuột đóng lightbox.

## Hiệu năng / chi phí
Không đổi (một ảnh, lightbox dùng lại cùng URL nên lấy từ cache). Thêm 2 component nhỏ, không thêm thư viện.

## Tiêu chí chấp nhận
| # | Kết quả |
|---|---|
| D1 100% = 1060 ±2, đọc được số cổng | **Chắc** về số đo (1060); "đọc được bằng mắt" cần UX xem ảnh chụp |
| D2 Vừa khung trọn trong stage; 200% cuộn hai chiều | **Chắc** (608 <= 664-32; scroll hai chiều true) |
| D3 mobile mặc định 100%, không cuộn ngang trang | **Chắc** (390 và 360); vuốt một ngón cần máy thật |
| D4 nút lightbox mobile >=44, khoảng cách >=6, 360 không xuống dòng | **Chắc** (44 cao, rộng >=56, gap 8, một dòng) |
| K1 Esc + trả focus + Tab vòng | **Chắc** (đo bằng sự kiện bàn phím tổng hợp); cần UX thử phím thật và trình đọc màn hình |
| K2 `+ - 0 1` + `aria-pressed` | **Chắc** |
| K3 chữ không đổi, đếm từ không đổi, qua lại Task | **Chắc** |
| K4 alt và nhãn khung | **Chắc** ở C16 Test 3 và C21 Test 1; 6 đề còn lại: cùng quy tắc, đã đọc dữ liệu (mỗi đề có đoạn "below") nhưng chưa mở từng đề |
| L1 hộp "Yêu cầu tối thiểu" thấy không cuộn (1280, 1024) | **Chắc** ở 2 đề; cần UX đo đủ 8 đề (C16 Test 1 ảnh cao 1020 vẫn nằm sau hộp nên không ảnh hưởng, nhưng chưa đo) |
| L2 cột 410/512 ±4, giữ khi đổi Task, ô viết >=590 ở 1024 | 508 và 405 (do thanh cuộn dọc 15px của cửa sổ đo: 40% của 1270/1009); giữ nguyên khi đổi Task; ô viết 608. Cần UX xác nhận cách đo (có thanh cuộn hay không) |
| L3 mobile ô viết >=60%, tiêu đề không bị cắt ở 360 | **Chắc** (69%; 360 vừa) |
| L4 tab Đề bài: ảnh ~358, nút toàn hàng 44 | Ảnh 344 (padding 6+6 của khung giấy), nút 358x44; **Chắc**, lệch nhỏ so với "~358" do khung giấy |
| S1 offline | **Chắc** đã mô phỏng lỗi tải; chưa chặn mạng thật bằng DevTools |
| S2 mạng chậm | Chắc theo mã ("Đang tải hình đề…", nút disabled); cần UX throttle để xem |
| S3 dark: khung trắng, chỉ brightness | **Chắc**; độ tương phản chữ ảnh >=4,5:1 cần UX đo |
| G1 không hồi quy P0/T22/T38 | Không đổi mã nộp bài/đồng hồ; **cần UX chạy lại** kịch bản |
| G2 mở lightbox rồi bấm "Nộp bài" | Lỗi thật khi đo (hộp bị che); đã sửa, xem mục "Sửa sau nghiệm thu G2"; **cần UX đo lại** |

## Sửa sau nghiệm thu G2 (lightbox che hộp "Nộp bài thi?")
Nguyên nhân: hộp 99999 nằm trong `main.app-main` (ngữ cảnh xếp chồng riêng) nên thua lightbox 10000 ở `body`. Sửa theo hướng lightbox tự đóng, không đổi z-index/portal (header và đồng hồ vẫn không bị phủ).
- `page.tsx:831` truyền `overlayOpen={showSubmitModal || confirmNext || !!submitError}` vào `WritingSection`; `page.tsx:2049` nhận prop; `page.tsx:2073-2077` `useEffect` đóng lightbox khi `lbOpen && (overlayOpen || !isTask1)`. Chỉ đổi `lbOpen`; không đụng chữ, đồng hồ, autosave.
- `ImageLightbox.tsx:41-53`: khi đóng, chỉ trả focus về nút mở nếu focus còn trong lightbox hoặc đã rơi về `body`; nếu focus đã ở chỗ khác (nút "Nộp bài" header, hộp xác nhận) thì không giật lại. Esc/click nền/nút Đóng vẫn trả focus như cũ.
- Danh sách overlay: (1) hộp "Nộp bài thi?" `showSubmitModal` (gồm cả lỗi nộp `submitError` hiển thị trong hộp, và hộp tự hiện khi hết phần cuối `nextSection/startSection`), xử lý bằng cờ; (2) hộp "Phần tiếp" `confirmNext`, bằng cờ; (3) màn hết giờ (`timeUp`, return sớm) và (4) màn nghỉ giữa phần (`breakTo`, return sớm): thay cả cây nên `WritingSection` và portal bị gỡ, không cần xử lý; đổi phần cũng gỡ `WritingSection`; (5) nút "Hiện Question Navigator" (z 9999) và toast (z 80) nằm dưới/không chặn nên không xử lý; ngoài ra đổi Task 1 sang Task 2 cũng đóng (tránh mở lại ngoài ý muốn khi quay về Task 1).
- `npm run typecheck` sạch. Chưa đo trình duyệt (PM giữ bản xem thử).
- UX thử: mở `/exam/demo?type=cambridge16_test3&sm=real&sections=writing&mins=writing:30`, bấm "Phóng to hình", bấm "Nộp bài" ở header: lightbox biến mất và hộp "Nộp bài thi?" hiện trên cùng, `elementFromPoint` tại "Nộp Bài Thi" phải trả về nút; chữ đã gõ, đồng hồ còn nguyên; bấm "Ở lại/Huỷ" rồi mở lại lightbox bình thường. Thử thêm: lightbox mở + chế độ nhiều phần (`sections=writing,speaking`) bấm "Phần tiếp" → hộp xác nhận hiện trên cùng; Esc/nút Đóng trong lightbox vẫn trả focus về "Phóng to hình"; mobile 390x844 cùng kịch bản.

## Rủi ro và việc còn lại
- **Cần UX đo trên trình duyệt thật**: focus trap/Esc bằng phím thật; cuộn mượt trong khung; nút Back Android khi lightbox mở (không push history theo yêu cầu); chụm hai ngón; TalkBack/VoiceOver (`aria-modal` có thể chưa đủ, có thể cần `inert` cho `.room-root`); độ sắc nét ảnh ở 200%.
- Khi lightbox mở, Tab không tới được phần còn lại của trang, nhưng người dùng chuột vẫn bấm được nút "Nộp bài" ở header (chủ ý, theo thiết kế).
- Hết giờ phần Writing khi lightbox mở: `WritingSection` bị gỡ nên portal biến mất cùng; chưa thử thật.
- Hạn chế đã biết: alt mô tả đề, không mô tả số liệu của hình.
- Không gộp T32 (cuộn thừa 56px, nút Ghi chú, cột Reading, banner luyện tập). Tệp `room.css` có kiểu xuống dòng hỗn hợp từ trước, không chuẩn hoá.

## Việc người dùng phải tự làm
Commit (SA không commit). Không có migration, biến môi trường hay khoá API.

## URL demo cho UX (cần `NEXT_PUBLIC_AUTH_DISABLED=true`, dùng bản xem thử riêng; thêm `mins=writing:30` để đồng hồ đủ dài)
- Ca khó nhất C16 Test 3: `/exam/demo?type=cambridge16_test3&sm=real&sections=writing&mins=writing:30`
- C21 (ảnh ngang): `/exam/demo?type=cambridge21_test1&sm=real&sections=writing&mins=writing:30`
- Các đề còn lại: đổi `type` thành `cambridge16_test1|2|4`, `cambridge21_test2|3|4`
- Mobile dùng cùng URL ở 390x844 / 360x740; vào tab "Bài viết" để thấy "Xem hình đề"
