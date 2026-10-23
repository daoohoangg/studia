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

Trạng thái: `Todo` · `Doing` · `Review` (chờ nghiệm thu UX/SA) · `Done` · `Blocked`
Ưu tiên: `P0` chặn phát hành · `P1` quan trọng · `P2` nên có. Công sức: S ≤ nửa ngày · M 1–2 ngày · L > 3 ngày.

**Thứ tự đề xuất:** T1 + T8 + T11 làm song song được (khác file). T2 → T3 → T4 → T5 → T7 → T9 → T13 làm tuần tự, vì cùng sửa `frontend/src/app/exam/[id]/page.tsx`. T6 làm sau T5.

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
| 2026-10-23 | PM | Dọn bản xem thử (.preview-room), khôi phục launch.json. Chưa commit. File log SA để sót ở E:\tmp_sa_preview.log chờ người dùng xoá |
