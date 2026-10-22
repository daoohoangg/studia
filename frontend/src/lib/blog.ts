import type { Level, Mood } from "@/components/mascot/Mascot";

/**
 * Nội dung blog của Coal. Viết thẳng trong mã (không cần backend) để trang công khai, nhanh, tốt cho SEO.
 * Đoạn văn hỗ trợ **in đậm**. Thêm bài mới: thêm một phần tử vào POSTS (mới nhất lên đầu).
 */
export type Block =
  | { t: "p"; text: string }
  | { t: "h2"; text: string }
  | { t: "h3"; text: string }
  | { t: "ul"; items: string[] }
  | { t: "ol"; items: string[] }
  | { t: "quote"; text: string; cite?: string }
  | { t: "callout"; title: string; text: string; tone?: "brand" | "accent" | "success" }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "coal"; mood: Mood; wet?: Level; fire?: Level; text: string };

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // YYYY-MM-DD
  readMin: number;
  tag: "Câu chuyện" | "Phương pháp" | "Tài liệu" | "Lộ trình";
  coal: { mood: Mood; wet?: Level; fire?: Level };
  blocks: Block[];
};

export const POSTS: Post[] = [
  {
    slug: "coal-la-ai",
    title: "Coal là ai? Câu chuyện cục than muốn thành kim cương",
    excerpt: "Vì sao linh vật của Studia là một cục than, vì sao nó cháy rực khi bạn kiên trì và ướt sũng khi bạn vắng, và bốn lời hứa Coal dành cho mọi người học.",
    date: "2026-10-21",
    readMin: 5,
    tag: "Câu chuyện",
    coal: { mood: "fire", fire: 3 },
    blocks: [
      { t: "p", text: "Ở đâu đó dưới lòng đất, có một cục than nhỏ. Nó đen, xù xì, và không ai để ý. Nhưng nó có một điều khác với những cục than còn lại: nó muốn trở thành kim cương." },
      { t: "h2", text: "Than và kim cương giống nhau hơn bạn nghĩ" },
      { t: "p", text: "Than đá và kim cương đều được tạo nên chủ yếu từ **carbon**. Điều làm nên khác biệt là cách các nguyên tử sắp xếp. Kim cương hình thành sâu trong lòng Trái Đất, nơi áp suất và nhiệt độ rất cao ép các nguyên tử vào một cấu trúc cực kỳ bền. Chịu được áp lực, đủ lâu, chính là chìa khoá." },
      { t: "callout", tone: "accent", title: "Một lời thú nhận khoa học", text: "Nói cho đúng, phần lớn kim cương tự nhiên không hình thành từ than đá mà từ carbon trong lớp phủ của Trái Đất. Coal biết điều đó. Nhưng nó vẫn chọn câu chuyện này, vì đây là một ẩn dụ đẹp về việc học: không ai sinh ra đã giỏi, chỉ có những người chịu ở lại với áp lực đủ lâu." },
      { t: "h2", text: "Vì sao Coal sống cùng streak của bạn" },
      { t: "p", text: "Học ngoại ngữ không phải cuộc đua nước rút. Thứ giúp bạn tiến bộ là những buổi học nhỏ, đều đặn, lặp lại nhiều tuần liền. Coal là cách Studia biến chuỗi ngày học của bạn thành một thứ nhìn thấy được. Bạn học đều thì Coal bốc lửa:" },
      { t: "table", head: ["Streak của bạn", "Coal trông thế nào"], rows: [
        ["1–2 ngày", "Một ngọn lửa nhỏ trên đầu"],
        ["3–6 ngày", "Lửa to hơn, đầu bắt đầu bốc cháy"],
        ["7–13 ngày", "Lửa ở đầu và hai bàn tay, lõi than ở bụng sáng lên"],
        ["14–29 ngày", "Cả đống lửa bốc quanh người, quầng sáng màu cam"],
        ["30 ngày trở lên", "Cháy cả người"],
      ] },
      { t: "p", text: "Ngược lại, khi bạn vắng mặt, Coal không giận. Nó chỉ bị… ướt." },
      { t: "table", head: ["Số ngày bạn vắng", "Coal trông thế nào"], rows: [
        ["1–2 ngày", "Ngủ gật, người ươn ướt, lửa chỉ còn làn khói"],
        ["3–6 ngày", "Ướt cả người, nước chảy thành vệt, hơi buồn"],
        ["7–13 ngày", "Ướt sũng, đứng trong vũng nước, run lập cập"],
        ["14 ngày trở lên", "Ngập nước từ đầu đến chân, nhưng vẫn ngồi chờ bạn"],
      ] },
      { t: "coal", mood: "lost", wet: 3, text: "Mình ướt không phải để trách bạn đâu. Đó là cách mình nói “mình nhớ bạn”. Chỉ cần học 5 phút, mình sẽ khô dần và lửa sẽ cháy lại." },
      { t: "h2", text: "Bốn lời hứa của Coal" },
      { t: "ol", items: [
        "**Nhỏ nhưng đều.** Coal luôn gợi ý bài vừa sức, 5–15 phút, để bạn không bị ngợp và bỏ cuộc.",
        "**Không xấu hổ.** Đứt streak là chuyện bình thường của mọi người học. Coal không bao giờ mắng bạn, chỉ rủ bạn bắt đầu lại.",
        "**Sai là dữ liệu.** Mỗi lỗi sai được ghi lại để ôn, chứ không phải một lần thất bại.",
        "**Ăn mừng điều nhỏ.** Một từ nhớ được, một câu nghe chép đúng 100%, một ngày giữ được lửa, đều xứng đáng được vỗ tay.",
      ] },
      { t: "h2", text: "Coal giúp bạn thế nào trong Studia" },
      { t: "ul", items: [
        "Trả lời câu hỏi về ngữ pháp, từ vựng, cách làm bài, bám theo sách bạn đã tải lên.",
        "Nhắc bạn học đúng khung giờ bạn chọn trong Lịch học, kể cả qua email.",
        "Đổi dáng theo streak của bạn mỗi ngày, ở trang Hôm nay và trong khung trò chuyện.",
        "Gợi ý bước tiếp theo khi bạn không biết hôm nay nên học gì.",
      ] },
      { t: "p", text: "Cục than nhỏ vẫn đang ở đây, ngay trong góc màn hình của bạn. Nó chưa phải kim cương. Bạn cũng chưa, và cả hai đang cùng đi trên con đường đó." },
    ],
  },
  {
    slug: "7-nguyen-tac-hoc-ielts-hieu-qua",
    title: "7 nguyên tắc học IELTS hiệu quả, ít tốn công mà nhớ lâu",
    excerpt: "Không cần học nhiều giờ hơn, chỉ cần học đúng cách hơn: giãn cách, nhớ lại chủ động, luyện theo dạng đề, ghi lại lỗi sai và đo tiến bộ đều đặn.",
    date: "2026-10-20",
    readMin: 7,
    tag: "Phương pháp",
    coal: { mood: "focus" },
    blocks: [
      { t: "p", text: "Nhiều người học IELTS bắt đầu bằng cách mua thật nhiều sách rồi học dồn vào cuối tuần. Cách đó dễ mệt và dễ quên. Bảy nguyên tắc dưới đây dựa trên những điều các nghiên cứu về trí nhớ và học tập đã chỉ ra từ lâu, và đều áp dụng được ngay." },
      { t: "h2", text: "1. Biết mình đang ở đâu, rồi mới đặt mục tiêu" },
      { t: "p", text: "Trước khi học, hãy làm một bài thi thử để biết band hiện tại của từng kỹ năng. Mục tiêu tốt có ba phần: **điểm** (ví dụ 6.5), **hạn** (ví dụ trước ngày thi) và **kỹ năng yếu nhất** cần kéo lên trước. Mục tiêu mơ hồ kiểu “học giỏi tiếng Anh” rất khó giữ lửa." },
      { t: "h2", text: "2. Học ít nhưng mỗi ngày" },
      { t: "p", text: "Não nhớ tốt hơn khi việc học được **giãn ra theo thời gian** so với khi dồn vào một lúc. 30 phút mỗi ngày trong 7 ngày thường hiệu quả hơn 3,5 giờ trong một buổi. Đây cũng là lý do Studia đếm streak: không phải để gây áp lực, mà để bạn thấy thói quen đang hình thành." },
      { t: "h2", text: "3. Tự nhớ lại thay vì đọc lại" },
      { t: "p", text: "Đọc lại ghi chép tạo cảm giác quen thuộc chứ chưa chắc là nhớ. **Nhớ lại chủ động** (che đáp án rồi tự trả lời) khó hơn, nhưng củng cố trí nhớ mạnh hơn nhiều. Hãy biến mọi thứ cần nhớ thành câu hỏi: từ vựng thành thẻ, ngữ pháp thành câu điền từ, bài đọc thành vài câu hỏi tự đặt." },
      { t: "h2", text: "4. Ôn từ vựng theo lịch giãn cách" },
      { t: "p", text: "Từ bạn nhớ rồi thì ôn thưa dần (1 ngày, 3 ngày, 1 tuần…). Từ bạn hay quên thì ôn dày hơn. Bạn không cần tự tính lịch: thẻ từ vựng trong Studia tự sắp xếp thời điểm ôn theo mức bạn trả lời dễ hay khó." },
      { t: "h2", text: "5. Luyện theo dạng đề, rồi ghi lại lỗi sai" },
      { t: "p", text: "IELTS có các dạng câu hỏi quen thuộc (điền từ, nối tiêu đề, True/False/Not Given, biểu đồ…). Hãy luyện từng dạng cho đến khi bạn hiểu **vì sao** mình sai, không chỉ biết đáp án đúng. Mỗi lỗi sai nên được ghi lại cùng nguyên nhân (không biết từ, nghe sót, đọc vội, hiểu sai đề). Sau hai tuần, bạn sẽ thấy lỗi nào lặp lại nhiều nhất và biết cần sửa gì." },
      { t: "h2", text: "6. Luyện từng kỹ năng bằng bài tập nhỏ, đúng chỗ yếu" },
      { t: "table", head: ["Kỹ năng", "Bài tập nhỏ hiệu quả", "Thời lượng gợi ý"], rows: [
        ["Nghe", "Nghe chép chính tả đoạn 10–15 giây, nghe lại từng cụm", "15 phút, 3 lần/tuần"],
        ["Nói", "Đọc theo câu mẫu (shadowing), ghi âm rồi nghe lại", "10 phút/ngày"],
        ["Đọc", "Đọc một bài ngắn, tự đặt 3 câu hỏi rồi mới làm đề", "30 phút, 3 lần/tuần"],
        ["Viết", "Viết một đoạn (không cần cả bài), sửa theo lỗi lặp lại", "20 phút, 2 lần/tuần"],
        ["Từ vựng", "Thẻ ôn cách quãng, mỗi từ kèm một câu ví dụ", "10 phút/ngày"],
      ] },
      { t: "h2", text: "7. Thi thử định kỳ trong điều kiện thật" },
      { t: "p", text: "Cứ 2–3 tuần, làm một bài thi thử có bấm giờ, không dừng, không tra từ. Mục đích không phải lấy điểm cao mà để biết điểm số, tốc độ làm bài và mức căng thẳng của bạn. Sau đó mới quay lại các nguyên tắc 5 và 6 để vá chỗ yếu." },
      { t: "callout", tone: "success", title: "Tóm tắt trong một câu", text: "Ít mỗi ngày, tự nhớ lại, ôn giãn cách, luyện đúng chỗ yếu, ghi lại lỗi sai, thi thử đều đặn, và đừng quên ngủ đủ giấc." },
      { t: "coal", mood: "happy", fire: 1, text: "Nếu chỉ chọn một việc cho tuần này, hãy chọn việc học đều. Mình sẽ cháy cùng bạn từ ngày thứ ba." },
    ],
  },
  {
    slug: "tai-lieu-nen-hoc-ielts",
    title: "Tài liệu nên học: bộ sách và nguồn miễn phí đáng tin cho IELTS",
    excerpt: "Danh sách chọn lọc theo từng kỹ năng, kèm cách dùng: chọn ít thôi, học kỹ, và biến sách của bạn thành bài học, thẻ từ vựng và đề thi trong Studia.",
    date: "2026-10-19",
    readMin: 6,
    tag: "Tài liệu",
    coal: { mood: "happy" },
    blocks: [
      { t: "p", text: "Sai lầm phổ biến nhất khi chọn tài liệu IELTS là **mua quá nhiều và học dở dang**. Một giáo trình chính cộng một nguồn bổ trợ, học đến nơi đến chốn, thường hiệu quả hơn mười cuốn sách mới đọc được vài chương." },
      { t: "callout", tone: "brand", title: "Lưu ý", text: "Danh sách dưới đây chỉ là gợi ý của Studia, không phải quảng cáo. Studia không liên kết với các nhà xuất bản nêu tên. Hãy kiểm tra phiên bản mới nhất và điều kiện sử dụng trước khi mua hoặc tải." },
      { t: "h2", text: "Đề thi thật để luyện và thi thử" },
      { t: "ul", items: [
        "**Cambridge IELTS** (loạt sách đề thi thật của Cambridge University Press & Assessment, kèm audio và đáp án). Đây là nguồn đề sát nhất với bài thi chính thức, nên để dành cho thi thử có bấm giờ.",
        "**Đề mẫu trên trang chính thức** của IELTS (ielts.org) và của British Council hoặc IDP: ít đề nhưng miễn phí và đúng định dạng.",
      ] },
      { t: "h2", text: "Giáo trình nền tảng theo kỹ năng" },
      { t: "table", head: ["Mục đích", "Gợi ý", "Dùng thế nào"], rows: [
        ["Hiểu bài thi và chiến lược", "The Official Cambridge Guide to IELTS", "Đọc phần dạng bài trước khi làm đề"],
        ["Ngữ pháp", "English Grammar in Use (Raymond Murphy); Cambridge Grammar for IELTS", "Học theo chủ điểm bạn hay sai trong sổ lỗi"],
        ["Từ vựng theo chủ đề", "Cambridge Vocabulary for IELTS; Oxford Word Skills", "Mỗi ngày 5–10 từ, tạo thẻ có câu ví dụ"],
        ["Từ vựng học thuật", "Academic Vocabulary in Use", "Dành cho Reading và Writing Task 2"],
      ] },
      { t: "h2", text: "Nguồn miễn phí để luyện nghe và đọc mỗi ngày" },
      { t: "ul", items: [
        "**BBC Learning English** (như 6 Minute English): đoạn ngắn, có transcript, rất hợp để nghe chép chính tả.",
        "**TED Talks**: bật phụ đề tiếng Anh, nghe lại những đoạn bạn nghe sót.",
        "**Tin tức BBC, The Guardian**: đọc một bài ngắn mỗi ngày để quen từ vựng học thuật và cách lập luận.",
        "**British Council LearnEnglish**: bài tập ngữ pháp, từ vựng và kỹ năng theo trình độ.",
      ] },
      { t: "h2", text: "Cách chọn: nguyên tắc 1 + 1 + 1" },
      { t: "ol", items: [
        "**Một giáo trình chính** cho cả quá trình (ví dụ một bộ Cambridge IELTS).",
        "**Một nguồn nghe đọc hàng ngày** bạn thật sự thấy thú vị, để bạn muốn quay lại.",
        "**Một sổ lỗi sai** (trong Studia là mục Lỗi sai) để biết mình cần ôn gì.",
      ] },
      { t: "h2", text: "Biến sách của bạn thành bài học trong Studia" },
      { t: "p", text: "Nếu bạn đã có sách hoặc tài liệu PDF, DOCX của riêng mình, hãy tải lên Studia. Hệ thống sẽ tách thành các chương, cho bạn đọc, ghi chú, bôi đen từ để tra, tạo flashcard và hỏi đáp với Coal ngay trên nội dung đó. Chỉ tải những tài liệu bạn có quyền sử dụng." },
      { t: "coal", mood: "hello", text: "Đừng sưu tầm tài liệu như sưu tầm tem nhé. Chọn ít thôi, rồi cùng mình học cho xong từng chương." },
    ],
  },
  {
    slug: "lo-trinh-12-tuan-ielts",
    title: "Lộ trình 12 tuần từ band 5.0 lên 6.5: học gì mỗi tuần",
    excerpt: "Một khung 12 tuần chia thành 4 giai đoạn, mỗi ngày khoảng 60–90 phút, có tuần đo đầu vào và các tuần thi thử. Dùng làm khung tham khảo và chỉnh theo bạn.",
    date: "2026-10-18",
    readMin: 7,
    tag: "Lộ trình",
    coal: { mood: "fire", fire: 2 },
    blocks: [
      { t: "callout", tone: "accent", title: "Đọc trước khi bắt đầu", text: "Đây là khung gợi ý, không phải cam kết điểm số. Tốc độ tiến bộ phụ thuộc trình độ nền, thời gian học thật sự và chất lượng luyện tập. Nếu bạn học ít hơn 60 phút mỗi ngày, cứ kéo dài mỗi giai đoạn thêm vài tuần." },
      { t: "p", text: "Lộ trình chia làm 4 giai đoạn. Mỗi ngày học khoảng **60–90 phút**, gồm một khối chính (luyện kỹ năng) và một khối nhỏ cố định (ôn thẻ từ vựng 10 phút)." },
      { t: "h2", text: "Giai đoạn 1 · Tuần 1: Đo đầu vào và đặt mục tiêu" },
      { t: "ul", items: [
        "Làm một bài thi thử đầy đủ để biết band từng kỹ năng.",
        "Chọn kỹ năng yếu nhất làm ưu tiên, ghi mục tiêu cho tuần 12.",
        "Đặt lịch học trong Lịch học của Studia và bật nhắc giờ.",
        "Mục tiêu nhỏ: giữ streak 3 ngày để Coal bốc lửa.",
      ] },
      { t: "h2", text: "Giai đoạn 2 · Tuần 2–4: Xây nền" },
      { t: "ul", items: [
        "**Từ vựng**: 5–10 từ mỗi ngày theo chủ đề IELTS, ôn bằng thẻ cách quãng.",
        "**Ngữ pháp**: ôn các điểm bạn hay sai (thì, mạo từ, câu phức, mệnh đề quan hệ).",
        "**Nghe**: nghe chép chính tả đoạn ngắn 3 lần mỗi tuần, tốc độ 0.75× rồi 1×.",
        "**Làm quen dạng bài**: mỗi kỹ năng làm 1–2 phần có hướng dẫn, chưa cần bấm giờ.",
      ] },
      { t: "h2", text: "Giai đoạn 3 · Tuần 5–8: Luyện từng kỹ năng" },
      { t: "table", head: ["Ngày", "Khối chính (45–60 phút)", "Khối cố định"], rows: [
        ["Thứ Hai", "Listening: một phần + chép lại chỗ nghe sót", "Thẻ từ vựng 10 phút"],
        ["Thứ Ba", "Reading: một bài + phân tích câu sai", "Thẻ từ vựng 10 phút"],
        ["Thứ Tư", "Speaking: Part 1–2, ghi âm và nghe lại", "Thẻ từ vựng 10 phút"],
        ["Thứ Năm", "Writing: một đoạn hoặc Task 1, sửa theo lỗi lặp", "Thẻ từ vựng 10 phút"],
        ["Thứ Sáu", "Kỹ năng yếu nhất: thêm một bài", "Thẻ từ vựng 10 phút"],
        ["Thứ Bảy", "Ôn sổ lỗi sai + nghe chép chính tả", "Thẻ từ vựng 10 phút"],
        ["Chủ Nhật", "Nghỉ nhẹ hoặc đọc/nghe giải trí bằng tiếng Anh", "Không bắt buộc"],
      ] },
      { t: "h2", text: "Giai đoạn 4 · Tuần 9–12: Thi thử và vá lỗ hổng" },
      { t: "ul", items: [
        "Tuần 9 và tuần 11: một bài thi thử đầy đủ có bấm giờ, chấm và ghi lại lỗi.",
        "Các ngày còn lại: luyện đúng dạng bài bạn hay mất điểm, theo sổ lỗi sai.",
        "Tuần 12: thi thử lần cuối, giảm khối lượng, ngủ đủ, kiểm tra giấy tờ thi.",
      ] },
      { t: "h2", text: "Ba điều giúp bạn không bỏ cuộc giữa chừng" },
      { t: "ol", items: [
        "**Học cùng một giờ mỗi ngày.** Thói quen gắn với giờ giấc dễ giữ hơn thói quen gắn với tâm trạng.",
        "**Cho phép mình học tối thiểu.** Ngày bận, chỉ cần 5 phút thẻ từ vựng cũng giữ được chuỗi.",
        "**Khi lỡ vắng vài ngày, đừng bù dồn.** Quay lại với một bài vừa sức, rồi tăng dần.",
      ] },
      { t: "coal", mood: "cheer", fire: 2, text: "12 tuần dài nhưng mỗi ngày chỉ là một bước nhỏ. Bạn bước, mình giữ lửa. Cùng nhau nhé!" },
    ],
  },
  {
    slug: "nghe-chep-chinh-ta-15-phut",
    title: "Nghe chép chính tả: bài tập 15 phút cải thiện kỹ năng Nghe",
    excerpt: "Vì sao nghe rồi gõ lại từng đoạn ngắn lại hiệu quả, cách làm đúng từng bước, những lỗi hay gặp và cách tận dụng tính năng Nghe chép trong Studia.",
    date: "2026-10-17",
    readMin: 5,
    tag: "Phương pháp",
    coal: { mood: "happy" },
    blocks: [
      { t: "p", text: "Bạn đã bao giờ nghe một đoạn tiếng Anh, hiểu đại ý, nhưng khi được hỏi một chi tiết thì không chắc mình nghe được từ nào? **Nghe chép chính tả** (dictation) giải quyết đúng điểm đó: nó buộc bạn nghe từng từ, rồi viết ra, nên mọi chỗ nghe sót đều lộ ra." },
      { t: "h2", text: "Vì sao bài tập này hiệu quả" },
      { t: "ul", items: [
        "**Buộc tập trung vào từng từ**, kể cả các từ yếu như a, the, of, to mà người học hay bỏ qua.",
        "**Làm lộ chỗ hay nghe sai**, đặc biệt là âm cuối và các từ nối âm trong lời nói thật.",
        "**Gắn âm thanh với mặt chữ**, giúp cả kỹ năng nghe lẫn chính tả (rất quan trọng khi điền từ trong IELTS Listening).",
        "**Ngắn và đo được**: bạn thấy ngay mình đúng bao nhiêu phần trăm.",
      ] },
      { t: "h2", text: "Cách làm đúng trong 15 phút" },
      { t: "ol", items: [
        "**Chọn đoạn 10–15 giây** (khoảng 25–35 từ). Dài hơn thì não quá tải, ngắn hơn thì không đủ luyện.",
        "**Nghe cả đoạn một lần** để nắm ý, chưa gõ vội.",
        "**Nghe lại và gõ.** Nếu kịp thì gõ cùng lúc, không kịp thì nghe từng cụm (Studia tách sẵn các cụm cho bạn).",
        "**Giảm tốc độ nếu cần**: bắt đầu ở 0.75× khi đoạn khó, rồi tăng lên 1× khi đã quen.",
        "**Chỉ dùng gợi ý khi thật sự bí**, và dùng gợi ý chữ cái đầu trước khi xem đáp án.",
        "**Đối chiếu kỹ**: xem từ nào sai chính tả, từ nào nghe nhầm, từ nào bỏ sót, từ nào gõ thừa.",
        "**Nghe lại câu gốc ở tốc độ chậm** rồi ghi các từ hay sai vào danh sách để ôn.",
      ] },
      { t: "h2", text: "Ba loại lỗi và cách sửa" },
      { t: "table", head: ["Loại lỗi", "Dấu hiệu", "Cách sửa"], rows: [
        ["Bỏ sót từ", "Thường là từ ngắn, từ chức năng", "Nghe từng cụm, chú ý nhịp câu"],
        ["Nghe nhầm", "Thay bằng từ nghe na ná", "Nghe lại ở 0.75×, tập nhận âm cuối và nối âm"],
        ["Sai chính tả", "Nghe đúng nhưng viết sai", "Ôn từ đó bằng thẻ, viết lại 3 lần"],
      ] },
      { t: "h2", text: "Lịch gợi ý" },
      { t: "p", text: "**3 buổi mỗi tuần, mỗi buổi 15 phút**, mỗi buổi 3–4 đoạn. Bắt đầu ở cấp Cơ bản. Khi chính xác ổn định trên 85–90% thì lên cấp Trung bình, rồi Nâng cao. Bạn cũng có thể dán văn bản của riêng mình (ví dụ audioscript của đề đã làm) để Studia tự cắt thành các đoạn 10–15 giây." },
      { t: "callout", tone: "brand", title: "Mẹo từ Coal", text: "Dùng chế độ thi khi bạn đã quen: chỉ nghe tối đa 2 lượt, không nghe từng cụm, không gợi ý. Đó là cảm giác gần nhất với phòng thi thật." },
      { t: "coal", mood: "focus", text: "Chính xác 45% hôm nay không sao hết. Mình cũng từng như vậy. Giảm tốc độ, nghe từng cụm, rồi thử lại nhé." },
    ],
  },
];

export const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);

export const fmtDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};
