# Rà nhanh UX: thi thử IELTS trên điện thoại (web mobile 390x844)

Người rà: agent UX Senior · Ngày: 2026-10-23 · Phương pháp: đọc code, **không chạy server, không mở trình duyệt**. Mọi kết luận về hiển thị là suy ra từ CSS/JSX. Phần "Giả thuyết cần kiểm chứng" ghi những điểm phải xem lại trên máy thật (iPhone Safari, Android Chrome).

Hành trình đã đi: sảnh `/exam` → chọn đề → `/exam/demo?...` (đề Cambridge dựng sẵn) hoặc `/exam/<session_id>` (đề trên máy chủ) → màn chuyển phần → Listening / Reading / Writing / Speaking → mất mạng, tải lại trang → hết giờ → nộp → kết quả.

## Kết luận (1–3 câu)

Phòng thi được dựng cho màn desktop. Trên điện thoại, Reading và Listening chia đôi màn hình cố định nên không đọc được, đồng hồ có thể đứng im khi đang phát audio, và 24 đề Cambridge có sẵn (nhóm đề chính) không lưu gì: tải lại trang là mất cả bài. Cần xử lý trước 4 điểm Nghiêm trọng (UX-1 đến UX-4) rồi mới nói "làm đề được trên điện thoại"; app Expo hiện chưa có thi thử.

## Painpoint

| # | Mức độ | Luồng / màn hình | Mô tả | Bằng chứng | Loại |
|---|---|---|---|---|---|
| UX-1 | Nghiêm trọng | Phòng thi, mọi phần (rõ nhất Listening) | Đồng hồ khởi tạo lại `setInterval` mỗi lần phòng thi render lại, vì `onExpire` là hàm viết trực tiếp (inline) và nằm trong deps của effect. Khi audio phát, `onTimeUpdate` gọi `setAudioProgress` khoảng 4 lần/giây, nên khoảng 1000 ms không bao giờ kịp chạy hết và **đồng hồ đứng yên trong suốt lúc nghe**. Gõ Writing nhanh hơn 1 phím/giây cũng làm đồng hồ chạy chậm. Ngoài ra đồng hồ đếm lùi bằng cách trừ 1 mỗi tick chứ không tính theo mốc kết thúc, nên khi khoá máy hoặc chuyển app (trình duyệt di động dừng timer) đồng hồ ở máy lệch so với máy chủ. | `components/ExamTimer.tsx:16-31` (deps `[paused, onExpire]`, `s - 1`); `app/exam/[id]/page.tsx:683-694` (`onExpire={() => …}` inline); `page.tsx:735-736`, `1166-1170` (cập nhật tiến độ audio mỗi `timeupdate`) | Phi chức năng (độ tin cậy) |
| UX-2 | Nghiêm trọng | Sảnh → đề Cambridge 16–21 (24 đề dựng sẵn) | Đề dựng sẵn chạy ở "demo mode": không có phiên trên máy chủ, không có `AnswerSaver`, không lưu vào localStorage. Tải lại trang, lỡ vuốt back, hoặc trình duyệt di động đóng tab nền để giải phóng RAM thì **mất toàn bộ câu trả lời và bài Writing**, đồng hồ quay về giờ đầy đủ. Kết quả cũng không vào "Lịch sử làm bài". Không có cảnh báo `beforeunload`. Khoá cờ/ghi chú theo `Date.now()` nên cũng mất. | `app/exam/page.tsx:73-75` (builtin → `/exam/demo`); `lib/examConfig.ts:113-120`; `page.tsx:250`, `268` (khoá phiên theo `Date.now()`); `page.tsx:300-349`, `424`, `439`, `476-478` (bỏ qua lưu khi `isDemoMode`); không có `beforeunload` trong `page.tsx` | Chức năng (mất dữ liệu) |
| UX-3 | Nghiêm trọng | Reading, Listening ở 390px | Hai khung xếp ngang cố định, không có `@media` cho màn hẹp. Reading: khung bài đọc 48% ≈ 187px, trừ padding 32+32 còn **khoảng 120px cho chữ**; khung câu hỏi `width: auto` trong flex ăn phần còn lại (~190px, padding 28+28). Listening: khung audio 38% ≈ 148px. Thanh kéo chỉ có `onMouseDown`, không nhận chạm. Thanh chọn passage, A-/A+, chọn font, "Ẩn bài đọc" dồn trong khung 120px. Muốn đọc phải bấm "Ẩn bài đọc", nhưng lúc đó lại không thấy bài đọc khi trả lời. | `globals.css:768-779`, `945-961` (không có rule mobile nào cho `.exam-reading-layout` / `.exam-listening-layout`); `page.tsx:1476` (`splitPercent` 48), `1032` (38); `page.tsx:1623-1626`, `1161`, `1178`; `page.tsx:1305-1306`, `1706-1710` (chỉ `onMouseDown`) | Chức năng + phi chức năng (hiển thị mobile) |
| UX-4 | Nghiêm trọng | Hết giờ phần cuối → nộp tự động | Khi tự nộp mà gặp lỗi (mất mạng, máy chủ 5xx), chỉ có một `window.alert` và `result` vẫn là `null`. Màn "Hết giờ" vẫn ghi "Bài làm đã được lưu và nộp tự động — bạn không mất chữ nào", còn nút chính **kẹt ở "Đang chấm bài…" và bị khoá mãi**, không có nút thử lại hay đường thoát. Khi tải trang lỗi cũng chỉ có nút "Về danh sách đề", không có "Thử lại". | `page.tsx:432-435`, `452-454`, `548-572` (dòng 561 nội dung chữ, dòng 570 `disabled={!result}`); `page.tsx:584-591` | Chức năng (kẹt luồng) + nội dung chữ sai |
| UX-5 | Cao | Mất mạng giữa bài (phiên máy chủ) | Banner ghi "câu trả lời được giữ trên máy và tự gửi khi có mạng", nhưng câu lưu lỗi chỉ nằm trong `Map` ở RAM. Khi có mạng lại không tự gửi (sự kiện `online` chỉ hiện toast); chỉ gửi lại lúc nộp bài hoặc khi sửa đúng câu đó. Tải lại trang lúc đang mất mạng là mất các câu này. Writing có độ trễ lưu 3 s + 2,5 s nên lúc đóng tab có thể mất tới khoảng 5 giây gõ. | `page.tsx:702-708` (nội dung chữ), `517-529`; `lib/examSession.ts:5-6`, `22-51`, `53-58`; `page.tsx:421-429` | Phi chức năng (offline, niềm tin) |
| UX-6 | Cao | Header + chiều cao khung trên mobile | Ở ≤767px header đổi sang `flex-wrap; height:auto`: logo + nhãn chế độ + 2–4 thẻ phần thi + đồng hồ + "Nộp bài" xuống 2–3 dòng (khoảng 100–130px), trong khi `.exam-content` vẫn `margin-top: 56px`, nên **phần đầu nội dung bị header che**. Chiều cao khung dùng `calc(100vh - 54px - 60px)`; trên trình duyệt di động `100vh` tính cả lúc thanh địa chỉ ẩn, nên đáy khung nằm dưới navigator. | `globals.css:732-743`, `766`, `1287`; `page.tsx:662-700`, `1161`, `1623` | Phi chức năng (hiển thị) |
| UX-7 | Cao | Navigator dưới đáy, header | "Phần tiếp" (Listening/Reading) **kết thúc phần ngay**, không hỏi lại, và không quay lại được. Nút này nằm đầu thanh, sát nút cờ, cao khoảng 28px. "Nộp bài" (nộp cả đề) hiện ở header từ giây đầu tiên. Bấm nhầm trên điện thoại rất dễ. | `page.tsx:798-808`, `488-497`, `862-870`, `900-909`; `page.tsx:696-698` | Chức năng (lỗi người dùng không hoàn tác được) |
| UX-8 | Cao | Listening: audio | Không có trạng thái đang tải / đang đệm / lỗi: lỗi `play()` chỉ ghi `console.error`, nút vẫn đổi sang "Tạm Dừng Audio" dù không có tiếng. File nghe là một file 14–28 MB (Cam16 dạng `.wav`). Thanh tiến độ không tua được, tải lại trang thì phát lại từ 0 và không nhớ vị trí. Nút "phát âm thanh thử" ở sảnh dùng giọng đọc tổng hợp (`speechSynthesis`), không thử tải file audio thật. `play()` được gọi trong `useEffect` chứ không gọi trực tiếp trong trình xử lý chạm, nên có nguy cơ bị iOS chặn (giả thuyết). | `page.tsx:1038-1041`, `1162-1173`, `1236-1257`; `app/exam/page.tsx:106-111`; `frontend/public/audio/` (cambridge16_test1.wav 14 MB, cambridge17_test1.mp3 27,6 MB) | Phi chức năng (tốc độ, mạng yếu) |
| UX-9 | Cao | Writing trên mobile | Ở ≤767px lưới thành một cột `height: auto`, còn textarea có `flex: 1` nhưng không có `min-height`, nên **ô viết chỉ cao vài dòng** (giả thuyết, xem bên dưới). Đề nằm phía trên nên phải cuộn qua lại giữa đề và ô viết. Thanh dưới Writing nhét tab Task 1/2 + đếm từ + "Phần tiếp" + "Ẩn Navigator" vào 390px, nên tràn và phải cuộn ngang. `autoCapitalize/autoCorrect` tắt khiến gõ trên bàn phím điện thoại khó hơn. | `globals.css:781`, `791-806`, `1217`; `page.tsx:1963-1973`; `page.tsx:844-885` | Chức năng + phi chức năng |
| UX-10 | Trung bình | Toàn phòng thi | Vùng chạm nhỏ: ô số câu 34px, A-/A+ 26px, nút Part/Passage cao khoảng 26–28px, "Ẩn Navigator" và "Đánh dấu" chữ 0,72rem (mục tiêu ≥44px, tối thiểu 24px theo WCAG 2.5.8). Ô điền đáp án có `font-size: 15px` (<16px) nên **iOS Safari tự phóng to khi chạm vào ô**, làm vỡ bố cục. | `globals.css:822-826`, `878-886`, `962-975`; `page.tsx:1652-1662`, `1183-1195`, `809-818` | Phi chức năng (khả năng truy cập) |
| UX-11 | Trung bình | Bàn phím ảo khi điền đáp án | Thanh navigator `position: fixed` cao 60px cộng bàn phím chiếm hơn nửa màn hình. `onFocus` gọi `onNavigate` → `scrollIntoView({behavior:"smooth", block:"center"})`, có thể giành cuộn với trình duyệt khi bàn phím mở. Không có `enterKeyHint="next"` để nhảy sang ô kế tiếp. | `globals.css:809-821`; `page.tsx:1075-1082`, `1122-1129`, `1146-1153` | Phi chức năng (giả thuyết) |
| UX-12 | Trung bình | App Expo | `mobile/src/app` chỉ có flashcards, friends, schedule, tutor, writing, settings…, **không có thi thử** và không có lối dẫn sang web. Học viên chỉ học trên điện thoại phải tự biết mở trình duyệt. | `mobile/src/app/(tabs)/*.tsx` (không có exam) | Chức năng |

## Giải pháp khuyến nghị

### UX-1: Đồng hồ thi đứng yên / lệch giờ (công sức S)
- Phương án: (a) bọc `onExpire` bằng `useCallback` hoặc giữ nó trong `ref`; (b) **đếm theo mốc kết thúc** `deadline = Date.now() + initialSeconds*1000`, mỗi tick hiển thị `ceil((deadline - Date.now())/1000)`, và tính lại khi có `visibilitychange`; (c) dùng `remaining_seconds` của máy chủ làm nguồn chuẩn, đồng bộ mỗi 60 s.
- **Chọn (a)+(b)**: sửa nhỏ, bỏ được cả lỗi đứng giờ lẫn lỗi lệch khi khoá máy. (c) làm sau cho phiên máy chủ.
- Cho SA: `ExamTimer` lưu `onExpire` vào `useRef`, effect chỉ phụ thuộc `[paused, initialSeconds]`. Khi tab hiện lại mà đã quá hạn thì gọi `onExpire` một lần.

### UX-2: Đề dựng sẵn không lưu gì (công sức M)
- Phương án: (a) lưu trạng thái demo vào `localStorage` theo khoá ổn định `demo-<type>-<sections>`; (b) đề builtin cũng tạo phiên trên máy chủ như đề "mine"; (c) chỉ thêm `beforeunload`.
- **Chọn (a) + `beforeunload`**, rồi làm (b) khi backend sẵn sàng. Cách này chạy được cả khi không có mạng.
- Cho SA: lưu `{answers, writingTask1/2, currentSection, sectionDone, deadline}` mỗi lần thay đổi (debounce 500 ms). Khi vào lại `/exam/demo` cùng khoá thì hiện hộp thoại khôi phục. Xoá bản lưu khi nộp xong.
- Nội dung chữ: tiêu đề "Tiếp tục bài đang làm?"; mô tả "Bạn đang làm dở Cambridge 18 Test 2, còn 23:41 phần Reading."; nút "Làm tiếp" / "Làm lại từ đầu". Hộp `beforeunload`: dùng thông điệp mặc định của trình duyệt.

### UX-3: Reading/Listening chia đôi trên màn hẹp (công sức M–L)
- Phương án: (a) ≤767px đổi sang **2 tab dính ở đầu màn "Bài đọc | Câu hỏi (12/40)"**, nhớ vị trí cuộn của từng tab; (b) bài đọc toàn màn, câu hỏi là bottom sheet kéo lên được; (c) xếp dọc 50/50 có thể kéo.
- **Chọn (a)**: dễ làm, phù hợp màn 390px, không cần cử chỉ kéo. (b) cân nhắc sau khi đo hành vi.
- Cho SA: khi `matchMedia("(max-width: 767px)")` khớp thì không render splitter, mỗi khung `width: 100%`, chỉ hiện khung đang chọn. Listening: thẻ audio thu gọn thành một thanh dính dưới header (nút phát, tiến độ, "Part 2"). Thanh công cụ cỡ chữ chuyển vào menu "Aa". Khi xoay ngang ≥768px thì dùng lại bố cục chia đôi.
- Nội dung chữ tab: "Bài đọc", "Câu hỏi · 12/40".

### UX-4: Kẹt ở "Đang chấm bài…" (công sức S)
- **Chọn**: thay `window.alert` bằng trạng thái lỗi ngay trên màn Hết giờ và hộp thoại Nộp bài, có nút thử lại. Tự thử lại khi nhận sự kiện `online`.
- Cho SA: thêm state `submitError`. Màn Hết giờ chỉ ghi "đã nộp" khi `result` có thật.
- Nội dung chữ: khi đang gửi: "Đang nộp bài…"; khi lỗi: tiêu đề "Chưa nộp được bài", mô tả "Mạng đang chập chờn. Bài làm vẫn nằm trên máy này, đừng đóng trang.", nút "Nộp lại" (chính) và "Về danh sách đề" (phụ, kèm cảnh báo). Màn tải lỗi: thêm nút "Thử lại".

### UX-5: Mất mạng làm mất câu chưa lưu (công sức M)
- **Chọn**: lưu bản sao các câu đang chờ gửi vào `localStorage` (khoá `exam-pending-<sessionId>`), gọi `flush()` khi có sự kiện `online` và khi `visibilitychange → hidden`, gửi lại bản chờ khi tải trang. Giảm debounce Writing xuống 1,5 s và luôn lưu một bản cục bộ.
- Nội dung chữ: chỉ ghi "giữ trên máy" khi điều đó đúng. Ví dụ "Mất kết nối. 3 câu đang được giữ trên máy này và sẽ tự gửi khi có mạng. Đồng hồ vẫn chạy."

### UX-6: Header che nội dung, 100vh (công sức S–M)
- **Chọn**: header mobile một dòng cao 52px gồm logo-mark, tên phần hiện tại ("Reading · 2/4"), đồng hồ và nút menu "⋯" chứa "Nộp bài". Ẩn các thẻ phần thi (đã có ở màn chuyển phần). Đổi `100vh` thành `100dvh` (giữ `100vh` dự phòng). Thêm `env(safe-area-inset-bottom)` cho navigator.

### UX-7: Bấm nhầm "Phần tiếp" / "Nộp bài" (công sức S)
- **Chọn**: "Phần tiếp" mở hộp xác nhận cùng kiểu với hộp Nộp bài, ghi số câu chưa làm và số câu đã đánh dấu. Chuyển nút này về cuối thanh, cách nút cờ ít nhất 8px. Trên mobile, "Nộp bài" nằm trong menu header (UX-6).
- Nội dung chữ: tiêu đề "Kết thúc phần Reading?"; mô tả "Bạn còn 6 câu chưa làm và 2 câu đánh dấu. Sau khi chuyển sẽ không quay lại phần này được."; nút "Làm tiếp" (mặc định) và "Kết thúc phần".

### UX-8: Audio Listening (công sức M)
- **Chọn**: thêm trạng thái cho nút phát: "Đang tải audio… 35%" (`progress`/`canplaythrough`), "Đang đệm…" (`waiting`), lỗi kèm "Thử lại". Gọi `audioRef.play()` trực tiếp trong `onClick`. Lưu `currentTime` theo phiên (localStorage hoặc máy chủ) để khi tải lại thì phát tiếp. Chuyển Cam16 `.wav` sang mp3/m4a khoảng 64 kbps (≈14 MB cho 30 phút) hoặc dùng các file `_partN` đã có. Ở sảnh, "phát âm thanh thử" phát 3 giây đầu của chính file đề và báo "Đã tải được audio".
- Nội dung chữ lỗi: "Không phát được audio. Kiểm tra mạng rồi bấm Thử lại. Đồng hồ vẫn chạy."

### UX-9: Writing trên mobile (công sức S–M)
- **Chọn**: ≤767px dùng 2 tab "Đề bài | Bài viết". Textarea `min-height: calc(100dvh - 200px)`. Đề bài có nút "Xem đề" mở dạng sheet đè lên mà không mất vị trí con trỏ. Thanh dưới chỉ còn tab Task 1/2 và đếm từ; "Phần tiếp" chuyển vào menu header. Giữ `spellCheck={false}`, bật `autoCapitalize="sentences"`.

### UX-10: Vùng chạm và tự phóng to (công sức S)
- **Chọn**: ở ≤767px đặt `.exam-nav-btn` 44x44 (hoặc 40px, cách nhau 6px), các nút điều khiển cao ≥40px. `.exam-input` và `.exam-inline-fill-input` dùng `font-size: 16px`. Không dùng `maximum-scale=1` vì làm hỏng khả năng phóng to.

### UX-11: Bàn phím ảo (công sức S)
- **Chọn**: ẩn navigator khi một ô nhập đang có focus trên mobile (theo `visualViewport` resize). Bỏ cuộn `smooth` khi focus vì trình duyệt tự cuộn rồi. Thêm `enterKeyHint="next"` và chuyển focus sang ô kế tiếp khi bấm Enter.

### UX-12: App Expo chưa có thi thử (công sức S cho bước 1, L cho màn native)
- **Chọn**: bước 1 thêm thẻ "Thi thử IELTS" ở tab Hôm nay của app, mở `/exam` bằng `expo-web-browser` (SFSafariViewController/Custom Tab) có kèm phiên đăng nhập. Chỉ làm màn native sau khi UX-1 đến UX-9 đã ổn trên web mobile.
- Nội dung chữ: "Thi thử IELTS · Mở trong trình duyệt".

## Tiêu chí chấp nhận

1. **UX-1**: Phát audio Listening 2 phút liên tục thì đồng hồ giảm đúng 2:00 (±2 s). Khoá máy 3 phút rồi mở lại thì đồng hồ đã giảm 3:00 (±2 s); nếu quá hạn thì chuyển phần hoặc nộp ngay khi mở lại.
2. **UX-2**: Làm đề Cambridge dựng sẵn, điền 10 câu Reading và 80 từ Writing, tải lại trang: hiện "Tiếp tục bài đang làm?"; bấm "Làm tiếp" thì đủ 10 câu, 80 từ, và đồng hồ đúng giờ còn lại. Vuốt back khỏi phòng thi thì trình duyệt hỏi xác nhận.
3. **UX-3**: Ở 390x844, Reading có 2 tab, bài đọc hiển thị rộng ≥340px, không có thanh cuộn ngang. Chuyển qua lại giữa 2 tab vẫn giữ vị trí cuộn. Xoay ngang (844px) thì quay về chia đôi.
4. **UX-4**: Tắt mạng rồi để hết giờ phần cuối: màn hiện "Chưa nộp được bài" và nút "Nộp lại". Bật mạng thì tự nộp trong 5 s (hoặc bấm "Nộp lại") và vào được kết quả. Không lúc nào có `window.alert`.
5. **UX-5**: Phiên máy chủ: tắt mạng, trả lời 3 câu, tải lại trang (vẫn offline), bật mạng thì 3 câu còn nguyên và được lưu lên máy chủ trong 5 s mà không cần nộp.
6. **UX-6**: Ở 390x844 khi có 4 phần thi, header cao ≤56px và một dòng; dòng đầu tiên của nội dung không bị che. Khung cuộn kết thúc đúng trên navigator ở iOS Safari khi thanh địa chỉ thu hoặc mở.
7. **UX-7**: Bấm "Phần tiếp" thì có hộp xác nhận ghi số câu chưa làm; "Làm tiếp" là lựa chọn mặc định. Không có thao tác chạm đơn nào kết thúc phần thi hay nộp bài.
8. **UX-8**: Giả lập "Slow 4G": trong 1 s sau khi bấm phát, nút hiện trạng thái tải. Chặn URL audio thì hiện thông báo lỗi và nút "Thử lại", nút không ghi "Tạm Dừng". Tải lại giữa bài nghe thì audio phát tiếp từ vị trí cũ (±3 s).
9. **UX-9**: Ở 390x844, tab "Bài viết" có ô gõ cao ≥60% màn hình khi chưa mở bàn phím. Thanh dưới không cuộn ngang.
10. **UX-10**: Mọi nút trong phòng thi ở ≤767px có vùng chạm ≥40x40px. Chạm vào ô điền đáp án trên iOS Safari thì trang không tự phóng to.
11. **UX-11**: Điền ô câu 5 trên Android Chrome và iOS Safari: ô vẫn nằm trên bàn phím. Bấm "Next/Tiếp" trên bàn phím thì focus sang ô câu 6.
12. **UX-12**: Từ app Expo, bấm "Thi thử IELTS" mở `/exam` đã đăng nhập, trong ≤2 lần chạm.

## Giả thuyết cần kiểm chứng

- **UX-1 (đứng giờ khi phát audio)**: kết luận từ code (inline `onExpire` + `timeupdate` khoảng 250 ms). Kiểm chứng: trên desktop, phát audio Listening và quan sát đồng hồ 30 s. Nếu đúng thì đây là lỗi cả trên desktop, không riêng mobile.
- **UX-3/UX-6/UX-9 (đo kích thước)**: số px được tính từ CSS. Cần chụp màn hình thật ở 390x844 (light + dark) và trên iPhone Safari để đo header khi wrap và chiều cao textarea.
- **UX-8 (iOS chặn `play()`)**: `play()` chạy trong `useEffect` sau cú chạm. React 18 thường xử lý ngay sự kiện chạm nên có thể vẫn hợp lệ. Cần thử trên iPhone thật, đúng tình huống lần đầu vào phòng thi.
- **UX-8 (thời gian tải audio)**: đo thời gian từ lúc bấm đến khi có tiếng trên 4G Việt Nam (Viettel/VNPT) với file 14 MB và 28 MB.
- **UX-11 (bàn phím che ô / giành cuộn)**: cần thử thật trên iOS 17+ và Android Chrome. `scrollIntoView` smooth khi focus có thể không gây hại.
- **UX-2 (tab bị đóng khi chạy nền)**: tần suất phụ thuộc máy (Android RAM thấp hay bị). Đề xuất đo sự kiện `exam_room_reload` (lần vào lại `/exam/demo` trong vòng 2 giờ) và tỷ lệ phiên demo không có sự kiện nộp.
- **Hành vi người dùng**: chưa có dữ liệu bao nhiêu % học viên làm đề trên điện thoại. Đề xuất ghi `viewport_width` khi bắt đầu phiên thi và phỏng vấn 5 học viên làm Reading trên điện thoại để chọn giữa tab và bottom sheet (UX-3).
- **Ngoài phạm vi lượt này**: Speaking (ghi âm, quyền micro trên mobile) và màn kết quả `ServerResult` chưa rà sâu. Bảng chi tiết câu (`table-box`) có thể cần cuộn ngang ở 390px.
