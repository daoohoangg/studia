/** Bộ câu luyện Phát âm có sẵn; quản lý có thể thay bằng bộ riêng ở Quản trị › Nội dung & thông báo. */
export type PronSentence = { group: string; text: string };

export const DEFAULT_SENTENCES: PronSentence[] = [
  { group: "Part 1 · Hometown", text: "I grew up in a small coastal town in central Vietnam." },
  { group: "Part 1 · Hometown", text: "What I like most is the slow pace of life." },
  { group: "Part 2 · A place you visited", text: "It was absolutely breathtaking, especially at sunrise." },
  { group: "Part 2 · A place you visited", text: "I'd recommend it to anyone who enjoys hiking." },
  { group: "Part 3 · Environment", text: "Governments should invest more in renewable energy." },
];
