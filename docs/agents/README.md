# Kiến trúc đa agent của Studia

```
                    Người dùng
                        │  yêu cầu / duyệt
                        ▼
              ┌───────────────────┐
              │  PM (lead agent)  │  lập kế hoạch, chia việc, theo dõi
              │  .claude/agents/  │  tiến độ, nghiệm thu, báo cáo
              │      pm.md        │  ghi docs/agents/PROGRESS.md
              └────────┬──────────┘
          brief giao việc│ ▲ tóm tắt + báo cáo
             ┌───────────┴─┴──────────┐
             ▼                        ▼
   ┌──────────────────┐     ┌──────────────────┐
   │  SA + QA         │     │  UX Senior       │
   │  sa.md           │◄───►│  ux.md           │
   │  code, hạ tầng,  │ qua │  painpoint, giải │
   │  chi phí, đa nền │ PM  │  pháp, tiêu chí  │
   │  tảng, test      │     │  chấp nhận, test │
   └──────────────────┘     │  trải nghiệm     │
                            └──────────────────┘
```

## Vai trò
| Agent | Được làm | Không được làm |
|---|---|---|
| **PM** | Gọi `sa`, `ux`; đọc code; ghi `docs/agents/**` | Viết code tính năng; deploy/commit/tốn tiền khi chưa hỏi người dùng |
| **SA** | Sửa code, chạy test, đo hiệu năng, ước tính chi phí | Deploy production, migration Supabase thật, commit/push khi chưa được duyệt |
| **UX** | Đọc code, chạy thử trên trình duyệt, ghi báo cáo | Sửa mã nguồn ứng dụng, đăng nhập/thanh toán thật |

## Luồng chuẩn cho một yêu cầu
1. PM làm rõ mục tiêu, tiêu chí "xong".
2. **Song song**: UX tìm painpoint + tiêu chí chấp nhận; SA đánh giá hiện trạng kỹ thuật, rủi ro, chi phí.
3. PM gộp thành task trong `PROGRESS.md`.
4. SA triển khai + test. Hai task chạy song song không được đụng cùng file.
5. UX nghiệm thu trên bản chạy thử; SA nộp bằng chứng test.
6. PM cập nhật tiến độ và báo người dùng.

## Cách chạy
Một subagent không gọi được subagent khác, nên muốn PM tự điều phối thì PM phải là **phiên chính**:

```bash
claude --agent pm
```

Các cách khác:
- Trong phiên bình thường, gọi thẳng từng agent: "dùng agent ux đánh giá luồng làm đề trên mobile", "dùng agent sa tối ưu chi phí EC2".
- Gọi `pm` như subagent: PM sẽ trả về kế hoạch điều phối kèm brief cho từng agent, phiên chính giao tiếp.
- Đặt PM làm mặc định cho mọi phiên trong repo: thêm `"agent": "pm"` vào `.claude/settings.json`.

## Ví dụ yêu cầu
- "PM: chuẩn bị phát hành bản mobile, kiểm tra toàn bộ luồng thi thử và thanh toán."
- "PM: giảm chi phí hạ tầng hàng tháng nhưng không làm chậm trải nghiệm."
- "PM: học viên phàn nàn chấm Writing lâu, xử lý giúp."

## Thư mục
- `.claude/agents/pm.md`, `sa.md`, `ux.md` — định nghĩa agent.
- `docs/agents/PROGRESS.md` — bảng tiến độ (PM quản lý).
- `docs/agents/reports/` — báo cáo của SA và UX, đặt tên `<YYYY-MM-DD>-<agent>-<chủ-đề>.md`.
