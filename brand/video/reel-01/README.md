# Reel 01: "Tải về rồi để đó"

Video hoạt hình 2D 1080×1920, 30 fps, 24,6 s (738 khung), dựng theo `docs/marketing/video/KICH_BAN_REEL_01.md`.

## Chạy lại (một lệnh, từ gốc repo)

```
python brand/video/reel-01/render.py
```

Kết quả: `brand/video/reel-01/out/studia-reel-01.mp4` và `out/cover.png` (khung 732 = 24,4 s). Mất khoảng 3–5 phút.

Xem thử vài khung (không dựng video):

```
python brand/video/reel-01/render.py --frames 0,345,732 --png <thư mục>
```

Thêm `--no-audio` nếu chỉ cần hình.

Chỉ sửa lời thoại / giọng (không dựng lại hình, khoảng 1 phút):

```
python brand/video/reel-01/voice.py
```

## Lồng tiếng

Giọng chính: **Gemini TTS** (`gemini-2.5-flash-preview-tts`, giọng nữ `Leda`). Cách làm để giọng có ngắt nghỉ, ngữ điệu, nhấn nhá tự nhiên:

1. Gemini đọc **liền một hơi cả bài** theo "ghi chú đạo diễn" trong `PROMPT` (nhân vật, bối cảnh, cảm xúc và từ cần nhấn của từng câu), nên ngữ điệu nối mạch như người thật. Dấu "…" là chỗ ngừng ngắn, "—" là lấy hơi, `[sigh]` / `[laughs softly]` là thở dài / cười khẽ.
2. Giữa hai câu dặn im lặng 1,5 s; script cắt bản đọc tại các khoảng lặng dài này thành 8 câu, bỏ khoảng lặng, rồi đặt mỗi câu vào đầu cảnh của nó (câu dài được lấn nhẹ sang cảnh sau).
3. Tạo tối đa 3 bản đọc. Mỗi bản được Gemini chép lại và so với kịch bản; bản thêm/sai lời bị loại. Chọn bản đúng lời và vừa khung nhất.
4. Nếu không bản nào vừa 24,6 s thì dừng, **không** ghi đè video cũ.

- Sửa lời / cảm xúc / chỗ nhấn: `LINES` ở đầu `voice.py`. Đổi giọng: `GEMINI_VOICE` (thử `Achernar`, `Sulafat`, `Aoede`, `Vindemiatrix`).
- Bản đọc và kết quả kiểm tra được lưu đệm ở `out/voice/` (`take-*.wav`, `take-*.check.json`). Muốn đọc lại từ đầu: xoá các file `take-*`.
- Không dùng `gemini-3.8-flash-tts`: khi thử (30/10/2026) nó tự bịa thêm cả đoạn lời và ngắt nghỉ bất thường.
- Gemini giới hạn số lượt gọi mỗi phút; gặp lỗi 429/503 script tự chờ rồi thử lại.
- Dự phòng không cần khoá: `python brand/video/reel-01/voice.py --engine edge` (Microsoft Hoài My, đọc từng câu, kém tự nhiên hơn).
- Nhạc nền + hiệu ứng tự hạ khoảng 8 dB khi có giọng nói.

## Cần gì

- Python 3.12, `playwright` (Python), `numpy`, `Pillow`, `edge-tts` (lồng tiếng, cần mạng), `imageio-ffmpeg` (`python -m pip install --user imageio-ffmpeg`; cung cấp ffmpeg, không cần cài riêng).
- Google Chrome đã cài (Playwright mở bằng `channel="chrome"`, không tải trình duyệt mới).
- Có mạng để tải Google Fonts (Bricolage Grotesque, Be Vietnam Pro, Literata).
- Ảnh Coal lấy trực tiếp từ `frontend/public/coal/*.webp`.

## Các tệp

| Tệp | Vai trò |
|---|---|
| `reel.html` | Toàn bộ cảnh. Mọi chuyển động là hàm thuần của thời gian: `window.render(t)` (giây). Easing tự viết (cubic-bezier), không dùng CSS animation. |
| `render.py` | Mở trang bằng Chrome headless, chờ font và ảnh, gọi `render(i/30)` cho từng khung, chụp PNG và pipe thẳng vào ffmpeg (libx264, CRF 18), rồi ghép âm thanh AAC 192k. |
| `voice.py` | Tạo giọng đọc, trộn với nền từ `audio.py` (hạ nền khi có giọng), ghép vào MP4. |
| `audio.py` | Tổng hợp âm thanh bằng numpy: hiệu ứng theo bảng mục 6 của kịch bản + vòng marimba tự soạn 100 BPM có kick nhẹ (−18 dB). Đỉnh tổng −6 dBFS. |

Muốn chỉnh thời điểm hoặc vị trí: sửa hàm `r1`…`r8` trong `reel.html` (mỗi hàm là một cảnh), rồi chạy lại lệnh trên.
