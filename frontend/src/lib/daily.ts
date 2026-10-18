/** Nội dung đổi mỗi ngày: câu nói tiếng Anh và từ vựng. Chọn theo ngày trong năm nên mọi thiết bị thấy cùng một mục. */
export type Quote = { en: string; vi: string; by: string };
export type DailyWord = { word: string; ipa: string; pos: string; vi: string; example: string; exampleVi: string };

export const QUOTES: Quote[] = [
  { en: "It always seems impossible until it's done.", vi: "Mọi thứ luôn có vẻ bất khả thi cho đến khi hoàn thành.", by: "Nelson Mandela" },
  { en: "The expert in anything was once a beginner.", vi: "Chuyên gia nào cũng từng là người mới bắt đầu.", by: "Helen Hayes" },
  { en: "Learning never exhausts the mind.", vi: "Học tập không bao giờ làm cạn kiệt trí óc.", by: "Leonardo da Vinci" },
  { en: "Do what you can, with what you have, where you are.", vi: "Hãy làm điều bạn có thể, với những gì bạn có, ở nơi bạn đang đứng.", by: "Theodore Roosevelt" },
  { en: "Small steps every day add up to big results.", vi: "Những bước nhỏ mỗi ngày cộng lại thành kết quả lớn.", by: "Proverb" },
  { en: "Success is the sum of small efforts repeated day in and day out.", vi: "Thành công là tổng của những nỗ lực nhỏ lặp lại ngày này qua ngày khác.", by: "Robert Collier" },
  { en: "You don't have to be great to start, but you have to start to be great.", vi: "Bạn không cần giỏi mới bắt đầu, nhưng phải bắt đầu mới giỏi được.", by: "Zig Ziglar" },
  { en: "The beautiful thing about learning is that no one can take it away from you.", vi: "Điều đẹp nhất của việc học là không ai lấy đi được nó khỏi bạn.", by: "B.B. King" },
  { en: "Mistakes are proof that you are trying.", vi: "Sai lầm là bằng chứng bạn đang cố gắng.", by: "Proverb" },
  { en: "A journey of a thousand miles begins with a single step.", vi: "Hành trình ngàn dặm bắt đầu từ một bước chân.", by: "Lao Tzu" },
  { en: "Fall seven times, stand up eight.", vi: "Ngã bảy lần, đứng dậy tám lần.", by: "Japanese proverb" },
  { en: "Consistency beats intensity.", vi: "Đều đặn thắng cường độ.", by: "Proverb" },
  { en: "The more that you read, the more things you will know.", vi: "Càng đọc nhiều, bạn càng biết nhiều điều.", by: "Dr. Seuss" },
  { en: "Language is the road map of a culture.", vi: "Ngôn ngữ là tấm bản đồ của một nền văn hoá.", by: "Rita Mae Brown" },
  { en: "Progress, not perfection.", vi: "Tiến bộ, không cần hoàn hảo.", by: "Proverb" },
  { en: "Believe you can and you're halfway there.", vi: "Tin rằng mình làm được là bạn đã đi được nửa đường.", by: "Theodore Roosevelt" },
  { en: "Don't watch the clock; do what it does. Keep going.", vi: "Đừng nhìn đồng hồ; hãy làm như nó: cứ tiếp tục.", by: "Sam Levenson" },
  { en: "With the new day comes new strength and new thoughts.", vi: "Ngày mới mang đến sức mạnh và ý nghĩ mới.", by: "Eleanor Roosevelt" },
  { en: "Practice makes progress.", vi: "Luyện tập tạo nên tiến bộ.", by: "Proverb" },
  { en: "Discipline is choosing between what you want now and what you want most.", vi: "Kỷ luật là chọn giữa điều bạn muốn bây giờ và điều bạn muốn nhất.", by: "Abraham Lincoln" },
  { en: "Every accomplishment starts with the decision to try.", vi: "Mọi thành tựu bắt đầu từ quyết định thử.", by: "Proverb" },
  { en: "Your limitation is only your imagination.", vi: "Giới hạn của bạn chỉ là trí tưởng tượng.", by: "Proverb" },
  { en: "Energy and persistence conquer all things.", vi: "Năng lượng và sự kiên trì chinh phục mọi thứ.", by: "Benjamin Franklin" },
  { en: "Education is the passport to the future.", vi: "Giáo dục là tấm hộ chiếu đến tương lai.", by: "Malcolm X" },
  { en: "Start where you are. Use what you have.", vi: "Bắt đầu từ chỗ bạn đứng. Dùng những gì bạn có.", by: "Arthur Ashe" },
  { en: "One day or day one. You decide.", vi: "Một ngày nào đó hay ngày đầu tiên. Bạn quyết định.", by: "Proverb" },
  { en: "Dream big, work hard, stay focused.", vi: "Mơ lớn, làm chăm chỉ, giữ tập trung.", by: "Proverb" },
  { en: "Patience is bitter, but its fruit is sweet.", vi: "Kiên nhẫn thì đắng, nhưng quả của nó ngọt.", by: "Aristotle" },
  { en: "The only way to do great work is to love what you do.", vi: "Cách duy nhất để làm việc tuyệt vời là yêu điều mình làm.", by: "Steve Jobs" },
  { en: "Be patient with yourself. Nothing in nature blooms all year.", vi: "Hãy kiên nhẫn với bản thân. Không gì trong tự nhiên nở hoa quanh năm.", by: "Proverb" },
];

export const WORDS: DailyWord[] = [
  { word: "meticulous", ipa: "/məˈtɪkjələs/", pos: "adj", vi: "tỉ mỉ, kỹ lưỡng", example: "She is meticulous about checking every detail.", exampleVi: "Cô ấy rất tỉ mỉ trong việc kiểm tra từng chi tiết." },
  { word: "resilient", ipa: "/rɪˈzɪliənt/", pos: "adj", vi: "kiên cường, mau phục hồi", example: "Children are often more resilient than we think.", exampleVi: "Trẻ em thường kiên cường hơn ta nghĩ." },
  { word: "mitigate", ipa: "/ˈmɪtɪɡeɪt/", pos: "v", vi: "giảm nhẹ, làm dịu bớt", example: "Trees help mitigate the effects of climate change.", exampleVi: "Cây xanh giúp giảm nhẹ tác động của biến đổi khí hậu." },
  { word: "substantial", ipa: "/səbˈstænʃl/", pos: "adj", vi: "đáng kể, lớn", example: "There has been a substantial increase in sales.", exampleVi: "Doanh số đã tăng đáng kể." },
  { word: "advocate", ipa: "/ˈædvəkeɪt/", pos: "v", vi: "ủng hộ, chủ trương", example: "Many experts advocate a balanced diet.", exampleVi: "Nhiều chuyên gia ủng hộ chế độ ăn cân bằng." },
  { word: "inevitable", ipa: "/ɪnˈevɪtəbl/", pos: "adj", vi: "không thể tránh khỏi", example: "Change is inevitable in any growing city.", exampleVi: "Thay đổi là điều không tránh khỏi ở mọi thành phố đang phát triển." },
  { word: "flourish", ipa: "/ˈflʌrɪʃ/", pos: "v", vi: "phát triển mạnh, hưng thịnh", example: "Small businesses flourish in supportive communities.", exampleVi: "Doanh nghiệp nhỏ phát triển mạnh trong cộng đồng biết hỗ trợ." },
  { word: "controversial", ipa: "/ˌkɒntrəˈvɜːʃl/", pos: "adj", vi: "gây tranh cãi", example: "The new policy is highly controversial.", exampleVi: "Chính sách mới gây nhiều tranh cãi." },
  { word: "alleviate", ipa: "/əˈliːvieɪt/", pos: "v", vi: "làm giảm (đau, khó khăn)", example: "Better public transport could alleviate traffic.", exampleVi: "Giao thông công cộng tốt hơn có thể giảm ùn tắc." },
  { word: "perspective", ipa: "/pərˈspektɪv/", pos: "n", vi: "góc nhìn, quan điểm", example: "Travel gives you a fresh perspective on life.", exampleVi: "Du lịch cho bạn một góc nhìn mới về cuộc sống." },
  { word: "sustainable", ipa: "/səˈsteɪnəbl/", pos: "adj", vi: "bền vững", example: "We need sustainable sources of energy.", exampleVi: "Chúng ta cần các nguồn năng lượng bền vững." },
  { word: "elaborate", ipa: "/ɪˈlæbərət/", pos: "v", vi: "giải thích chi tiết, làm rõ", example: "Could you elaborate on your second point?", exampleVi: "Bạn có thể nói rõ hơn về ý thứ hai không?" },
  { word: "prevalent", ipa: "/ˈprevələnt/", pos: "adj", vi: "phổ biến, thịnh hành", example: "Stress is prevalent among university students.", exampleVi: "Căng thẳng phổ biến ở sinh viên đại học." },
  { word: "compelling", ipa: "/kəmˈpelɪŋ/", pos: "adj", vi: "thuyết phục, hấp dẫn", example: "She made a compelling argument for change.", exampleVi: "Cô ấy đưa ra lập luận thuyết phục cho sự thay đổi." },
  { word: "deteriorate", ipa: "/dɪˈtɪəriəreɪt/", pos: "v", vi: "xấu đi, suy giảm", example: "Air quality has deteriorated in recent years.", exampleVi: "Chất lượng không khí đã xấu đi những năm gần đây." },
  { word: "versatile", ipa: "/ˈvɜːsətaɪl/", pos: "adj", vi: "đa năng, linh hoạt", example: "Rice is a versatile ingredient.", exampleVi: "Gạo là nguyên liệu đa năng." },
  { word: "scrutinize", ipa: "/ˈskruːtənaɪz/", pos: "v", vi: "xem xét kỹ lưỡng", example: "Researchers scrutinize every data point.", exampleVi: "Các nhà nghiên cứu xem xét kỹ từng số liệu." },
  { word: "enhance", ipa: "/ɪnˈhɑːns/", pos: "v", vi: "nâng cao, cải thiện", example: "Reading daily can enhance your vocabulary.", exampleVi: "Đọc mỗi ngày có thể nâng cao vốn từ." },
  { word: "reluctant", ipa: "/rɪˈlʌktənt/", pos: "adj", vi: "miễn cưỡng, ngần ngại", example: "He was reluctant to speak in public.", exampleVi: "Anh ấy ngần ngại nói trước đám đông." },
  { word: "consecutive", ipa: "/kənˈsekjətɪv/", pos: "adj", vi: "liên tiếp", example: "She studied for thirty consecutive days.", exampleVi: "Cô ấy học ba mươi ngày liên tiếp." },
  { word: "foster", ipa: "/ˈfɒstə/", pos: "v", vi: "nuôi dưỡng, thúc đẩy", example: "Schools should foster creativity.", exampleVi: "Trường học nên nuôi dưỡng sự sáng tạo." },
  { word: "ambiguous", ipa: "/æmˈbɪɡjuəs/", pos: "adj", vi: "mơ hồ, nhập nhằng", example: "The question was ambiguous, so I asked again.", exampleVi: "Câu hỏi mơ hồ nên tôi hỏi lại." },
  { word: "indispensable", ipa: "/ˌɪndɪˈspensəbl/", pos: "adj", vi: "không thể thiếu", example: "A dictionary is indispensable for learners.", exampleVi: "Từ điển là thứ không thể thiếu với người học." },
  { word: "mundane", ipa: "/mʌnˈdeɪn/", pos: "adj", vi: "tẻ nhạt, bình thường", example: "Even mundane tasks can teach you something.", exampleVi: "Ngay cả việc tẻ nhạt cũng dạy bạn điều gì đó." },
  { word: "thrive", ipa: "/θraɪv/", pos: "v", vi: "phát đạt, lớn mạnh", example: "Some students thrive under pressure.", exampleVi: "Một số học sinh phát huy tốt khi chịu áp lực." },
  { word: "negligible", ipa: "/ˈneɡlɪdʒəbl/", pos: "adj", vi: "không đáng kể", example: "The difference in cost was negligible.", exampleVi: "Chênh lệch chi phí không đáng kể." },
  { word: "cultivate", ipa: "/ˈkʌltɪveɪt/", pos: "v", vi: "trau dồi, vun đắp", example: "Cultivate good habits early.", exampleVi: "Hãy vun đắp thói quen tốt từ sớm." },
  { word: "coherent", ipa: "/kəʊˈhɪərənt/", pos: "adj", vi: "mạch lạc, chặt chẽ", example: "Write a coherent essay with clear paragraphs.", exampleVi: "Viết bài luận mạch lạc với các đoạn rõ ràng." },
  { word: "endeavour", ipa: "/ɪnˈdevə/", pos: "n/v", vi: "nỗ lực, cố gắng", example: "We endeavour to improve every day.", exampleVi: "Chúng tôi nỗ lực cải thiện mỗi ngày." },
  { word: "phenomenon", ipa: "/fəˈnɒmɪnən/", pos: "n", vi: "hiện tượng", example: "Remote work is a global phenomenon.", exampleVi: "Làm việc từ xa là một hiện tượng toàn cầu." },
];

export function dayOfYear(d = new Date()): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000);
}
export const quoteOfDay = (d = new Date()) => QUOTES[dayOfYear(d) % QUOTES.length];
export const wordOfDay = (d = new Date()) => WORDS[(dayOfYear(d) * 7) % WORDS.length];
