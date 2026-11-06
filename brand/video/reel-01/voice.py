"""Lồng tiếng giọng nữ cho Reel 01.

    python brand/video/reel-01/voice.py            # tạo giọng, trộn với nhạc/hiệu ứng, ghép vào out/studia-reel-01.mp4
    python brand/video/reel-01/voice.py --wav F    # chỉ xuất track âm thanh đã trộn ra F (render.py dùng)
    python brand/video/reel-01/voice.py --engine edge   # dùng giọng dự phòng Microsoft Hoài My

Giọng chính: Gemini TTS đọc LIỀN MỘT HƠI cả bài theo ghi chú đạo diễn (ngắt nghỉ, cảm xúc, nhấn từng câu),
rồi cắt tại khoảng lặng giữa các câu và đặt từng câu vào đúng cảnh. Giữ được mạch ngữ điệu tự nhiên.
Khoá lấy từ biến môi trường GEMINI_API_KEY hoặc backend/.env. Dự phòng: edge-tts (vi-VN-HoaiMyNeural).
Cần: numpy, imageio-ffmpeg (+ edge-tts nếu dùng dự phòng). Có mạng.
Giọng tạo ra được lưu đệm trong out/voice/ theo nội dung câu; sửa câu thoại thì chỉ câu đó được tạo lại.
Gemini mỗi lần đọc hơi khác nhau: muốn nghe bản khác của một câu thì xoá file đệm của câu đó.
"""
import argparse
import asyncio
import base64
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
OUT = HERE / "out"
CACHE = OUT / "voice"
SR = 48000
DUR = 24.6
sys.stdout.reconfigure(encoding="utf-8")

ENGINE = "gemini"
# gemini-3.8-flash-tts (30/10/2026) hay tự bịa thêm lời và ngắt nghỉ bất thường, nên không dùng.
GEMINI_MODELS = ["gemini-2.5-flash-preview-tts"]
# Giọng nữ trẻ. Thử thêm: "Achernar" (mềm), "Sulafat" (ấm), "Aoede" (thoáng), "Vindemiatrix" (dịu).
GEMINI_VOICE = "Leda"
TAKES = 3          # tối đa số bản đọc liền một hơi; chọn bản đúng lời và vừa khung cảnh nhất
VERIFY = True      # nhờ Gemini chép lại từng bản đọc, loại bản đọc sai/thêm lời
CHECK_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-flash-latest"]
MAX_TEMPO = 1.10   # tăng tốc tối đa cả bản đọc nếu tràn quá cuối video
# Edge (dự phòng, đọc từng câu): để mặc định, nâng cao độ nhân tạo làm giọng giống robot.
EDGE_VOICE, RATE, PITCH = "vi-VN-HoaiMyNeural", "+0%", "+0Hz"

# (bắt đầu cảnh, kết thúc muộn nhất, câu đọc có dấu ngắt/thẻ cảm xúc, ghi chú diễn) — khớp 8 cảnh của kịch bản.
# "…" = ngừng ~0,4 s, "—" = lấy hơi ngắn. Câu dài hơn khung được phép lấn sang cảnh sau một chút.
LINES = [
    (0.15, 2.25, "Tải về rồi… để đó hả?",
     "teasing a friend, knowing smile; small hesitation after 'rồi'; the question 'hả?' rises playfully"),
    (2.40, 4.60, "Ba trăm trang… [sigh] học từ đâu đây?",
     "overwhelmed, a soft sigh, then a genuinely puzzled question; stress 'đâu'"),
    (4.85, 8.00, "Thả vào Studia nè — trang nào xong, là học liền.",
     "brighten up suddenly, excited like sharing a secret; stress 'Studia' and 'liền'"),
    (8.25, 11.00, "Sách thành bài học… mỗi ngày một chút.",
     "calm and reassuring, slower; stress 'mỗi ngày', gentle falling end"),
    (11.30, 15.20, "Flashcard từ chính cuốn sách — nhắc bạn ôn… đúng lúc sắp quên.",
     "clear and friendly, a little proud; tiny pause before 'đúng lúc'; stress 'sắp quên'"),
    (15.45, 18.50, "Làm quiz nhỏ — nhớ lâu hơn hẳn.",
     "light and quick, playful; stress 'lâu'"),
    (18.75, 21.70, "Học đều mỗi ngày… lửa Coal cháy to!",
     "energy builds up, proud and cheering; stress 'cháy to' with a lift"),
    (21.95, 24.45, "[laughs softly] Cuốn đầu tiên… miễn phí nha!",
     "warm smile, softer and tender; stress 'miễn phí'; 'nha' sweet and affectionate"),
]

PROMPT = """# AUDIO PROFILE: Linh, cô bạn học cùng
Female, about 22, from Hà Nội. Native northern Vietnamese accent. Sweet, warm, bright voice with a smile in it.

## THE SCENE
Voice-over for a 25-second Instagram Reel for a Vietnamese IELTS study app called Studia (say it "Xtu-đi-a"). Linh talks to a close friend who keeps downloading PDF books and never opening them. She teases gently, then gets excited showing the app, and ends warm and inviting.

### DIRECTOR'S NOTES
Style: intimate and conversational, like a voice message to a best friend. NOT a news anchor, NOT a TV-ad announcer, no sing-song reading.
Intonation: natural northern Vietnamese melody with real pitch movement and correct tones; questions rise, exclamations lift, statements settle down.
Pacing: brisk social-media pace, never dragging; the whole transcript must take about 20 seconds. Honour the punctuation: "…" is a short real pause (about 0.3 s), "—" is a quick breath. Between lines (each line is on its own line) stay completely silent for a full 1.5 seconds, much longer than any pause inside a line; this silence will be edited out.
Pronunciation: "Studia" = "Xtu-đi-a". "Coal" is the mascot's name, said like the English word "coal" (Côl), never "khô". "Flashcard" and "quiz" in English.
STRICT: read the transcript EXACTLY, word for word, in order, exactly 8 lines. Do NOT add, change, repeat, or improvise any words or extra sentences.
Emotion per line:
{notes}
Do not read these notes or any bracketed tag aloud; perform them.

#### TRANSCRIPT
{lines}"""


def build_prompt() -> str:
    notes = "\n".join(f"{i + 1}. {n}" for i, (_, _, _, n) in enumerate(LINES))
    return PROMPT.format(notes=notes, lines="\n".join(t for _, _, t, _ in LINES))


def ffmpeg() -> str:
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


async def _edge(text: str, path: Path):
    import edge_tts
    await edge_tts.Communicate(text, EDGE_VOICE, rate=RATE, pitch=PITCH).save(str(path))


def gemini_key() -> str:
    if os.environ.get("GEMINI_API_KEY"):
        return os.environ["GEMINI_API_KEY"]
    for line in (REPO / "backend" / ".env").read_text(encoding="utf-8").splitlines():
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip().strip("'\"")
    raise SystemExit("Không tìm thấy GEMINI_API_KEY (biến môi trường hoặc backend/.env)")


def _gemini(prompt: str, path: Path) -> str:
    """Gọi Gemini TTS, ghi WAV 24 kHz. Trả về tên model đã dùng."""
    last = None
    for model in GEMINI_MODELS:
        body = {"contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"responseModalities": ["AUDIO"],
                                     "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": GEMINI_VOICE}}}}}
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": gemini_key()})
        for attempt in range(6):
            try:
                r = json.load(urllib.request.urlopen(req, timeout=180))
                pcm = base64.b64decode(r["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
                with wave.open(str(path), "wb") as w:  # Gemini trả PCM 16-bit mono 24 kHz
                    w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm)
                return model
            except urllib.error.HTTPError as e:
                last = e
                if e.code in (400, 403, 404):
                    print(f"  {model}: lỗi {e.code}, chuyển model khác", flush=True)
                    break
                wait = 20 + attempt * 10
                print(f"  {model}: lỗi {e.code}, chờ {wait}s rồi thử lại…", flush=True)
                time.sleep(wait)
            except (TimeoutError, OSError, KeyError) as e:
                last = e
                print(f"  {model}: {type(e).__name__}, thử lại…", flush=True)
                time.sleep(10)
    raise SystemExit(f"Gemini TTS không tạo được giọng: {last}")


def decode(path: Path, tempo: float = 1.0) -> np.ndarray:
    """mp3 -> float32 mono 48 kHz (tuỳ chọn tăng tốc không đổi cao độ)."""
    af = ["-af", f"atempo={tempo:.4f}"] if abs(tempo - 1) > 1e-3 else []
    raw = subprocess.check_output([ffmpeg(), "-loglevel", "error", "-i", str(path), *af,
                                   "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"])
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def trim(x: np.ndarray, thr=0.01, pad=0.03) -> np.ndarray:
    idx = np.where(np.abs(x) > thr)[0]
    if not len(idx):
        return x
    p = int(pad * SR)
    return x[max(0, idx[0] - p): idx[-1] + p]


def rms_frames(x: np.ndarray, hop: int):
    n = len(x) // hop
    return np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(axis=1) + 1e-12)


def split_take(x: np.ndarray, n_parts: int):
    """Cắt một bản đọc liền thành n đoạn tại các khoảng lặng giữa câu.
    Chọn ranh giới bằng quy hoạch động: ưu tiên khoảng lặng dài và gần vị trí dự kiến (theo độ dài chữ)."""
    hop = int(0.01 * SR)
    e = rms_frames(x, hop)
    loud = e > e.max() * 0.04
    idx = np.where(loud)[0]
    s0, s1 = idx[0], idx[-1]
    gaps, run = [], None  # (giữa, độ dài) theo giây
    for i in range(s0, s1 + 1):
        if not loud[i] and run is None:
            run = i
        elif loud[i] and run is not None:
            if i - run >= 8:
                gaps.append(((run + i) / 2 * hop / SR, (i - run) * hop / SR))
            run = None
    chars = np.array([len(t.split("]")[-1]) for _, _, t, _ in LINES], dtype=float)
    span0, span1 = s0 * hop / SR, s1 * hop / SR
    expect = span0 + np.cumsum(chars)[:-1] / chars.sum() * (span1 - span0)
    k, G = n_parts - 1, len(gaps)
    if G < k:
        raise ValueError(f"chỉ thấy {G} khoảng lặng, cần {k}")

    def score(j, b):
        return 3 * gaps[j][1] - 0.25 * abs(gaps[j][0] - expect[b])  # ưu tiên khoảng lặng dài (nghỉ giữa câu)

    NEG = -1e9
    dp = np.full((k, G), NEG)
    back = np.zeros((k, G), dtype=int)
    for j in range(G):
        dp[0, j] = score(j, 0)
    for b in range(1, k):
        for j in range(b, G):
            prev = dp[b - 1, :j]
            jj = int(np.argmax(prev))
            if prev[jj] > NEG / 2:
                dp[b, j] = prev[jj] + score(j, b)
                back[b, j] = jj
    j = int(np.argmax(dp[k - 1]))
    cuts = []
    for b in range(k - 1, -1, -1):
        cuts.append(gaps[j][0])
        j = back[b, j]
    cuts = [max(0.0, span0 - 0.05)] + sorted(cuts) + [span1 + 0.1]
    return [trim(x[int(a * SR): int(b * SR)]) for a, b in zip(cuts, cuts[1:])]


def _norm(t: str):
    import re
    import unicodedata
    t = re.sub(r"\[[^\]]*\]", " ", t.lower())
    t = unicodedata.normalize("NFC", t)
    return re.findall(r"[0-9a-zà-ỹđ]+", t)


def verify_take(src: Path) -> tuple[bool, str]:
    """Nhờ Gemini chép lại bản đọc, so với kịch bản. Kết quả lưu cạnh file để khỏi gọi lại."""
    import difflib
    memo = src.with_suffix(".check.json")
    if memo.exists():
        d = json.loads(memo.read_text(encoding="utf-8"))
        return d["ok"], d["why"]
    body = {"contents": [{"parts": [
        {"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(src.read_bytes()).decode()}},
        {"text": "Transcribe this Vietnamese audio exactly, word for word, in Vietnamese with diacritics. "
                 "Write numbers as Vietnamese words. Output only the transcript text, nothing else."}]}]}
    heard = None
    for model in CHECK_MODELS * 2:
        req = urllib.request.Request(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            data=json.dumps(body).encode(), headers={"Content-Type": "application/json", "x-goog-api-key": gemini_key()})
        try:
            r = json.load(urllib.request.urlopen(req, timeout=120))
            heard = r["candidates"][0]["content"]["parts"][0]["text"]
            break
        except (urllib.error.HTTPError, TimeoutError, OSError, KeyError) as e:
            print(f"  kiểm tra bằng {model}: {getattr(e, 'code', type(e).__name__)}", flush=True)
            time.sleep(5)
    if heard is None:
        return True, "không kiểm tra được (dịch vụ bận) — cần nghe lại bằng tai"
    want = _norm(" ".join(t for _, _, t, _ in LINES))
    got = _norm(heard)
    ratio = difflib.SequenceMatcher(None, want, got).ratio()
    extra = len(got) - len(want)
    ok = ratio >= 0.85 and extra <= 3
    why = f"giống kịch bản {ratio:.0%}, thừa {extra} từ. Nghe được: {heard.strip()}"
    memo.write_text(json.dumps({"ok": ok, "why": why}, ensure_ascii=False), encoding="utf-8")
    return ok, why


def place(parts):
    """Đặt từng đoạn ở đầu cảnh; đoạn dài được lấn sang cảnh sau, đoạn sau lùi lại ít nhất 0,12 s."""
    starts, t_prev = [], 0.0
    for (start, _, _, _), x in zip(LINES, parts):
        t = max(start, t_prev + 0.12) if starts else start
        starts.append(t)
        t_prev = t + len(x) / SR
    return starts, t_prev


def gemini_track():
    CACHE.mkdir(parents=True, exist_ok=True)
    prompt = build_prompt()
    best = None
    for n in range(TAKES):
        key = hashlib.sha1(f"{GEMINI_MODELS}|{GEMINI_VOICE}|{prompt}|{n}".encode()).hexdigest()[:12]
        src = CACHE / f"take-{key}.wav"
        if not src.exists():
            print(f"  tạo bản đọc {n + 1}/{TAKES}…", flush=True)
            print(f"  model: {_gemini(prompt, src)}", flush=True)
        if VERIFY:
            ok, why = verify_take(src)
            print(f"  bản {n + 1}: {'ĐÚNG LỜI' if ok else 'LOẠI'} — {why}", flush=True)
            if not ok:
                continue
        try:
            parts = split_take(decode(src), len(LINES))
        except ValueError as e:
            print(f"  bản {n + 1}: không cắt được ({e})")
            continue
        starts, end = place(parts)
        drift = sum(max(0, s - l[0]) for s, l in zip(starts, LINES))
        lens = " ".join(f"{len(p) / SR:.1f}" for p in parts)
        print(f"  bản {n + 1} ({src.name}): các câu dài [{lens}]s, kết thúc {end:.2f}s, lệch cảnh tổng {drift:.2f}s")
        if end > 24.5 * MAX_TEMPO + 0.5:
            print(f"  bản {n + 1}: LOẠI — quá dài so với video")
            continue
        cost = drift + 5 * max(0, end - 24.5)
        if best is None or cost < best[0]:
            best = (cost, src, n)
        if end <= 24.5 and drift < 1.5:
            break  # đủ tốt, khỏi tạo thêm bản
    if best is None:
        raise SystemExit("Không bản đọc nào đạt (sai lời hoặc không cắt được 8 câu); xoá out/voice/take-*.wav và chạy lại.")
    _, src, n = best
    tempo = 1.0
    for _ in range(4):
        parts = split_take(decode(src, tempo), len(LINES))
        starts, end = place(parts)
        if end <= 24.5 or tempo >= MAX_TEMPO:
            break
        tempo = min(MAX_TEMPO, tempo * (end - LINES[0][0]) / (24.5 - LINES[0][0]) * 1.01)
    if end > DUR - 0.1:
        raise SystemExit(f"Bản đọc tốt nhất vẫn kết thúc ở {end:.2f}s (> {DUR - 0.1:.1f}s). "
                         "Không ghép để giữ nguyên video cũ. Rút gọn lời trong LINES rồi chạy lại.")
    print(f"  chọn bản {n + 1}" + (f", tăng tốc {tempo:.2f}x" if tempo > 1.001 else ""))
    return parts, starts


def edge_parts():
    CACHE.mkdir(parents=True, exist_ok=True)
    parts = []
    for _, _, text, _ in LINES:
        plain = text.split("]")[-1].strip()
        key = hashlib.sha1(f"{EDGE_VOICE}|{RATE}|{PITCH}|{plain}".encode()).hexdigest()[:12]
        src = CACHE / f"{key}.mp3"
        if not src.exists():
            asyncio.run(_edge(plain, src))
        parts.append(trim(decode(src)))
    return parts, place(parts)[0]


def voice_track() -> np.ndarray:
    parts, starts = gemini_track() if ENGINE == "gemini" else edge_parts()
    v = np.zeros(int(round(DUR * SR)), dtype=np.float32)
    for (start, end, text, _), x, t in zip(LINES, parts, starts):
        i = int(t * SR)
        x = x[: max(0, len(v) - i)].copy()
        fade = min(len(x), int(0.012 * SR))
        x[:fade] *= np.linspace(0, 1, fade)
        x[-fade:] *= np.linspace(1, 0, fade)
        v[i:i + len(x)] += x
        print(f"  {t:5.2f}–{t + len(x) / SR:5.2f}s (cảnh {start:5.2f}–{end:5.2f}) {text}")
    peak = np.abs(v).max() or 1
    return v / peak * 10 ** (-3 / 20)          # giọng: đỉnh −3 dBFS


def read_wav(path: Path) -> np.ndarray:
    with wave.open(str(path)) as w:
        ch, n = w.getnchannels(), w.getnframes()
        a = np.frombuffer(w.readframes(n), dtype=np.int16).astype(np.float32) / 32768
    return a.reshape(-1, ch)


def mixed(bed_wav: Path) -> np.ndarray:
    """Trộn nền (nhạc + hiệu ứng từ audio.py) với giọng; nền tự hạ ~8 dB khi có tiếng nói."""
    bed = read_wav(bed_wav)
    v = voice_track()
    n = min(len(bed), len(v))
    bed, v = bed[:n], v[:n]
    # đường bao giọng -> hệ số hạ nền, mượt (bắt 60 ms, nhả 300 ms)
    env = np.abs(v)
    win = int(0.02 * SR)
    env = np.convolve(env, np.ones(win) / win, mode="same")
    talking = (env > 0.01).astype(np.float32)
    duck = np.empty_like(talking)
    a_att, a_rel = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.30 * SR))
    g = 0.0
    for i, t in enumerate(talking):
        a = a_att if t > g else a_rel
        g = a * g + (1 - a) * t
        duck[i] = g
    gain = 1 - duck * (1 - 10 ** (-8 / 20))
    out = bed * gain[:, None] + v[:, None]
    peak = np.abs(out).max()
    if peak > 10 ** (-1 / 20):
        out *= 10 ** (-1 / 20) / peak
    return out


def write_wav(path: Path, a: np.ndarray):
    with wave.open(str(path), "wb") as w:
        w.setnchannels(a.shape[1])
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes())


def build(out_wav: Path):
    with tempfile.TemporaryDirectory() as td:
        bed = Path(td) / "bed.wav"
        subprocess.check_call([sys.executable, str(HERE / "audio.py"), str(bed)])
        write_wav(out_wav, mixed(bed))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wav", help="chỉ xuất track âm thanh đã trộn ra file này")
    ap.add_argument("--engine", choices=["gemini", "edge"], default=ENGINE)
    args = ap.parse_args()
    globals()["ENGINE"] = args.engine
    if args.wav:
        build(Path(args.wav))
        return
    video = OUT / "studia-reel-01.mp4"
    tmp_wav, tmp_mp4 = OUT / "_voice_mix.wav", OUT / "_with_voice.mp4"
    build(tmp_wav)
    subprocess.check_call([ffmpeg(), "-y", "-loglevel", "error", "-i", str(video), "-i", str(tmp_wav),
                           "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                           "-shortest", "-movflags", "+faststart", str(tmp_mp4)])
    os.replace(tmp_mp4, video)
    tmp_wav.unlink(missing_ok=True)
    print("done:", video, f"{video.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
