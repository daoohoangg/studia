import type { Mood } from "@/components/mascot/Mascot";
import type { Streak } from "@/lib/schedule";

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

/** Số ngày liên tiếp gần nhất bị bỏ lỡ (tối đa 7, theo dải 7 ngày của API), không tính hôm nay. */
export function missedDays(s: Streak): number {
  const past = s.week.slice(0, -1);
  let n = 0;
  for (let i = past.length - 1; i >= 0 && !past[i].active; i--) n++;
  return past.length && n === past.length ? 7 : n;
}

/** Chọn tâm trạng + lời nhắn của linh vật theo chuỗi ngày học và giờ trong ngày. */
export function pickMood(s: Streak | null, hour = new Date().getHours()): { mood: Mood; line: string } {
  if (!s) return { mood: "hello", line: "Chào bạn! Mình là Tim, sẽ học cùng bạn mỗi ngày." };
  if (s.total_days === 0) return { mood: "hello", line: "Chào bạn mới! Hoàn thành một bài đầu tiên để mình bắt đầu đếm streak nhé." };

  if (s.today_done) {
    if (MILESTONES.includes(s.current)) return { mood: "cheer", line: `${s.current} ngày liên tiếp! Bạn thật sự quá đỉnh, ăn mừng nào!` };
    if (s.current >= 7) return { mood: "fire", line: `Chuỗi ${s.current} ngày đang cháy rực. Đừng để lửa tắt nha!` };
    return { mood: "happy", line: s.current > 1 ? `Hôm nay xong rồi, chuỗi ${s.current} ngày. Mình tự hào về bạn!` : "Bước đầu tiên hoàn thành. Mai mình học tiếp nhé!" };
  }
  if (s.at_risk) {
    return hour >= 20
      ? { mood: "worried", line: `Sắp hết ngày rồi mà chuỗi ${s.current} ngày chưa được giữ. Học 5 phút thôi cũng được!` }
      : { mood: "focus", line: `Chuỗi ${s.current} ngày đang chờ bạn. Làm một nhiệm vụ nhỏ để giữ lửa nhé!` };
  }
  const gap = missedDays(s);
  if (gap >= 7) return { mood: "lost", line: "Lâu quá không gặp, mình nhớ bạn. Quay lại học một chút nhé, không sao đâu." };
  if (gap >= 3) return { mood: "sad", line: `Bạn vắng ${gap} ngày rồi... Mình ổn, nhưng nhớ bạn lắm. Bắt đầu lại nhẹ nhàng nhé?` };
  return { mood: "sleepy", line: "Chuỗi bị đứt rồi, mình ngủ gật mất. Học hôm nay để bắt đầu chuỗi mới nhé!" };
}
