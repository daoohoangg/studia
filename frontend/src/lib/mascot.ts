import { fireLevel, wetLevel, type Level, type Mood } from "@/components/mascot/Mascot";
import type { Streak } from "@/lib/schedule";

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

/** Số ngày liên tiếp gần nhất bị bỏ lỡ (tối đa 7, theo dải 7 ngày của API), không tính hôm nay. Dùng khi backend chưa trả days_since_active. */
export function missedDays(s: Streak): number {
  const past = s.week.slice(0, -1);
  let n = 0;
  for (let i = past.length - 1; i >= 0 && !past[i].active; i--) n++;
  return past.length && n === past.length ? 7 : n;
}

export type Pick = { mood: Mood; line: string; wet: Level; fire: Level };

/**
 * Chọn tâm trạng, lời nhắn và hai mức trạng thái của Coal theo streak:
 *  - streak dài thì Coal càng cháy (3, 7, 14, 30 ngày), 30 ngày trở lên là cháy cả người
 *  - bỏ học càng lâu thì Coal càng ướt cả người (1–2 ngày ướt nhẹ, 3–6 ướt rõ, 7–13 ướt sũng trong vũng nước, 14+ ngập nước), lửa tắt hẳn
 */
export function pickMood(s: Streak | null, hour = new Date().getHours()): Pick {
  if (!s) return { mood: "hello", wet: 0, fire: 0, line: "Chào bạn! Mình là Coal, cục than nhỏ muốn thành kim cương. Mình sẽ học cùng bạn mỗi ngày." };
  if (s.total_days === 0) return { mood: "hello", wet: 0, fire: 0, line: "Chào bạn mới! Hoàn thành một bài đầu tiên để mình bắt đầu đếm streak nhé." };

  const fire = fireLevel(s.current);

  if (s.today_done) {
    if (MILESTONES.includes(s.current)) {
      return { mood: "cheer", wet: 0, fire: Math.max(fire, 2) as Level, line: `${s.current} ngày liên tiếp! Mình nóng cả người rồi, bạn quá đỉnh, ăn mừng nào!` };
    }
    if (fire === 4) return { mood: "fire", wet: 0, fire, line: `Chuỗi ${s.current} ngày, mình cháy cả người luôn rồi! Cục than nào chịu nóng giỏi thế này sẽ thành kim cương đó.` };
    if (fire === 3) return { mood: "fire", wet: 0, fire, line: `Chuỗi ${s.current} ngày, lửa lan khắp người mình rồi. Bạn giữ lửa giỏi quá!` };
    if (fire === 2) return { mood: "fire", wet: 0, fire, line: `Chuỗi ${s.current} ngày đang cháy rực. Đừng để lửa tắt nha!` };
    if (fire === 1) return { mood: "happy", wet: 0, fire, line: `Hôm nay xong rồi, chuỗi ${s.current} ngày. Đầu mình bắt đầu bốc lửa rồi nè!` };
    return { mood: "happy", wet: 0, fire, line: s.current > 1 ? `Hôm nay xong rồi, chuỗi ${s.current} ngày. Mình tự hào về bạn!` : "Bước đầu tiên hoàn thành. Mai mình học tiếp nhé!" };
  }

  if (s.at_risk) {
    // Chuỗi vẫn còn đến hết ngày: lửa vẫn cháy, chỉ là Coal đang lo
    return hour >= 20
      ? { mood: "worried", wet: 0, fire, line: `Sắp hết ngày rồi mà chuỗi ${s.current} ngày chưa được giữ. Học 5 phút thôi cũng được, mình ngồi cạnh bạn!` }
      : { mood: "focus", wet: 0, fire, line: `Chuỗi ${s.current} ngày đang chờ bạn. Làm một nhiệm vụ nhỏ để giữ lửa nhé!` };
  }

  // Chuỗi đã đứt: càng lâu càng ướt
  const gap = s.days_since_active === undefined ? missedDays(s) : s.days_since_active;
  const wet = wetLevel(gap);
  if (wet >= 4) return { mood: "lost", wet, fire: 0, line: "Mình ngập nước, ướt sũng từ đầu đến chân rồi... nhưng mình vẫn ở đây chờ bạn. Quay lại học 5 phút thôi, mình sẽ khô dần." };
  if (wet === 3) return { mood: "lost", wet, fire: 0, line: "Lâu quá không gặp, mình ướt sũng và đứng trong vũng nước rồi. Quay lại học một chút nhé, không sao đâu." };
  if (wet === 2) return { mood: "sad", wet, fire: 0, line: `Bạn vắng ${gap} ngày rồi, mình ướt cả người và lửa tắt mất. Bắt đầu lại nhẹ nhàng nhé?` };
  return { mood: "sleepy", wet: wet || 1, fire: 0, line: "Chuỗi bị đứt rồi, mình ngủ gật, người ươn ướt. Học hôm nay để mình khô và bắt đầu chuỗi mới nhé!" };
}
