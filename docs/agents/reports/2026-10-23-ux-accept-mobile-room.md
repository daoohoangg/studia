# UX nghiệm thu bố cục phòng thi trên điện thoại (T17 + T7 + T13) (2026-10-23)

Môi trường: bản xem thử cô lập http://localhost:3015 (`frontend/.preview-room`, không backend), trình duyệt tích hợp, khung 390x844, 360x740, 1280x1000 (và 800x600 để thử R4), giao diện tối. Không sửa code. Số liệu do UX đo lại bằng `getBoundingClientRect`, `scrollWidth`, `getComputedStyle`; không dùng số của SA. Ảnh chụp nằm ở thư mục kết quả công cụ của phiên, không lưu trong repo. Lưu ý công cụ: ảnh chụp ngay sau thao tác JS đôi khi là khung cũ nên đã chụp lại lần hai.

## Kết luận

**CHẤP NHẬN T17 (Listening trên điện thoại), T7 (Reading/Writing/bố cục chung) và T13 (hộp "Phần tiếp")** để phát hành, kèm 3 việc nên vá nhanh (không chặn): nút "Làm tiếp" không được focus khi mở bằng chuột/bàn phím (đo lại được), trang Kết quả tràn ngang 100–113px ở 360 do `span.st-sr` ngoài khung cuộn, và màn Chuyển phần tràn 4px ở 360. Chưa kiểm được bàn phím ảo, thanh địa chỉ Safari, khoá màn hình trên máy thật (xem cuối). Không có phát hiện nào chặn phát hành.

## Bảng 25 tiêu chí

| # | Tiêu chí | Kết quả | Số đo / chữ thực tế |
|---|---|---|---|
| A1 | Không cuộn ngang | ĐẠT một phần | 390 và 360: `scrollWidth == innerWidth` ở Listening, Reading, Writing, Speaking, hộp "Phần tiếp", hộp "Nộp bài thi?" (360: 360). Ngoại lệ ngoài phòng thi: màn Chuyển phần 364 so với 360, trang Kết quả 460–473 so với 360 (xem phát hiện N1, N2). |
| A2 | Body không cuộn | ĐẠT | Ở 390: `scrollTo(0,500)` rồi `scrollY = 0`, `documentElement.scrollTop = 0`, `body.scrollTop = 0`; `.room-root` 390x844, `overflow: hidden`. Vuốt bằng ngón tay: CHƯA KIỂM ĐƯỢC (máy thật). |
| A3 | Header ≤52, một dòng, đủ 4 phần | ĐẠT | 390 và 360: header cao 52, ba khối con cùng một hàng (`top` 15/11/4, `bottom` 37/41/48). Chữ: "Listening · 1/4 / Thi thật", "29:52", "Nộp bài". Dòng đầu nội dung không bị che (cột câu hỏi bắt đầu y=137). |
| A4 | Dùng `dvh` | ĐẠT (mã) / CHƯA KIỂM ĐƯỢC (Safari) | `room.css`: root `height: 100vh; height: 100dvh`, hộp thoại `100vh` rồi `100dvh`, sổ ghi chú `50vh` rồi `50dvh`. Còn lại `100vh` chỉ ở luật desktop (dòng 24-25). Đáy khung khớp mép nav ở 390: cột câu hỏi 137→788, nav bắt đầu y=788. Thanh địa chỉ Safari co/giãn: máy thật. |
| A5 | Vùng chạm ≥44x44, cách ≥6px | ĐẠT | 390 Listening: 152 phần tử tương tác nhìn thấy, 0 phần tử nhỏ hơn 44 (cả hai chiều); khoảng cách nhỏ nhất giữa hai nút nav 6px. 360 Listening, Reading, Writing: 0 phần tử nhỏ. Nút nav Task 1/Task 2/Phần tiếp: 72/72/101 x 44. Hộp "Phần tiếp": nút 281x51 (360) và 310x51 (390). Nút Speaking "Part 1/2/3" và "Nộp Bài" ở 360: quét A5 chỉ chạy trên Listening/Reading/Writing; ảnh cho thấy chữ hai dòng (N4). |
| A6 | Ô nhập ≥16px | ĐẠT (đo) / CHƯA KIỂM ĐƯỢC (iOS) | 390 Listening: 20 ô, nhỏ nhất 16px, ô điền cao 44. Textarea Writing 17px. Việc iOS không phóng to: máy thật. |
| A7 | Không `alert`; desktop không đổi | ĐẠT một phần | Không thấy `alert` khi thao tác. Desktop 1280x1000: hai cột, header 56 một hàng, không có thanh tab và không có `exam-header-now` (`display: none`). Không có ảnh nền trước khi sửa để so từng pixel; so với `HEAD` thì các giá trị `width`/`height` giữ nguyên (xem phát hiện N3). |
| L1 | Nút phát thấy ngay, ≥48 cao, ≥160 rộng, một dòng | ĐẠT | 390: nút 239x48 tại (12,80), `font-size 16px`, chữ "Phát Audio Đề Thi" một dòng. 360: 209x48 tại (12,80). Đều nằm trong màn hình khi chưa cuộn. Dòng phụ "Phần nghe phát 1 lần" bên phải, không bị cắt. |
| L2 | Không còn hai cột | ĐẠT | `.exam-audio-pane` 390 và 360 rộng bằng viewport (0,52,390,85); `.exam-splitter-handle` `display: none`. |
| L3 | Audio + đồng hồ, thanh audio dính | ĐẠT | Bấm phát bằng chuột thật: nút đổi thành "Tạm Dừng Audio", `paused=false`. Đo 15,009 giây thực: đồng hồ 29:37 → 29:22 (giảm 15 giây), `audio.currentTime` 5,44 → 20,45 (15,01 giây). Trong lúc đó cuộn danh sách câu 800px: nút audio vẫn ở y=80, cao 48. Không hồi quy T2. |
| L4 | Vùng câu hỏi ≥400 (390) / ≥380 (360) | ĐẠT | 651px ở 390x844; 547px ở 360x740 (viewport đầy đủ; Safari có thanh công cụ: máy thật). |
| R1 | Hai tab, bài đọc ≥340 (≥328 ở 360) | ĐẠT | 360: tab "Bài đọc" và "Câu hỏi · 0/40" (`aria-label` "Câu hỏi, đã trả lời 0 trên 40"), mỗi tab 178x48; khung bài đọc 360 rộng, chữ rộng 328px (padding 16). 390: khung 390, tab 48px. |
| R2 | Giữ `scrollTop` | ĐẠT | Cuộn bài đọc 600, sang "Câu hỏi", cuộn 400, về "Bài đọc": 600 và 400 còn nguyên; khung ẩn có `visibility: hidden`. Trên Safari/Chrome di động: máy thật. |
| R3 | Chạm số câu sang tab Câu hỏi; chip Passage không nhảy tab | ĐẠT (kèm lưu ý) | Từ tab "Bài đọc" chạm số 5: tab "Câu hỏi" được chọn, câu 5 ở y=263–521 trong khung 100–684. Chạm số 27: sang "Câu hỏi" nhưng khối ghép đề cao 824px lớn hơn khung nên tiêu đề câu 27 nằm trên mép (top −20), người dùng thấy giữa danh sách lựa chọn (N5). Chip "Passage 2" trong tab "Bài đọc": ở lại tab "Bài đọc", `scrollTop = 0`, tiêu đề "PASSAGE 2". |
| R4 | Xoay ngang / ≥768 hiện hai khung | ĐẠT một phần | 800x600: không còn thanh tab (0 phần tử nhìn thấy), hai khung cạnh nhau, khung ẩn thành `visible`. Nhưng bài đọc chỉ rộng 107px (xem N3). Xoay thật 844x390: CHƯA KIỂM ĐƯỢC. |
| W1 | Ô viết ≥60% chiều cao | ĐẠT | 360x740: textarea 336x502 = 68% màn; `font-size 17px`. SA đo 72% ở 390x844 (không đo lại ở 390). |
| W2 | Đổi tab không mất chữ | ĐẠT | Đặt 80 từ + chuỗi dài 200 ký tự, sang "Đề bài", về "Bài viết": `value` bằng đúng chuỗi đã đặt; đếm "81 từ (cần thêm 69)". `textarea.scrollWidth == clientWidth` (334) nên chuỗi dài không đẩy ngang; `scrollWidth` trang 360. |
| W3 | Thanh dưới Task 1/Task 2/Phần tiếp, không cuộn ngang ở 360 | ĐẠT | 360: ba nút (8,693,72,44), (88,693,72,44), (239,693,101,44); `nav.scrollWidth == clientWidth == 360`. Phần cuối (Writing là phần cuối ở bản 2 phần): nút "Phần tiếp" đổi thành "Nộp Bài" (xem N2/N4 chuỗi). |
| K1 | Bàn phím ảo iOS/Android | CHƯA KIỂM ĐƯỢC | Cần máy thật. Phần logic đã kiểm: khi ô có focus, thanh nav `display: none`, Enter nhảy sang ô kế (`document.activeElement` là ô `.exam-inline-fill-input` khác), giá trị "beach" giữ lại. |
| K2 | Nav hiện lại khi mất focus | ĐẠT | `blur()` rồi `.exam-navigator` `display: flex` trở lại. |
| N1 | Hộp "Phần tiếp": chữ, số câu, focus, Esc/nền | ĐẠT một phần | Chữ đúng thiết kế: "Kết thúc phần Listening?" / "Bạn còn 40 câu chưa làm. Sau khi chuyển sẽ không quay lại phần này được." (Reading y hệt); Writing: "Bạn mới viết 1/2 bài. Task 2 mới có 0 từ, yêu cầu tối thiểu 250. Sau khi chuyển sẽ không quay lại phần này được."; `role=alertdialog`, `aria-modal=true`, `aria-labelledby/describedby`. Esc và chạm nền mờ đều đóng, vẫn ở Listening; Esc trả focus về "Phần tiếp". KHÔNG ĐẠT ở một điểm: "Làm tiếp được focus mặc định". Bấm bằng chuột thật (390 và 360): `activeElement` vẫn là "Phần tiếp", Tab đi vào nút "Đánh dấu" phía sau hộp (focus không bị giữ trong hộp). Mở bằng `element.click()` thì focus đúng ở "Làm tiếp" (cả 390 và 1280). Xem N6. Speaking/hộp Speaking: không mở được thật trong ca này (Speaking là phần cuối nên nút là "Nộp Bài"). |
| N2 | Không có thao tác một chạm chuyển phần/nộp | ĐẠT | Listening, Reading, Writing (không phải cuối): "Phần tiếp" chỉ mở hộp; "Kết thúc phần" mới sang màn Chuyển phần ("PHẦN 2 / 4 Reading", "✓ Đã nộp"). Phần cuối: nút "Nộp Bài" mở hộp "Nộp bài thi?" ("Bạn có chắc muốn nộp bài thi không? Hành động này không thể hoàn tác.", ô "0/40 Listening", "0/40 Reading", "1/2 Writing Tasks"; "Tiếp tục làm bài" trên, "Nộp Bài Thi" dưới, 281x52 và 281x51 ở 360). |
| N3 | Hết giờ khi hộp đang mở | ĐẠT | `mins=reading:2,writing:2`, mở hộp ở 01:52, giữ hộp mở tới hết giờ: vào màn "IELTS MOCK TEST · CHUYỂN PHẦN" ("PHẦN 2 / 2 Writing"), hộp biến mất; bấm "Bắt đầu Writing": hộp KHÔNG hiện lại, header "Writing · 2/2", nav "Task 1 / Task 2 / Nộp Bài". |
| N4 | Đồng hồ chạy khi hộp mở | ĐẠT | Hộp mở lúc 01:52, sau 5 giây 01:47 (đúng 5 giây), tiếp tục giảm tới 00:25 và hết giờ. |
| G1 | Không hồi quy T1-T3 | ĐẠT một phần | T1: xem mục hồi quy P0 bên dưới. T2: đo lại ở L3 (đạt). T3 (lỗi nộp thật): vẫn CHƯA KIỂM ĐƯỢC vì không có backend; nộp demo bình thường ở 360: hộp "Nộp bài thi?" rồi Kết quả "Cambridge IELTS 16 - Test 1 · Mô phỏng thi thật". |

Tổng: ĐẠT 18 mục (A2, A3, A5, L1–L4, R1–R3, W1–W3, K2, N2–N4, và G1 một phần), ĐẠT một phần 5 (A1, A7, R4, N1, G1), CHƯA KIỂM ĐƯỢC 2 (K1, và phần máy thật của A4/A6).

## Hồi quy

Hồi quy P0 (đã chạy lại):
- Sảnh `/exam` (1280): "Thư viện đề 9 đề · 3 bộ"; có Cambridge IELTS 16 và 21; không có chữ "Cambridge IELTS 17/18/19/20". ĐẠT.
- `/exam/demo?type=cambridge18_test1`: sau vài giây hiện "Đề này đang được biên soạn lại nên tạm thời chưa mở. Hãy chọn một đề khác t…" (câu đầy đủ như báo cáo P0). ĐẠT.
- Màn Kết quả không vỡ: ĐẠT ở bố cục chính (vòng 1.0 OVERALL, nút "Chụp ảnh kết quả / Xem phân tích lỗi / Làm đề khác" xếp dọc, bảng "Xem lại từng câu" nằm trong khung cuộn ngang), nhưng trang tràn ngang (N2).

Hồi quy desktop 1280x1000:
- Listening: hai cột (audio 306, câu hỏi 956), thanh chia cột 8px hiển thị; kéo chuột từ x=306 sang ~320 đổi được chiều rộng (audio 306 → 320, câu hỏi 956 → 942), nút phát thấy (134x64, chữ xuống hai dòng "Phát Audio / Đề Thi"), header một hàng 56px có đủ 4 viên phần thi + đồng hồ, không có thanh tab/`exam-header-now`, hộp "Phần tiếp" 470 rộng và "Làm tiếp" được focus (mở bằng `click()`), "Kết thúc phần" sang màn chuyển phần. ĐẠT.
- Trang vẫn cuộn dọc được 56px (`scrollHeight 1056` trên 1000; luật cũ 54 so với 56, ghi ở thiết kế), không tính hồi quy.

## Phát hiện mới (tối đa 6)

| # | Mức | Mô tả | Bằng chứng | Chặn phát hành? |
|---|---|---|---|---|
| N1 | Trung bình | Màn Chuyển phần tràn ngang ở 360: `scrollWidth 364`; hàng 4 ô "Listening / Reading / Writing / Speaking" bị cắt đầu, chữ trạng thái trên các ô cắt ("Tiếp theo", "✓ Đã nộp"). Đây là việc đã ghi "ngoài phạm vi" ở thiết kế mục 9. | `header.exam-header` và một div có `right = 364` ở 360x740. | Không (gần như chạm nhẹ), nên làm tiếp T7b. |
| N2 | Trung bình | Trang Kết quả tràn ngang ở 360 (trang rộng 460–473 thay vì 360, trang bị thu nhỏ khi mở trên điện thoại). Nguyên nhân đo được: `span.st-sr` (position: absolute, cho trình đọc màn hình) nằm trong `.table-box` mà `.table-box` là `position: static`, nên phần tử tuyệt đối lọt ra ngoài khung `overflow: auto` (right = 473). Bảng 516px đã nằm đúng trong khung cuộn. Gợi ý: `position: relative` cho `.table-box` (hoặc cho `.st-sr` bao ngoài). | `document.documentElement.scrollWidth 473` so với `clientWidth 360`; chỉ phần tử không bị cắt vượt biên là `st-sr`. | Không, nhưng là lỗi dễ thấy ở màn quan trọng nhất sau bài thi. |
| N3 | Cao (cũ, không phải hồi quy; đã có ở `HEAD`) | Reading trên màn ≥768 bị ép: khung bài đọc chỉ rộng 187px ở 1280 (kỳ vọng 48%) và 107px ở 800; ở Listening khung audio còn 306px (kỳ vọng 38% = 486). Nguyên nhân: `width` theo % kèm `flex-shrink: 1`, khung câu hỏi `width: auto` theo nội dung; mã ở `HEAD` có cùng cấu trúc nên là lỗi sẵn, SA cũng ghi nhận với Listening. Hệ quả: học viên dùng máy tính bảng/laptop màn hẹp đọc bài trong cột 107-187px. Gợi ý: `flex: 0 0 var(--split)` (hoặc `flex-shrink: 0`) ở ≥768 và `min-width: 0` cho khung câu hỏi. | Đo ở 1280: `.exam-passage-pane` 187x886, `flex 0 1 auto`, `--split: 48%`, khung câu hỏi 1075. | Không chặn T17/T7/T13 (mobile), nhưng nên xếp P1 vì Reading desktop thực sự khó dùng. |
| N4 | Thấp | Chữ xuống hai dòng ở một vài nút 360px: "Câu 1" thành "Câu / 1" trong thẻ ô điền (Listening), "Part 1" thành "Part / 1" và "Nộp Bài" thành "Nộp / Bài" ở thanh dưới Speaking (nút cao 46, chiều ngang 89). Không tràn, nhưng nhìn lộn xộn. Gợi ý: `white-space: nowrap` cho nhãn "Câu N" và nút nav. | Ảnh 360 Listening và Speaking. | Không. |
| N5 | Thấp | Khi nhảy tới một câu nằm trong khối ghép cao hơn khung (Reading Q27 ở Passage 3, khối cao 824px), tiêu đề câu bị cuộn khỏi khung (top −20) nên người dùng thấy giữa danh sách lựa chọn A–I. Cũng: khi mở tab "Câu hỏi" lần đầu khung cuộn sẵn 160px nên dòng hướng dẫn "Questions 1 - 13" bị tiêu đề dính che một phần. Gợi ý: cuộn theo đỉnh thẻ (trừ chiều cao hàng chip) thay vì giữa khi thẻ cao hơn khung. | `reading-q-27`: `top −20`, `bottom 804`, khung 100–684; `scrollTop 160` lúc mở. | Không. |
| N6 | Thấp (trung bình về truy cập) | Hộp "Phần tiếp" không giữ focus: bấm chuột thật không đưa focus vào "Làm tiếp", và Tab đi ra phía sau hộp (nút "Đánh dấu" của nav). Người dùng bàn phím/trình đọc màn hình có thể bấm Enter vào "Phần tiếp" thêm lần nữa (hộp vẫn mở nên vô hại) hoặc thao tác phía sau hộp. Không ảnh hưởng người dùng chạm. Gợi ý: tự gọi `focus()` trong `useEffect` khi mở hộp (React `autoFocus` không đáng tin khi mở sau click) và bẫy Tab bên trong hộp. | `document.activeElement` = "Phần tiếp" sau click thật (390 và 360), sau Tab là "Đánh dấu câu 1"; `[role=alertdialog]` vẫn mở. | Không. |

Nhận xét thêm (không đánh số): chữ bài đọc mặc định 15px ở 360 (thiết kế đề xuất 16 khi hẹp, SA chưa làm); Task 1 "Summarise the graph" của đề C16 T1 hiển thị toàn bộ nhãn bản đồ dưới dạng dòng chữ rời, không có ảnh (có vẻ lỗi dữ liệu đề, ngoài phạm vi); nav lúc mới vào Reading đã cuộn 76px nên nút "Phần tiếp" bị cắt một phần ở mép trái (có lợi cho T13, hơi lạ về thị giác).

## Kết luận chấp nhận

- T17 (Listening mobile): CHẤP NHẬN. Nút phát audio thấy ngay (239x48 ở 390, 209x48 ở 360), bấm phát được, đồng hồ giảm đúng khi phát (15 giây thực = 15 giây), một cột, ô nhập 16px, không tràn ngang.
- T7 (khung trang, header, Reading/Writing hai tab): CHẤP NHẬN. Header 52px một hàng; Reading giữ `scrollTop` và chạm số câu tự sang tab Câu hỏi; Writing 68% màn ở 360x740, không mất chữ khi đổi tab, không tràn ngang.
- T13 (hộp "Phần tiếp"): CHẤP NHẬN có điều kiện nhỏ: chữ, Esc, chạm nền, hết giờ khi hộp mở, đồng hồ chạy đều đều đúng; riêng "Làm tiếp được focus mặc định" chưa đạt khi mở bằng chuột thật (N6), nên vá nhưng không chặn.
- Điều kiện trước khi gắn nhãn "xong T14": N2 (một dòng CSS) nên làm cùng đợt; N1, N3 xếp việc kế tiếp.

## CHƯA KIỂM ĐƯỢC (cần máy thật, T14)

- Bàn phím ảo iOS Safari và Android Chrome: ô điền còn thấy phía trên bàn phím, thanh nav và nút Ghi chú ẩn, nút "Next/Tiếp" nhảy ô kế, header (có đồng hồ) trượt khỏi màn khi gõ Writing (giả thuyết mục 11).
- Thanh địa chỉ Safari co/giãn (`dvh`), chiều cao ô viết khi viewport thấp (664), `visualViewport`, `interactive-widget`, `viewport-fit=cover`.
- iOS không phóng to khi chạm ô nhập (`visualViewport.scale` vẫn 1); iOS chặn `play()` (UX-8, T9).
- Khoá màn hình 15 giây khi audio đang phát (đồng hồ nhảy đúng); `visibilitychange` thật.
- Vuốt thật để thử A2 (body không cuộn) và `:has()` trên máy cũ (iOS < 15.4).
- Xoay ngang 844x390 thật; chế độ Luyện tập (nút Ghi chú, gợi ý) và chế độ sáng; hộp "Phần tiếp" ở Speaking (cần đề có Speaking không phải phần cuối); T3 lỗi nộp thật (cần backend).
