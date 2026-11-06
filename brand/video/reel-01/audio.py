"""Tổng hợp track âm thanh cho Studia Reel 01 bằng numpy (không dùng file âm thanh ngoài, không nhạc có bản quyền).

    python audio.py out.wav

Gồm: hiệu ứng đúng mốc giờ trong bảng mục 6 của kịch bản + một vòng marimba tự soạn 100 BPM có kick nhẹ (−18 dB).
Đỉnh tổng khoảng −6 dBFS. 48 kHz, 16-bit, stereo.
"""
import sys
import wave

import numpy as np

SR = 48000
DUR = 24.6
N = int(round(DUR * SR))
rng = np.random.default_rng(20261030)  # cố định để mỗi lần dựng giống hệt nhau


def tt(d):
    return np.arange(int(d * SR)) / SR


def env_ad(n, a=0.003, d=0.1):
    t = np.arange(n) / SR
    e = np.minimum(1.0, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d)
    return e


def add(buf, sig, at, gain=1.0):
    i = int(round(at * SR))
    j = min(len(buf), i + len(sig))
    if j > i:
        buf[i:j] += sig[: j - i] * gain


def svf_bandpass(x, f_start, f_end, q=1.2):
    """Bộ lọc thông dải biến tần (state-variable), tần số quét theo hàm mũ."""
    n = len(x)
    f = f_start * (f_end / f_start) ** (np.arange(n) / max(1, n - 1))
    g = 2 * np.sin(np.pi * np.minimum(f, SR / 6) / SR)
    damp = 1.0 / q
    low = band = 0.0
    out = np.empty(n)
    for k in range(n):
        high = x[k] - low - damp * band
        band += g[k] * high
        low += g[k] * band
        out[k] = band
    return out


def lowpass(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    out = np.empty_like(x)
    y = 0.0
    for k in range(len(x)):
        y = (1 - a) * x[k] + a * y
        out[k] = y
    return out


def norm(x):
    m = np.max(np.abs(x))
    return x / m if m > 0 else x


# ---------------- hiệu ứng ----------------
def whoosh(d=0.25, f0=300, f1=3200):
    n = int(d * SR)
    x = rng.standard_normal(n)
    y = svf_bandpass(x, f0, f1, q=1.6)
    t = np.arange(n) / n
    e = np.sin(np.pi * t) ** 1.5
    return norm(y * e)


def tick(freq):
    t = tt(0.035)
    return np.sin(2 * np.pi * freq * t) * env_ad(len(t), 0.001, 0.008)


def rustle():
    n = int(0.13 * SR)
    x = rng.standard_normal(n)
    y = x - lowpass(x, 1800)              # thông cao: tiếng giấy
    crackle = (rng.random(n) < 0.02) * rng.standard_normal(n) * 3
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.01) * np.exp(-t / 0.05)
    return norm((y + crackle) * e)


def pop(f0=600, f1=900, d=0.08):
    t = tt(d)
    f = f0 + (f1 - f0) * (t / d)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env_ad(len(t), 0.002, d / 3)


def thud(f=120, d=0.12):
    t = tt(d)
    fr = f * (1 + 0.6 * np.exp(-t / 0.02))
    ph = 2 * np.pi * np.cumsum(fr) / SR
    return np.sin(ph) * env_ad(len(t), 0.002, 0.045)


def ting(f=1320, d=0.3):
    t = tt(d + 0.1)
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / 0.05)
    return s * env_ad(len(t), 0.002, d / 3)


def flap():
    n = int(0.12 * SR)
    x = rng.standard_normal(n)
    y = lowpass(x, 2500)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.004) * np.exp(-t / 0.03)
    out = norm(y * e)
    th = thud(160, 0.08)
    out[: len(th)] += 0.4 * th
    return out


def click():
    t = tt(0.03)
    s = np.sin(2 * np.pi * 2200 * t) * env_ad(len(t), 0.0005, 0.004)
    n = rng.standard_normal(len(t)) * env_ad(len(t), 0.0005, 0.002)
    return s + 0.5 * n


def note(f, d=0.22):
    t = tt(d + 0.15)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t / 0.08)
    return s * env_ad(len(t), 0.003, d / 2.5)


def burst():
    n = int(0.4 * SR)
    x = rng.standard_normal(n)
    y = lowpass(lowpass(x, 900), 900)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.006) * np.exp(-t / 0.12)
    sub = np.sin(2 * np.pi * 80 * t * (1 + 0.5 * np.exp(-t / 0.05))) * np.exp(-t / 0.15)
    return 0.8 * norm(y * e) + 0.9 * sub


sfx = np.zeros(N)
# 0.0–1.1 tích tắc theo nhịp đếm 1→97 (OUT), cao dần
def out_ease_inv(y):  # gần đúng cubic-bezier(0.22,1,0.36,1): tìm t để ease(t)=y bằng chia đôi
    def ease(x):
        # bezier y theo x
        lo, hi = 0.0, 1.0
        for _ in range(40):
            s = (lo + hi) / 2
            bx = 3 * (1 - s) ** 2 * s * 0.22 + 3 * (1 - s) * s ** 2 * 0.36 + s ** 3
            if bx < x:
                lo = s
            else:
                hi = s
        s = (lo + hi) / 2
        return 3 * (1 - s) ** 2 * s * 1 + 3 * (1 - s) * s ** 2 * 1 + s ** 3
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        if ease(m) < y:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2

steps = [1, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88, 97]
for k, v in enumerate(steps):
    at = 1.1 * out_ease_inv((v - 1) / 96)
    add(sfx, tick(900 + 70 * k), at, 0.5)

for at in (2.0, 4.4, 7.8, 10.8, 15.0, 18.3):
    add(sfx, whoosh(), at, 0.45)
for k, at in enumerate((2.90, 3.05, 3.20, 3.35)):
    add(sfx, rustle(), at, 0.55 + 0.05 * k)
add(sfx, pop(), 2.40, 0.35)            # Coal "lost" xuất hiện (bổ sung nhẹ)
add(sfx, pop(), 4.75, 0.55)
add(sfx, thud(), 5.70, 0.8)
add(sfx, pop(700, 1050, 0.07), 5.75, 0.3)
add(sfx, ting(), 6.20, 0.4)
for at in (8.45, 8.60, 8.75):
    add(sfx, whoosh(0.16, 500, 2600), at, 0.28)
add(sfx, pop(520, 820), 9.10, 0.3)
add(sfx, pop(560, 860), 11.50, 0.3)
add(sfx, flap(), 12.80, 0.55)
add(sfx, click(), 14.20, 1.1)
add(sfx, click(), 16.60, 1.1)
add(sfx, note(659.25), 16.65, 0.35)
add(sfx, note(880.0, 0.35), 16.77, 0.38)
for k, at in enumerate((18.65, 19.10, 19.55, 20.00)):
    add(sfx, pop(500 + 120 * k, 800 + 160 * k), at, 0.5)
add(sfx, burst(), 20.45, 0.9)
add(sfx, whoosh(0.5, 200, 2400), 21.30, 0.55)
add(sfx, pop(600, 950), 21.85, 0.3)
add(sfx, ting(1568, 0.35), 22.30, 0.22)

# ---------------- nhạc nền: marimba 100 BPM ----------------
BEAT = 60 / 100


def marimba(f, d=0.45, vel=1.0):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 3.93 * t) * np.exp(-t / 0.03) \
        + 0.08 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t / 0.01)
    return vel * s * env_ad(len(t), 0.002, 0.16)


def kick():
    t = tt(0.25)
    f = 50 + 70 * np.exp(-t / 0.03)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * env_ad(len(t), 0.001, 0.09)


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


music = np.zeros(N)
# C – G – Am – F, mỗi hợp âm 1 ô nhịp (4 phách)
CHORDS = [(60, [0, 4, 7]), (55, [0, 4, 7]), (57, [0, 3, 7]), (53, [0, 4, 7])]
PATTERN = [0, 1, 2, 3, 2, 1, 3, 2]  # chỉ số nốt trong (gốc, 3, 5, quãng 8)
bar = 0
t0 = 0.0
while t0 < DUR:
    root, iv = CHORDS[bar % 4]
    tones = [root + iv[0], root + iv[1], root + iv[2], root + 12]
    for k, idx in enumerate(PATTERN):
        at = t0 + k * BEAT / 2
        if at < DUR:
            vel = 0.8 if k % 2 == 0 else 0.55
            add(music, marimba(mtof(tones[idx] + 12), vel=vel), at)
    add(music, marimba(mtof(root - 12), 0.8, 0.9), t0)              # bè trầm
    add(music, marimba(mtof(root - 12 + iv[2]), 0.8, 0.6), t0 + 2 * BEAT)
    for b in (0, 2):
        add(music, kick(), t0 + b * BEAT, 1.2)
    bar += 1
    t0 += 4 * BEAT

# nhỏ dần cuối (24.0–24.6) để khung kết đứng yên
fade = np.ones(N)
i0 = int(23.9 * SR)
fade[i0:] = np.linspace(1, 0, N - i0) ** 2
music *= fade

# ---------------- trộn ----------------
sfx = norm(sfx) * 10 ** (-6 / 20)                     # hiệu ứng: đỉnh −6 dBFS
music = norm(music) * 10 ** (-18 / 20)               # nhạc nền: đỉnh −18 dBFS
mix = sfx + music
peak = np.max(np.abs(mix))
lim = 10 ** (-6 / 20)
if peak > lim:
    mix *= lim / peak
mix[: int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))

pcm = np.stack([mix, mix], axis=1)  # stereo (hai kênh giống nhau)
pcm = np.clip(pcm * 32767, -32768, 32767).astype("<i2")

out = sys.argv[1] if len(sys.argv) > 1 else "audio.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {out}: {N / SR:.2f}s, peak {20 * np.log10(np.max(np.abs(mix)) + 1e-12):.1f} dBFS")
