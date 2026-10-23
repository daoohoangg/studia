# Bảng tiến độ Studia

> Do agent **PM** cập nhật. SA và UX ghi báo cáo chi tiết vào `docs/agents/reports/`, không sửa file này.

## Mục tiêu hiện tại
- **Đợt 1 – Thi thử trên điện thoại chạy ổn định**: học viên làm trọn một đề trên web mobile mà không mất bài, đồng hồ đúng, chấm đúng, bố cục đọc được ở khung 390px.
- Nguồn: [UX](reports/2026-10-23-ux-mobile-exam.md) · [SA](reports/2026-10-23-sa-mobile-exam.md). Hiện chỉ đánh giá qua đọc code, chưa chạy trên máy thật.

## Bảng việc
| ID | Việc | Owner | Ưu tiên | Công sức | Trạng thái | Phụ thuộc | Tiêu chí chấp nhận | Nguồn |
|---|---|---|---|---|---|---|---|---|
| T1 | Ẩn đề C17–C20 khỏi sảnh cho tới khi dựng lại dữ liệu thật (C18/19/20 trùng hệt C16, C17 dùng chung bài đọc/Writing/Speaking; audio C20 chỉ có Part 1) | SA | P0 | S (ẩn) / M (dựng lại) | Done (ẩn). Dựng lại dữ liệu C17–C20: việc riêng, chưa lên lịch | – | Sảnh chỉ hiện đề có nội dung riêng; có test kiểm tra trùng nội dung giữa các đề | SA-1. UX nghiệm thu ĐẠT; `backend/tests/test_builtin_exam_data.py` |
| T2 | Sửa đồng hồ đứng im khi phát audio: `onExpire` ổn định (useCallback/ref), đưa `audioProgress` xuống component con | SA | P0 | S | Done (chưa kiểm khoá màn hình iOS thật) | – | Phát audio 2 phút, đồng hồ giảm đúng 120 giây; phòng thi không render lại 4 lần/giây | UX-1, SA-7. UX đo thật: 25,3 s thực = 25 s đồng hồ; đã gồm phần T4 (tính theo hạn tuyệt đối) |
| T3 | Hết giờ mà tự nộp lỗi thì hiện lỗi rõ ràng + nút "Nộp lại", không kẹt ở "Đang chấm bài…" | SA | P0 | S | Review: mới nghiệm thu bằng đọc code, chưa tái hiện lỗi nộp thật (cần backend) | T2 | Tắt mạng lúc hết giờ: thấy thông báo lỗi và nút nộp lại; có mạng lại thì nộp thành công | UX-4. Nộp demo bình thường không hồi quy |
| T4 | Đồng hồ tính theo hạn tuyệt đối (thời điểm kết thúc), không theo số lần `setInterval`. Đã làm trong T2; còn lại: thử khoá màn hình trên iPhone thật | SA | P1 | S–M | Gần xong (chờ thử máy thật, gộp vào T14) | T2 | Khoá màn hình iOS 5 phút rồi mở: đồng hồ trừ đúng 5 phút | SA-4, UX-1 |
| T5 | Lưu câu trả lời vào localStorage, tự gửi lại khi có mạng và khi `pagehide`; sửa nội dung banner cho đúng sự thật | SA | P1 | S–M | Todo | T2 | Tắt mạng, trả lời 5 câu, tải lại trang: vẫn còn đủ 5 câu và được gửi khi có mạng | UX-5, SA-3 |
| T6 | Đề Cambridge dựng sẵn chạy qua phiên thi trên server (thay chế độ demo): có lịch sử, chấm Writing, không gửi đáp án xuống máy | SA | P1 | M | Todo | T1, T5 | Tải lại trang giữa bài vẫn còn bài và giờ; bài nộp có trong lịch sử; JSON gửi xuống không chứa đáp án | UX-2, SA-2 |
| T7 | Thiết kế bố cục phòng thi cho điện thoại (Reading/Listening dạng tab hoặc xếp dọc, header gọn, `100dvh`, nút chạm ≥ 44px, ô nhập 16px, ô Writing đủ cao) | UX → SA | P1 | M–L | Done (cùng T17). Còn: bàn phím ảo, thanh địa chỉ Safari, xoay ngang: chờ máy thật (T14) | T2–T5 (cùng file `page.tsx`) | Ở khung 390x844 đọc được bài và câu hỏi không cần kéo; iOS không tự phóng to khi chạm ô nhập; không tràn ngang | UX-3, UX-6, UX-9, UX-10, SA-5 |
| T8 | Server chặn lưu/nộp sau hạn; nộp bài idempotent (khoá chống nộp trùng, không gọi Gemini 2 lần) | SA | P1 | M | Todo | – | Test: nộp đồng thời 2 lần chỉ chấm 1 lần; lưu sau hạn bị từ chối | SA-4, SA-9 |
| T9 | Audio: trạng thái đang tải/lỗi, xử lý iOS chặn `play()`, nhớ vị trí phát; nút thử loa phát file thật | SA | P1 | S–M | Todo | T7 | Trên iOS, nếu không phát được thì thấy nút "Bấm để phát"; tải lại trang tiếp tục đúng đoạn | UX-8, SA-6 |
| T10 | Kiểm tra audio C16–C20 trên production; mã hoá lại Opus/AAC ~48 kbps, đặt lên R2/CDN | SA | P1 | M | Blocked: cần người dùng kiểm production | T1 | Không có audio 404; mỗi đề ≤ ~15 MB | SA-11 |
| T11 | Giới hạn lượt/tần suất gọi Gemini cho chấm Writing và `/explain` | SA | P2 | S | Todo | – | Vượt quota thì nhận thông báo rõ ràng, không gọi AI | SA-10 |
| T12 | Tối ưu autosave: chọn đúng cột, không đọc snapshot đề mỗi lần lưu; lịch sử không `select *` | SA | P2 | M | Todo | T8 (cùng `exam.py`) | Mỗi lần autosave ≤ 1 truy vấn đọc nhỏ; test hiện có vẫn đạt | SA-8 |
| T13 | Hỏi lại trước khi "Phần tiếp" (không quay lại được); làm rõ nút "Nộp bài" | UX → SA | P2 | S | Done (UX ĐẠT, kể cả hết giờ khi hộp đang mở). Còn: hộp chưa tự focus "Làm tiếp" khi bấm chuột thật (T20) | T7 | Bấm "Phần tiếp" hiện hộp xác nhận nêu rõ không quay lại được | UX-7 |
| T14 | Kiểm chứng trên máy thật: bàn phím ảo, cuộn, iOS Safari, Chrome Android | UX | P2 | S | Todo | T7 | Có biên bản thử trên ít nhất 1 iPhone + 1 Android | UX-11 + giả thuyết UX |
| T15 | App Expo: trước mắt thêm lối mở đề thi trên web; sau T5 + T7 thì dùng WebView | SA | P2 | S → M | Todo | T5, T7 | Từ app vào được phòng thi và quay lại app | UX-12, SA-12 |
| T16 | Bổ sung test: lưu sau hạn, nộp đồng thời, Gemini lỗi lúc tự nộp, quota, dữ liệu đề trùng/thiếu; thêm test runner frontend cho autosave/đồng hồ | SA | P1 | M | Todo | đi cùng T1–T8 | Mỗi việc T1–T8 có test tương ứng | SA |

| T17 | Phòng thi 390px vỡ bố cục (cột trái ép ~60px, nút "Phát Audio Đề Thi" gần như không thấy): làm gọn trước T7 nếu T7 chưa kịp | UX → SA | P0 | M | Done. UX nghiệm thu ĐẠT ở 390x844 và 360x740 (nút phát 239x48 / 209x48, đồng hồ đúng khi phát audio). Chưa thử máy thật | – | Ở 390x844 thấy và bấm được nút phát audio; chữ không rớt từng chữ | UX nghiệm thu P0 #1 (đã thấy bằng ảnh chụp) |
| T18 | "Đề mẫu Studia" mất kết nối server thì lặng lẽ chuyển sang demo: phải báo "bài sẽ không được lưu" và cho thử lại | SA | P1 | S | Todo | – | Tắt backend, vào Đề mẫu Studia: thấy thông báo rõ và nút thử lại, không tự chuyển demo âm thầm | UX nghiệm thu P0 #2 |
| T19 | Vặt: kiểm tra đề bị ẩn trước khi hiện "Đang tải phòng thi…" (đang trễ 3–4 s); thông báo lỗi nộp phân biệt mất mạng / hết phiên (401) / trùng (409) và bỏ câu "đừng tải lại trang"; tự thử nộp lại khi có mạng (sự kiện `online`) | SA | P2 | S | Todo | T3 | Đề ẩn báo ngay; 401/409 có thông báo riêng | UX nghiệm thu P0 #3–5 |

| T20 | Reading trên màn ≥768px bị ép cột bài đọc (187px ở 1280, 107px ở 800): flex-shrink cộng width %. Lỗi cũ có sẵn ở HEAD, không phải hồi quy. Sửa `min-width`/`flex-shrink` cho `.exam-reading-layout` | SA | P1 | S | Todo | – | Ở 1280 và 800 cột bài đọc ≥ 40% chiều rộng, thanh kéo vẫn chạy | UX nghiệm thu mobile #3 |
| T21 | Vặt CSS/UX sau T17: (a) trang Kết quả tràn ngang ở 360px: `.table-box` cần `position: relative` cho `span.st-sr`; (b) màn Chuyển phần tràn 4px ở 360 (lưới 4 ô); (c) hộp "Phần tiếp" tự focus "Làm tiếp", giữ Tab trong hộp; (d) nhãn "Câu 1", "Part 1", "Nộp Bài" xuống 2 dòng ở 360; nhảy tới khối ghép cao (Q27) tiêu đề nằm ngoài mép; (e) sửa luôn lỗi đã biết: màn chuyển phần/Speaking 360px | SA | P2 | S–M | Todo | T17 | scrollWidth = clientWidth ở 360 trên mọi màn thi và kết quả | UX nghiệm thu mobile #1, 2, 4, 5 |

### Đợt 2: rà luồng thi thử trên web desktop (nguồn: [UX web](reports/2026-10-23-ux-web-exam.md) · [SA web](reports/2026-10-23-sa-web-exam.md))
| ID | Việc | Owner | Ưu tiên | Công sức | Trạng thái | Phụ thuộc | Tiêu chí chấp nhận | Nguồn |
|---|---|---|---|---|---|---|---|---|
| T22 | Writing Task 1 của cả 4 đề C21 không có biểu đồ/sơ đồ/bảng (`writing_task1_image` rỗng, chỉ có chữ OCR rác): thí sinh không làm được. Cắt ảnh từ `Cambridge IELTS 21.pdf` và gắn vào dữ liệu, hoặc ẩn Task 1 của C21 cho tới khi có ảnh | SA | P0 | M | Done cho C21 (chưa commit). UX nghiệm thu ĐẠT về dữ liệu: 4 ảnh tải được, đúng đề, chữ đề sạch. Cách xem hình còn kém, xem T37. C16 cùng lỗi, xem T38 | – | Mở Writing C21 Test 1–4: thấy đúng hình của đề; chữ đề bài không còn rác OCR | UXW-1 |
| T23 | Làm tròn điểm Writing sai: 6,25 ra 6,0 và 5,25 ra 5,0 (đúng IELTS: 6,5 và 5,5). Dùng `round_ielts` cho từng tiêu chí và điểm trung bình (`exam_grading.py:172` và dòng gần đó) | SA | P0 | S | Done (chưa commit): `round_ielts` cho tiêu chí, trung bình, `combine_writing`; sửa thêm `_band` ở `writing_grader.py`. Pytest toàn bộ 285 đạt | – | Test biên: 6,25→6,5; 6,24→6,0; 6,75→7,0; mọi test chấm hiện có vẫn đạt | SAW-2 |
| T24 | RLS `exam_sessions` cho học viên (khoá anon + JWT) đọc `exam_snapshot` (có đáp án) và sửa `result_json`/`overall_band`. Migration thu hồi quyền ghi/đọc cột nhạy cảm; mọi truy cập qua backend. Kiểm tra cả các bảng cùng mẫu "Owner access FOR ALL" | SA | P0 | S–M | Code xong (chưa commit): `migration_v13.sql`, `setup_all.sql`, 7 test tĩnh; pytest 295 đạt. PM đã kiểm: không client nào ngoài backend đọc `exam_sessions` (frontend/mobile chỉ dùng Supabase để đăng nhập), backend chỉ dùng service role. CHỜ NGƯỜI DÙNG xác nhận lỗi và chạy migration trên Supabase (xem kịch bản trong báo cáo) | – | Request PostgREST bằng khoá anon của học viên: không đọc được `exam_snapshot`, UPDATE `overall_band` bị từ chối; app vẫn chạy | SAW-1 (PM xác nhận ở SQL, chưa thử trên Supabase thật) |
| T25 | Gemini: thêm timeout, chấm 2 task Writing song song, không treo `/submit`. Kết quả "heuristic" không lưu vĩnh viễn và không tính vào Overall khi bài vô nghĩa (cho chấm lại) | SA | P1 | S–M | Todo | T23 | Giả lập Gemini chậm 60 s: nộp trả về trong ≤ ~30 s kèm trạng thái "chấm sau"; có nút chấm lại | SAW-3, SAW-4 |
| T26 | Giới hạn kích thước và tần suất: `/answer` (độ dài danh sách), upload audio đọc theo luồng thay vì nạp 150 MB vào RAM, giảm giới hạn thân request ở Caddy, `exam_sets` gắn `require_feature("exam")` và giới hạn `content`. Gộp T11 | SA | P1 | S–M | Todo | – | Gửi payload quá lớn nhận 413/422; có test | SAW-5, SAW-9 (+T11) |
| T27 | Thanh 40 ô số câu tràn ngang trên desktop (scrollWidth 1951 / clientWidth 1270), Q27–40 bị ẩn. Nhóm theo Part hoặc tự cuộn tới câu hiện tại | UX → SA | P1 | M | Todo | – | Ở 1024 và 1280 thấy được ô của câu hiện tại và biết còn bao nhiêu câu | UXW-2 |
| T28 | Chất lượng dữ liệu đề: bài đọc là một khối 2948 ký tự, hướng dẫn dính vào bài, note completion Listening thành mảnh rời, nhãn dạng câu sai (Multiple Choice / True-False-Not Given gắn nhầm). Sửa bộ dựng đề + dữ liệu C16/C21 | SA | P1 | M | Todo | – | Mỗi dạng câu hiển thị đúng nhãn; bài đọc chia đoạn; có test dựng đề | UXW-3 |
| T29 | Màn kết quả: Overall chỉ tính phần đã làm và ghi rõ (hiện "Overall 1.0" chỉ Reading), câu bỏ trống ≠ "Sai", thống kê theo dạng câu, giải thích trích dẫn bài, nút "Làm lại câu sai" | UX → SA | P1 | M–L | Todo | T23, T25 | Học viên biết dạng câu yếu và bấm làm lại được câu sai | UXW-4 |
| T30 | Truy cập và bàn phím: phím tắt (câu trước/sau, đánh dấu), Tab không rơi vào "Nộp bài" đầu tiên, `aria-label` cho ô số câu, cờ đánh dấu rõ hơn vạch 3px, tương phản placeholder ≥ 4,5:1 | UX → SA | P2 | M | Todo | – | Làm được cả đề chỉ bằng bàn phím; kiểm tra tương phản đạt AA | UXW-5 |
| T31 | Tô sáng: 1 bước (chọn là hiện menu màu), nhấp đúp một từ hiện menu | UX → SA | P2 | S | Todo | – | Chọn chữ là thấy menu tô sáng ngay | UXW-6 |
| T32 | Bố cục desktop: hết cuộn thừa 56px, chip Passage không làm phòng thi xê lên, nút "Ghi chú" không đè "Câu trước" ở 1366/1024, thanh công cụ bài đọc không rớt chữ, banner luyện tập không che chip, tiêu đề phần light mode đạt tương phản, cột bài đọc ≥ 40%, nút "Bắt đầu thi" thấy ngay không cuộn. Gộp T20 | SA | P2 | S–M | Todo | – | Đo ở 1024x768, 1366x768, 1280x800: không chồng nút, scrollHeight = viewport, cột bài đọc ≥ 40% | UXW-7, 8, 9 (+T20) |
| T33 | Listening thi thật: chỉ trừ giờ khi bắt đầu phát audio, bỏ nút "Tạm dừng" (đề ghi phát 1 lần), cảnh báo ở 5 phút và 1 phút, URL audio ký sống đủ 30+ phút hoặc tự gia hạn | UX → SA | P2 | S–M | Todo | T9 | Đồng hồ đứng đến lúc bấm phát; audio 30 phút không hết hạn giữa chừng | UXW-10, SAW-8 |
| T34 | Giảm chi phí: cache giải thích dùng chung giữa học viên, autosave và lịch sử chọn cột hoặc dùng `jsonb_set`, không chụp snapshot cho đề hệ thống, xoá bản sao JSON thừa ở `backend/app/data/`. Gộp T12. Ước tính 100–250 USD/tháng chưa tối ưu → 10–30 USD (1.000 học viên × 4 đề, nếu đưa đề dựng sẵn lên server) | SA | P2 | M | Todo. Cần người dùng duyệt bảng cache + RPC | T6, T8 | Đo egress và token trước/sau trên cùng kịch bản | SAW-6, 7, 11 (+T12) |
| T35 | Chấm AI: chống chèn chỉ dẫn vào bài viết, gửi ảnh biểu đồ Task 1 cho Gemini, chấm Speaking (hiện không chấm) | SA | P2 | S–M | Todo | T22 | Bài chứa "bỏ qua hướng dẫn" không đổi được điểm | SAW-10 |
| T36 | Lỗi nhỏ: khoá theo phiên không dọn; nộp phiên `NOT_STARTED` vẫn lấy được đáp án; đề < 40 câu vẫn ra "band" | SA | P2 | S | Todo | – | Mỗi lỗi có test | SAW-12 |

| T37 | Xem hình Task 1: ở desktop ảnh bị gò 321px (nhãn trục chỉ còn 5–9px): nới cột đề ≥ 45% khi có hình, ảnh ≥ 480px; bấm để phóng to; trên mobile thêm nút "Xem lại hình" trong tab "Bài viết"; đặt hình sau câu đề; sửa nhãn "SUMMARISE THE GRAPH" cho đề sơ đồ/mặt bằng; alt text theo từng hình; khung đệm cho ảnh nền trắng ở dark mode. Phần nào cùng sửa `page.tsx` thì làm cùng T32 | UX → SA | P1 | M | Done (chưa commit): lightbox 4 mức + nút "Xem hình đề" mobile, cột đề 40% khi có hình, thứ tự chữ → yêu cầu → hình, nhãn/alt/dark. UX nghiệm thu ĐẠT 17/17 sau khi sửa lỗi lightbox che hộp "Nộp bài thi?". Còn: nút Back Android, chụm hai ngón, trình đọc màn hình, thiết bị thật | T22 | Đọc được nhãn trục và số trong bảng ở 1024 và 1280 không cần mở ảnh riêng; phóng to bằng click; mobile xem lại hình khi đang ở ô viết | UX nghiệm thu T22 #1–3. Ưu tiên theo mức ảnh hưởng đã đo: C16 Test 3 (mặt bằng sân bay, số cổng 1–18 và chú giải không đọc nổi ở 321px) nặng nhất; Test 2, 4 mất nhãn phụ; cột đề cuộn dư 106–230px nên "Write at least…" nằm dưới nếp gấp. Nên nâng lên P1 |
| T38 | Dữ liệu Writing C16 (đề đang công bố): cả 4 đề thiếu ảnh Task 1 và nội dung lệch PDF (Test 1 đang là bản đồ Norbiton trong khi PDF là biểu đồ đồ điện gia dụng; Test 4 chứa trang hướng dẫn chung thay vì đề; Test 2, 3 chưa đối chiếu). Cắt ảnh và sửa chữ từ `drive-download…/Cam16/16_academic.pdf` (PDF index 29, 52, 73, 95), hoặc ẩn C16 Writing cho tới khi xong | SA | P0 | M | Done (chưa commit): cả Task 1 lẫn Task 2 của 4 đề C16 đều sai đề, đã viết lại theo PDF Cam16 và gắn 4 ảnh; thêm test chống rác/thiếu hình. UX nghiệm thu ĐẠT. Pytest 288 đạt. Còn: ký tự `�` và cue card Speaking Part 2 bị cắt (Test 1, 4) ở C16, đối chiếu nguyên văn với sách chưa làm | – | Mở Writing C16 Test 1–4: đúng đề và đúng hình theo PDF; test chống trùng/thiếu hình cho mọi đề đang công bố | SA fix T22 (kiểm C16), SA fix T38 |
| T39 | `writing_task2` của C21 còn rác OCR (C16 đã sạch trong T38; test đang bỏ qua C21 qua `PENDING_CLEANUP`); kiểm tra tương tự và đối chiếu sách cho Speaking, Reading, Listening của C16/C21: ký tự `�`, cue card Speaking Part 2 bị cắt (C16 Test 1, 4). Gộp vào T28 nếu làm cùng lượt | SA | P1 | M | Todo | T28 | Chữ đề sạch ở mọi đề công bố; bỏ `PENDING_CLEANUP` mà test vẫn đạt | UX nghiệm thu T22, SA fix T22 |

| T40 | Cùng mẫu "Owner access FOR ALL" với T24 ở bảng khác (SA rà, chưa sửa): `exam_sets` (học viên sửa được `answer_key`, `content`, `status`) và `documents` (tự đặt `visibility='shared'` không qua duyệt) mức cao; `question_attempts`, `knowledge_states`, `review_schedules`, `learning_paths` mức trung bình (làm sai điểm, thống kê, streak). Bảng billing đạt. Chưa kiểm bảng v10–v12. Kiểm tra app có truy cập trực tiếp không rồi viết migration v14 | SA | P1 | M | Todo | T24 | Học viên không tự sửa được đáp án/trạng thái đề, không tự chia sẻ tài liệu; app vẫn chạy | SA fix T24 mục 3 |

Trạng thái: `Todo` · `Doing` · `Review` (chờ nghiệm thu UX/SA) · `Done` · `Blocked`
Ưu tiên: `P0` chặn phát hành · `P1` quan trọng · `P2` nên có. Công sức: S ≤ nửa ngày · M 1–2 ngày · L > 3 ngày.

**Thứ tự đề xuất:** T1 + T8 + T11 làm song song được (khác file). T2 → T3 → T4 → T5 → T7 → T9 → T13 làm tuần tự, vì cùng sửa `frontend/src/app/exam/[id]/page.tsx`. T6 làm sau T5.

**Thứ tự đề xuất cho đợt 2:** T23 (S) → T22 → T24 (chờ người dùng) làm trước; T25, T26 tiếp theo; T27, T28, T29 là cụm trải nghiệm chính. T23, T25, T26, T36 cùng sửa backend nên làm tuần tự; T27, T30–T33 cùng sửa `page.tsx` nên cũng tuần tự.

## Rủi ro và vướng mắc
| Rủi ro | Mức | Cách xử lý | Owner |
|---|---|---|---|
| Đề C17–C20 chấm sai, mất uy tín | Cao | Ẩn ngay (T1), dựng lại từ sách thật | SA |
| `page.tsx` phòng thi 2.100 dòng, CRLF, đang có thay đổi chưa commit | Trung bình | Commit thay đổi hiện tại trước; làm tuần tự từng việc; cân nhắc tách component khi làm T7 | PM/SA |
| Chi phí ước tính 65–190 USD/tháng cho 1.000 học viên × 4 đề (chủ yếu băng thông audio, Supabase Pro, Gemini), sau tối ưu khoảng 80–85 USD | Trung bình | T10, T11, T12 | SA |
| Mọi đánh giá mới dựa trên đọc code | Trung bình | T14 thử trên máy thật | UX |

## Việc người dùng cần tự làm
- [x] Xác nhận dữ liệu C17–C20: đang làm dở, ẩn đi (người dùng đã duyệt 2026-10-23).
- [ ] Thử T3 thật: chạy backend, vào "Đề mẫu Studia" chỉ Reading 1 phút, chặn `*/submit` (DevTools) hoặc bật Offline, kiểm tra hộp lỗi và nút "Nộp lại".
- [ ] Thử đồng hồ khi khoá màn hình trên iPhone thật.
- [ ] Thử bố cục phòng thi trên iPhone/Android thật: bàn phím ảo khi gõ đáp án/Writing, thanh địa chỉ Safari co giãn, xoay ngang, audio phát (T14).
- [ ] T24: làm theo kịch bản trong `docs/agents/reports/2026-10-23-sa-fix-t24.md`: (1) bằng khoá anon + token của một học viên TEST, xác nhận đọc được `exam_sessions.exam_snapshot` và PATCH được `overall_band`; (2) chạy `backend/sql/migration_v13.sql` trong Supabase SQL Editor sau v12; (3) chạy lại và thấy bị từ chối; (4) nộp một bài và xem lịch sử trên app. Đừng chạy lại migration_v4/setup_all cũ sau v13 vì sẽ mở lại lỗ hổng.
- [ ] Kiểm tra khoá Gemini còn hoạt động (trước đây bị đình chỉ), để đánh giá chất lượng chấm AI.
- [ ] Commit dữ liệu C16 (đang untracked) cùng `test_builtin_exam_data.py` và `exam/page.tsx`.
- [ ] Xoá tay file `E:\tmp_sa_preview.log` (SA để sót, hệ thống chặn PM xoá).
- [ ] Commit phần P0 + bố cục mobile (xem danh sách file ở nhật ký SA): bạn chọn file vì lẫn với thay đổi chưa commit của bạn.
- [ ] Kiểm tra audio C16–C20 có phát được trên production không (T10).
- [ ] Commit các thay đổi đang dở ở phần exam trước khi SA bắt đầu sửa.
- [ ] Quyết định có nâng Supabase lên gói Pro không (SA đánh giá là bắt buộc ở quy mô này).

## Nhật ký
| Ngày | Ai | Nội dung |
|---|---|---|
| 2026-10-23 | PM | Khởi tạo kiến trúc đa agent (PM, SA, UX) |
| 2026-10-23 | UX | Rà luồng thi thử trên web mobile qua code: 12 painpoint (4 nghiêm trọng) |
| 2026-10-23 | SA | Rà kỹ thuật/chi phí: 12 phát hiện; test exam backend 43/43 đạt |
| 2026-10-23 | PM | Xác nhận lại UX-1 và SA-1; gộp thành 16 việc T1–T16 |
| 2026-10-23 | SA | Sửa T1–T3 (chưa commit): typecheck sạch, backend 281/281 đạt, thêm 4 test chống trùng đề |
| 2026-10-23 | UX | Nghiệm thu P0 trên bản xem thử riêng: T1 ĐẠT, T2 ĐẠT (đo thật), T3 chỉ đọc code. Phát hiện thêm T17–T19 |
| 2026-10-23 | PM | Dọn bản xem thử (.preview-p0), khôi phục launch.json. Chưa commit |
| 2026-10-23 | UX | Thiết kế bố cục phòng thi mobile (25 tiêu chí chấp nhận, 10 bước) |
| 2026-10-23 | SA | Làm đủ 10 bước (page.tsx, room.css, useMediaQuery.ts, ConfirmNextSection.tsx); typecheck sạch. Sửa chữ "Cầu" → "Câu" |
| 2026-10-23 | UX | Nghiệm thu độc lập T17/T7/T13: CHẤP NHẬN, không phát hiện chặn phát hành; desktop và P0 không hồi quy. Phát hiện thêm T20, T21 |
| 2026-10-23 | PM | Commit `9287543` (agent, docs, ExamTimer) và `e6261fe` (bố cục mobile, ẩn C17–C20, lỗi nộp bài) |
| 2026-10-23 | UX | Rà web desktop (1280x800, 1366x768, 1024x768): 10 painpoint UXW-1…10 |
| 2026-10-23 | SA | Rà web server/chi phí: 12 phát hiện SAW-1…12; test exam 75/75 đạt |
| 2026-10-23 | PM | Xác nhận UXW-1 (C21 thiếu ảnh Task 1 ở cả 4 đề), SAW-2 (làm tròn Writing sai), SAW-1 (RLS, mới ở SQL). Lập T22–T36. Dọn `.preview-web`, khôi phục launch.json |
| 2026-10-23 | SA | Làm T23 (làm tròn IELTS) và T22 (4 ảnh Task 1 của C21 từ PDF), chưa commit. Pytest 285 đạt, typecheck sạch. Kiểm C16: thiếu ảnh và lệch nội dung |
| 2026-10-23 | UX | Nghiệm thu T22: ĐẠT về dữ liệu, không chặn phát hành. Phát hiện cách xem hình kém (T37) |
| 2026-10-23 | PM | Thêm T37–T39. Dọn `.preview-t22`, khôi phục launch.json. Chưa commit |
| 2026-10-23 | SA | Làm T38: viết lại Task 1 và Task 2 của 4 đề C16 từ PDF Cam16, 4 ảnh Task 1, thêm test; pytest 288 đạt. Chưa commit |
| 2026-10-23 | UX | Nghiệm thu T38: ĐẠT, không chặn phát hành. Nhấn mạnh T37 cho C16 Test 3 |
| 2026-10-23 | PM | Nâng T39 lên P1 (C21 Task 2 và các phần khác của C16 còn rác). Dọn `.preview-t38`, khôi phục launch.json. Chưa commit |
| 2026-10-23 | UX | Thiết kế cách xem hình Task 1 (lightbox, nút "Xem hình đề", cột đề 40%) |
| 2026-10-23 | SA | Làm T37 (7 bước; hai file mới Task1Figure.tsx, ImageLightbox.tsx); typecheck sạch |
| 2026-10-23 | UX | Nghiệm thu T37: 16/17, lỗi G2 (lightbox che hộp "Nộp bài thi?") |
| 2026-10-23 | SA | Sửa G2: lightbox tự đóng khi hộp nộp bài, "Phần tiếp", lỗi nộp mở hoặc đổi sang Task 2 |
| 2026-10-23 | UX | Kiểm lại G2: ĐẠT, chấp nhận T37 ở cả 1280x800 và 390x844. Phát hiện phụ: khi lightbox mở, thanh dưới (Task 1/2, "Phần tiếp") bị lớp phủ che nên chuột không bấm tới |
| 2026-10-23 | PM | Commit `8837f00` (T22/T23/T37) và `8f4c7ec` (dữ liệu C16 + test toàn vẹn) |
| 2026-10-23 | SA | Làm T24: `migration_v13.sql`, cập nhật `setup_all.sql`, 7 test tĩnh; pytest 295 đạt. Rà RLS bảng khác → T40. Chưa commit, chưa chạy migration |
| 2026-10-23 | PM | Kiểm T24: không client nào ngoài backend dùng `exam_sessions`; backend chỉ dùng service role. Thêm T40 |
| 2026-10-23 | PM | Dọn `.preview-t37`, khôi phục launch.json. Chưa commit |
| 2026-10-23 | PM | Dọn bản xem thử (.preview-room), khôi phục launch.json. Chưa commit. File log SA để sót ở E:\tmp_sa_preview.log chờ người dùng xoá |
