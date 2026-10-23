# Rà nhanh UX: thi thử IELTS trên web desktop (1280x800, 1366x768, 1024x768)

Người rà: agent UX Senior · Ngày: 2026-10-23 · Phương pháp: chạy thật trên bản xem thử cô lập `localhost:3016` (auth tắt, KHÔNG có backend, chỉ có audio `cambridge16_test1.wav`), dark mode mặc định; light mode kiểm bằng cách đặt `data-theme="light"`. Có đo bằng `javascript_tool`. Không sửa mã, không đụng cổng 3000/8000.

Đã đi: sảnh (tìm, lọc "Của bạn"/"Có sẵn", rỗng, chọn chế độ, thời gian) → Listening (real + practice, bấm phát audio) → Reading (tô sáng, đánh dấu, Enter nhảy ô, chip Passage) → hết giờ → màn chuyển phần → Writing (gõ, đếm từ) → hộp "Nộp bài thi?" → kết quả + "Giải thích" → Speaking (practice) → light mode. Đọc trước 3 báo cáo mobile + `PROGRESS.md`; mục trùng ghi "đã có T…".

Chưa kiểm được: Speaking ghi âm (mic), chấm Writing/giải thích bằng AI (cần backend), phím tắt hệ điều hành, hiệu năng trên máy yếu, âm thanh thật (chỉ xác nhận `audio.currentTime` chạy).

## Kết luận (1–3 câu)

Khung phòng thi desktop khá gọn (hai cột, đồng hồ đúng, Enter nhảy ô, hộp xác nhận rõ), nhưng chưa tới mức "như máy thi thật": đề Cambridge 21 Test 1 thiếu hẳn biểu đồ Writing Task 1 và nhiều bài đọc là một khối chữ liền; thanh số câu không vừa 1024–1366px; không có phím tắt/ngữ nghĩa cho bàn phím. Màn kết quả cho điểm nhưng chưa nói học viên nên sửa gì tiếp.

## Painpoint

| # | Mức độ | Luồng / màn hình | Mô tả | Bằng chứng | Loại |
|---|---|---|---|---|---|
| UXW-1 | Nghiêm trọng | Writing Task 1 (Cambridge 21 Test 1) | Đề Task 1 là biểu đồ nhưng không có hình: ô đề chỉ là chữ OCR rác, học viên không viết được bài mô tả biểu đồ. | 1280x800: khung đề không có `img/svg/canvas` (đếm 0). Chữ thực tế: "Writing WRITING WRITING TASK 1 You should … Number of jobs in four sectors … Manufacturing E - -c- - Retail C: VI 10 .c --·----- Agriculture 0 -, •····+···· Healthcare 5 0 -t------ -""T"------""T"---------, 1960 1980 2000 2020 Year → 1- p. 1251 29". Cần SA xác nhận có phải do bản xem thử thiếu ảnh hay dữ liệu thật (chỉ kiểm cambridge21_test1). | Chức năng (chặn hoàn thành) |
| UXW-2 | Cao | Mọi phần: thanh số câu dưới đáy | 40 ô không vừa chiều ngang, tạo thanh cuộn ngang; Q27–40 (Reading Passage 3, Listening Part 4) nằm ngoài màn hình. Máy thi thật hiển thị tất cả, nhóm theo Part. | `.exam-navigator` `scrollWidth/clientWidth`: 1951/1270 (1280), 1960/1356 (1366), 1960/1014 (1024). Chỉ thấy tới ô 26–28; ô 40 mất. Nút 34x34. | Chức năng + hiển thị |
| UXW-3 | Cao | Nội dung đề: Reading, Listening, kết quả | (a) Bài đọc là khối 2948 và 2711 ký tự trong một `<p>`, câu hướng dẫn dính vào bài ("PASSAGE 1 You should spend about 20 minutes… The Davies Sisters Between 1908…"), tên bị lặp "UlbeBosma Ulbe Bosma's", không có nhãn đoạn A–G; (b) Listening note completion hiển thị mảnh rời ("on it • no", "Nature reserve • maintaining paths • nesting boxes…") thay vì mẫu ghi chú có ô trống; (c) Nhãn dạng câu sai: Q14–17 "Multiple Choice" nhưng đáp án C,B,A,G; Q31–36 "Multiple Choice" đáp án H,E,I; Q37–40 gắn "True / False / Not Given" nhưng đáp án YES/NO. Đọc 40 câu trên bài như vậy rất mệt và sai dạng thì mẹo giải thích cũng sai. | Đo: `p` dài 2948/2711, font 15px, line-height 27px, cột bài đọc ≈ 427px nội dung (≈57 ký tự/dòng, mức đọc ổn). Bảng kết quả (trang text) liệt kê đúng các nhãn trên. | Chức năng (chất lượng nội dung) |
| UXW-4 | Cao | Màn kết quả | (a) "Overall band 1.0" chỉ tính Reading (Writing "Chưa chấm tự động"), vẫn tên "Overall", dễ hiểu nhầm; (b) câu bỏ trống bị ghi "✕ Sai" giống câu sai thật, không phân biệt; (c) câu "Xem bảng bên dưới để biết bạn mất điểm ở dạng câu hỏi nào" nhưng không có thống kê theo dạng, chỉ danh sách từng câu; (d) "Giải thích" là mẫu chung ("Đáp án đúng là mining. Bạn đã chọn "industry"… Mẹo làm dạng này: Gạch chân từ khoá… Giải thích tự động theo đáp án và nội dung bài."), không trích câu trong bài, không nút "Xem trong bài"; (e) tab Writing mặc định là Task 2 ("0 từ · tối thiểu 250") dù Task 1 đã viết 20 từ; (f) chỉ 3 nút: "Chụp ảnh kết quả", "Xem phân tích lỗi", "Làm đề khác", không có "Làm lại các câu sai" hay gợi ý 1 việc tiếp theo. Một phần (d)(f) cần backend để xem bản đầy đủ (chưa kiểm). | Trang kết quả: "Reading 1.0 / 0/40 câu đúng", Q2–40 "(bỏ trống) ✕ Sai"; giải thích Q1 như trích trên. | Chức năng (học tập) |
| UXW-5 | Cao | Bàn phím và trình đọc màn hình | Không có phím tắt trong phòng thi (grep `keydown` ở `exam/[id]/page.tsx`: chỉ `focusNextFill`; không có Ctrl/Alt+số, mũi tên). Phần tử tab đầu tiên là "Nộp bài"; 213 điểm dừng Tab. Ô số câu không có `aria-label` (trạng thái "đã trả lời/đánh dấu" chỉ bằng màu); đánh dấu chỉ là vạch cam 3px (`box-shadow inset 0 -3px`). Placeholder ô điền xám (117,117,117) trên (28,39,82): tương phản ≈3,1:1 (<4,5). Điểm tốt: Enter nhảy ô kế (đã thử), hộp xác nhận có `alertdialog`. | JS: `tabIndex` danh sách, `getComputedStyle(placeholder)`, nút `aria-label` null; ảnh phóng thanh nav cho thấy vạch cam mảnh. | Phi chức năng (truy cập) |
| UXW-6 | Trung bình | Tô sáng trong bài đọc | Muốn tô sáng phải: kéo chọn nhiều từ → bấm "Tô sáng" → chọn 1 trong 5 chấm màu 24px không nhãn: 3 bước. Bôi đen một từ (nhấp đúp) không hiện menu. Máy thi thật là chuột phải → Highlight, 1 màu. Menu hiện đè lên thanh công cụ cỡ chữ. | Nhấp đúp "spend": `getSelection()`="spend " nhưng `.studia-selection-menu` `offsetParent` null. Kéo 3 từ: menu "Tô sáng" (71x33), sau bấm hiện 5 nút "Tô màu Vàng/Xanh lá/…" 24px. Chưa kiểm tô sáng bên khung câu hỏi. | Chức năng |
| UXW-7 | Trung bình | Toàn phòng thi desktop | Trang vẫn cuộn được 56px (bằng chiều cao header), nên khi bấm chip "Passage 3" thì cả phòng thi xê dịch lên: thanh công cụ cột trái bị cắt, hở dải trống phía trên navigator. Trên mobile đã khoá (A2), desktop chưa. | `document.documentElement.scrollHeight` 856 > 800 (1280x800), 824 > 768 (1366, 1024). Sau chip Passage 3: `scrollY = 56`; ảnh thấy "Passage 1/2/3" cắt trên mép. | Phi chức năng (hiển thị) |
| UXW-8 | Trung bình | Phòng thi ở 1024–1366px; light mode | (a) Practice 1366x768: nút "Ghi chú" (24,656,81x36) phủ lên nút "Câu trước" (24,643,143x43); (b) 1024: thanh công cụ bài đọc rớt chữ: chip "Passage 1/2/3" 3 dòng, "Ẩn bài đọc" xếp dọc từng chữ, tiêu đề "PASSAGE / 1" rớt dòng; banner "Phòng luyện tập: bôi đen chữ…" che chip Passage bên phải và không tự đóng; (c) 1366: nút audio "Tạm Dừng Audio" thành 2 dòng và đè lên sóng âm, dòng "Phần nghe phát 1 lần" bị bẻ; (d) light mode: tiêu đề "IELTS READING — PASSAGE 1" chữ (14,22,48) trên nền (15,31,77), tương phản 1,13:1. Cột bài đọc: 501px = 39% (1280), 351px = 34% (1024): đã có T20 (không còn 187/107px nhưng chưa đạt ≥40%). | Số đo box ở trên; ảnh chụp 1024x768 và 1366x768. Light mode đặt bằng `data-theme="light"` (chưa kiểm bằng nút giao diện). | Phi chức năng (hiển thị) |
| UXW-9 | Trung bình | Sảnh `/exam` | Nút "Bắt đầu thi" nằm dưới màn hình: bảng cấu hình cao hơn viewport nên dù `sticky`, nút chỉ hiện khi cuộn tới đáy trang. Học viên chọn đề rồi không thấy nút chính, có "ô đồng ý quy định" giữa bảng. (Luyện tập không cần tick, thi thật cần.) Điểm tốt: tìm kiếm, bộ lọc, trạng thái rỗng ("Bạn chưa có đề riêng…", "Không có đề nào khớp “zzz”") đều có chữ rõ. "Đề mẫu Studia" thiếu thông tin L/R/W/S (chỉ 4 chữ cái). | Panel cao 1240px (1280x800), 1148px (1366x768); nút ở y=1259 và y=1195 (viewport 800/768). | Chức năng (luồng bắt đầu) |
| UXW-10 | Trung bình | Đồng hồ và audio, giống phòng thi thật | (a) Listening thi thật: đồng hồ 30:00 chạy ngay khi vào phòng, audio chờ bấm "Phát Audio Đề Thi": thời gian trừ khi chưa nghe (đo: 29:51 khi chưa bấm). Máy thật phát tự động; (b) có nút "Tạm Dừng Audio" trong khi ghi chú nói "Phần nghe phát 1 lần" (đã có T9 cho phần audio; phần pause chưa nằm trong T9); (c) đồng hồ chỉ đổi màu ở 10/5/1 phút, không có thông báo chữ (không `aria-live`, ảnh lúc 01:11 và 00:03 không có cảnh báo); (d) Practice vẫn mang nhãn "IELTS MOCK TEST" và vẫn có "Nộp bài" ngay trên đầu. Practice có nút pause nhưng không tua ±10 giây, không đọc transcript: chưa đáng giá hơn thi thật như lobby hứa ("Có từ điển, ghi chú, flashcard"). Đồng hồ không còn đứng khi phát (đo: currentTime 2,94 sau 3s): đã có T2. | `ExamTimer.tsx` (class theo ngưỡng); đo timer 30:00→29:51 khi nút còn "Phát Audio Đề Thi". | Chức năng + phi chức năng |

Trùng bảng việc: UXW-8 một phần = T20 (cột bài đọc), UXW-10(b) liên quan T9, UXW-1 và UXW-3 nằm ngoài T1 (T1 chỉ ẩn C17–C20; đây là dữ liệu C21/C16).

## Giải pháp khuyến nghị

**UXW-1 (M, dữ liệu).** Phương án: (a) thêm ảnh biểu đồ vào dữ liệu đề (`image_url`) và hiển thị trong khung Writing; (b) chỉ ẩn đề thiếu ảnh khỏi sảnh. Chọn (a), tạm làm (b) cho tới khi có ảnh. Cho SA: khung đề Task 1 hiển thị `<img>` rộng 100% cột, bấm để phóng to, ẩn chữ OCR; đề nào có `task1.type = chart` mà thiếu ảnh thì không hiện ở sảnh. Chữ lỗi khi thiếu: "Đề này chưa có biểu đồ, bạn chưa thể làm Task 1." Kiểm cả C16 W1.

**UXW-2 (M).** Chọn: thanh dưới nhóm theo Part: hiện Part hiện tại mở rộng 10 ô, các Part khác thu thành chip "Part 2 · 7/10" bấm để mở; không cuộn ngang. Phương án khác: ô nhỏ 28px hai hàng (loại: nhỏ vùng chạm ở laptop cảm ứng). Chữ: "Part 1 · 10/10", "Part 2 · 3/10".

**UXW-3 (M, dữ liệu).** Tách đoạn văn theo xuống dòng/nhãn A–G ngay khi dựng đề (`splitParagraphs` theo dòng trống), tách câu hướng dẫn ("You should spend about 20 minutes…") ra khung riêng, khử tên lặp; dựng mẫu note completion giữ nguyên bố cục mẫu ghi chú; sửa phân loại dạng câu theo đáp án (chữ cái đơn A–I và Matching, YES/NO/NOT GIVEN). Thêm test dữ liệu (như `test_builtin_exam_data.py`) cho độ dài đoạn tối đa (< 1200 ký tự) và nhãn dạng.

**UXW-4 (M).** Chọn: (1) tách "Đã đúng/Sai/Bỏ trống" (ba màu + chữ); (2) thêm khối "Theo dạng câu": ví dụ "Note Completion 1/12 · TFNG 4/6 · Matching 2/8" kèm nút "Luyện lại dạng này"; (3) "Overall" đổi thành "Điểm tạm tính (chỉ Reading)" khi thiếu phần; (4) giải thích có trích dẫn câu trong bài và nút "Xem trong bài" (cuộn và tô sáng đoạn); (5) Writing mở Task đã viết trước; (6) CTA chính "Làm lại các câu sai", phụ "Làm đề khác". Chữ gợi ý: "Bạn mất nhiều điểm nhất ở True/False/Not Given (4/6 sai). Luyện 10 câu dạng này trong 15 phút."

**UXW-5 (M).** Chọn: `aria-label` cho ô số: "Câu 5, đã trả lời, đánh dấu"; viền/huy hiệu cờ 8px cho câu đánh dấu; Tab đầu vào nội dung, đưa "Nộp bài" xuống cuối; phím tắt: Alt+→/← (câu kế/trước), Alt+F đánh dấu, Ctrl+Enter mở hộp nộp (liệt kê trong "?"); placeholder ≥4,5:1. Không bắt chước mọi phím của máy thi thật.

**UXW-6 (S).** Chọn: hiện menu nổi ngay khi bôi đen bất kỳ (kể cả 1 từ), 1 chạm "Tô sáng" dùng màu vàng mặc định; màu khác là phần phụ (bấm giữ/chấm nhỏ có nhãn). Chữ nhãn: "Tô sáng", "Xoá tô sáng". Đặt menu phía trên vùng chọn, không đè thanh công cụ.

**UXW-7 (S).** `.room-root` desktop: `height: 100dvh; overflow: hidden` như mobile; nội dung `calc(100dvh - 56px - 60px)`; không dùng `scrollIntoView` lên cửa sổ (dùng `block: "nearest"` trong khung).

**UXW-8 (S–M).** Gộp: tăng `min-width` cột trái/khung audio (≥360px), cho thanh công cụ bài đọc `flex-wrap` hợp lý và nút "Ẩn bài đọc" `white-space: nowrap`; "Ghi chú" đặt cạnh navigator, không phủ "Câu trước"; banner luyện tập tự đóng sau 6 giây và đổi chữ cho đúng ngữ cảnh (Reading/Listening). Light mode: dùng token chữ của khối tiêu đề phần (`--on-primary`) thay vì màu cố định. Cột bài đọc đặt tối thiểu 45% ở ≥1024 (T20).

**UXW-9 (S).** Chọn: CTA dính đáy panel (footer cố định trong `.st-card` với tổng giờ + nút), hoặc thu gọn panel (thu "Quy định phòng thi" thành 1 dòng "Xem quy định" có checkbox). Thêm thông tin cho "Đề mẫu Studia". Chữ: "Chọn đề để bắt đầu" khi chưa chọn.

**UXW-10 (S–M).** Chọn: Listening thi thật: nút "Bắt đầu nghe" trong màn chuyển phần, đồng hồ bắt đầu cùng lúc audio (hoặc audio tự phát khi vào phòng, vì đã có cú bấm "Bắt đầu"); ẩn "Tạm Dừng" ở chế độ thi thật; cảnh báo chữ ở 5 phút và 1 phút ("Còn 5 phút", `aria-live="polite"`); Practice: thêm ±10 giây, tốc độ, transcript sau khi nộp.

## Tiêu chí chấp nhận

1. **UXW-1**: Cambridge 21 Test 1 Writing Task 1 hiện biểu đồ (có `<img>` rộng ≥ 420px), không còn chuỗi "WRITING WRITING"/ký tự OCR; đề thiếu ảnh không hiện ở sảnh.
2. **UXW-2**: ở 1024, 1280 và 1366 `scrollWidth == clientWidth` của thanh số câu; thấy đủ 40 câu hoặc chip Part; chạm/nhấp bất kỳ câu nào ≤2 lần.
3. **UXW-3**: không đoạn nào > 1200 ký tự; hướng dẫn tách khỏi bài; mọi câu có đáp án chữ cái đơn không còn nhãn TFNG; note completion hiển thị theo mẫu ghi chú; test dữ liệu đạt.
4. **UXW-4**: kết quả có 3 trạng thái (đúng/sai/bỏ trống), thống kê theo dạng, "Overall" ghi rõ phần thiếu, giải thích có trích câu và "Xem trong bài" chạy; CTA "Làm lại các câu sai" mở đúng các câu sai.
5. **UXW-5**: mọi ô số có `aria-label` chứa trạng thái; điểm dừng Tab đầu là nội dung; đánh dấu thấy được khi đứng cách 60cm (≥8px/biểu tượng); placeholder tương phản ≥4,5:1; phím tắt có trong hộp "?".
6. **UXW-6**: bôi đen 1 từ trong bài đọc, 1 lần bấm là tô vàng; "Xoá tô sáng" khôi phục; menu không che thanh công cụ.
7. **UXW-7**: `document.documentElement.scrollHeight == innerHeight` ở 1280x800 và 1366x768; bấm chip Passage 3 thì `scrollY == 0`.
8. **UXW-8**: ở 1024x768 và 1366x768 không có hai nút chồng nhau; không có nhãn bị bẻ 1 chữ/dòng; tương phản tiêu đề phần ≥4,5:1 ở light mode; cột bài đọc ≥45%.
9. **UXW-9**: ở 1366x768 sau khi chọn đề, nút "Bắt đầu thi" thấy ngay không cần cuộn.
10. **UXW-10**: đo: Listening thi thật, đồng hồ không giảm trước khi audio bắt đầu; hiện chữ cảnh báo ở 5:00 và 1:00; chế độ thi thật không có nút Tạm Dừng.

## Giả thuyết cần kiểm chứng

- **UXW-1**: có thể do bản xem thử thiếu thư mục ảnh; kiểm trên bản chạy thật 3000 trước khi ưu tiên Nghiêm trọng.
- **UXW-2/UXW-8**: số đo ở khung giả lập; kiểm tại máy 1366x768 và 1024 thật có zoom hệ điều hành 125%.
- **UXW-4**: giải thích AI và chấm Writing cần backend; có thể nội dung tốt hơn mẫu chung ở bản chạy thật.
- **UXW-6**: chưa kiểm tô sáng trong khung câu hỏi và khi bài đọc cuộn; chưa đo sau khi tải lại trang (có giữ không).
- **UXW-10**: ý định "đồng hồ chạy khi chưa phát audio" là chủ ý theo lobby ("chạy ngay khi bạn bấm Bắt đầu"); cần quyết định sản phẩm trước khi sửa.
- **Chưa rà**: Speaking ghi âm, micro, giọng đọc giám khảo, quay lại sảnh từ kết quả khi có lịch sử, hiệu năng máy yếu.
