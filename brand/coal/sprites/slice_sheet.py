"""Cắt bảng minh hoạ Coal (coal-sheet.webp, lưới 5x5) thành 25 tư thế WebP trong suốt cho frontend/public/coal.

Chạy:  python brand/coal/sprites/slice_sheet.py
Cần: Pillow, numpy. Nếu thay bảng ảnh mới có bố cục khác, chỉnh ROWS/COLS/NAMES bên dưới
(ROWS = vùng dọc chứa nhân vật của từng hàng, không gồm nhãn chữ; COLS = ranh giới giữa các cột).
"""
import os
from collections import deque

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "coal-sheet.webp")
OUT = os.path.join(HERE, "..", "..", "..", "frontend", "public", "coal") + os.sep
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert("RGB")
A = np.asarray(im).astype(np.int32)
BG = np.array([246, 244, 235])

# vùng chứa nhân vật của từng hàng (không gồm nhãn chữ) và ranh giới giữa các cột
ROWS = [(36, 244), (276, 492), (536, 710), (750, 924), (958, 1142)]
COLS = [(0, 270), (270, 520), (520, 776), (776, 1035), (1035, 1312)]
NAMES = [
    ["happy-alt", "smile", "excited", "love-alt", "cheer-alt"],
    ["fire0", "fire1", "fire2", "fire3", "fire4"],
    ["wet0", "wet1", "wet2", "wet3", "wet4"],
    ["hello", "happy", "cheer", "love", "focus"],
    ["surprised", "sleepy", "sad", "lost", "fireM"],
]
T_BG = 26       # sai khác tối đa so với màu nền để coi là nền
RING = 3        # độ rộng dải viền được làm mịn


def flood(near: np.ndarray) -> np.ndarray:
    """Các điểm 'gần màu nền' nối liền với mép ảnh."""
    h, w = near.shape
    seen = np.zeros_like(near, dtype=bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not seen[y, x]:
                seen[y, x] = True; dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not seen[y, x]:
                seen[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; dq.append((ny, nx))
    return seen


def dilate(m: np.ndarray, r: int) -> np.ndarray:
    out = m.copy()
    for _ in range(r):
        p = np.pad(out, 1)
        out = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
    return out


def cutout(rgb: np.ndarray) -> np.ndarray:
    """RGB -> RGBA: nền trong suốt, bóng đổ mờ giữ nửa trong suốt, viền không còn quầng kem."""
    dist = np.abs(rgb - BG).max(axis=2)
    region = flood(dist <= T_BG)                 # nền thật sự nối với mép
    ring = dilate(region, RING) & ~region        # dải viền quanh nhân vật
    h, w = dist.shape
    alpha = np.ones((h, w), dtype=np.float32)
    color = rgb.astype(np.float32).copy()

    # 1) vùng nền: alpha theo độ lệch so với nền (bóng đổ mờ vẫn còn một chút)
    a_bg = np.clip(dist / 90.0, 0, 1)
    a_bg = np.where(dist <= 5, 0.0, a_bg)
    alpha[region] = a_bg[region]
    dark = np.array([60, 58, 72], dtype=np.float32)   # bóng đổ: màu xám tím đậm
    color[region] = dark

    # 2) dải viền: ước lượng màu nhân vật gần nhất (điểm xa nền nhất trong cửa sổ 7x7 ngoài vùng nền)
    pad = 3
    P = np.pad(rgb.astype(np.float32), ((pad, pad), (pad, pad), (0, 0)), mode="edge")
    PD = np.pad(np.where(region, -1, dist).astype(np.float32), pad, constant_values=-1)
    best = np.full((h, w), -1.0, dtype=np.float32)
    fg = np.zeros((h, w, 3), dtype=np.float32)
    for dy in range(-pad, pad + 1):
        for dx in range(-pad, pad + 1):
            d = PD[pad + dy:pad + dy + h, pad + dx:pad + dx + w]
            c = P[pad + dy:pad + dy + h, pad + dx:pad + dx + w]
            upd = d > best
            best = np.where(upd, d, best)
            fg = np.where(upd[..., None], c, fg)
    v = rgb.astype(np.float32) - BG
    f = fg - BG
    denom = (f * f).sum(axis=2) + 1e-6
    a_ring = np.clip((v * f).sum(axis=2) / denom, 0, 1)
    nofg = best < 30                               # không có màu nhân vật gần đó: coi như nền (bóng đổ mờ)
    alpha[ring] = np.where(nofg, a_bg, a_ring)[ring]
    color[ring] = np.where(nofg[..., None], dark, fg)[ring]

    out = np.dstack([np.clip(color, 0, 255), alpha * 255]).astype(np.uint8)
    return despeckle(out)


def despeckle(rgba: np.ndarray) -> np.ndarray:
    """Bỏ các cụm điểm nhỏ, xám, rời rạc (tàn dư bóng đổ); giữ họa tiết màu như tia sáng, trái tim, giọt nước."""
    al = rgba[..., 3]
    solid = al > 40
    h, w = solid.shape
    seen = np.zeros_like(solid)
    for y0 in range(h):
        for x0 in range(w):
            if not solid[y0, x0] or seen[y0, x0]:
                continue
            comp = []
            dq = deque([(y0, x0)])
            seen[y0, x0] = True
            while dq:
                y, x = dq.popleft()
                comp.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < h and 0 <= nx < w and solid[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            dq.append((ny, nx))
            if len(comp) >= 260:
                continue
            ys = np.array([c[0] for c in comp]); xs = np.array([c[1] for c in comp])
            px = rgba[ys, xs, :3].astype(np.float32)
            mx = px.max(axis=1); mn = px.min(axis=1)
            sat = np.mean((mx - mn) / np.maximum(mx, 1))
            if sat < 0.3:
                rgba[ys, xs, 3] = 0
    return rgba


sprites = {}
for r, (y0, y1) in enumerate(ROWS):
    for c, (x0, x1) in enumerate(COLS):
        name = NAMES[r][c]
        crop = A[y0:y1, x0:x1]
        rgba = cutout(crop)
        al = rgba[..., 3]
        ys, xs = np.where(al > 24)
        sprites[name] = (rgba, xs.min(), xs.max(), ys.min(), ys.max())

# khung chung: cùng cỡ cho mọi nhân vật, đáy (bóng đổ) thẳng hàng, căn giữa theo bounding box
MAXW = max(s[2] - s[1] + 1 for s in sprites.values())
MAXH = max(s[4] - s[3] + 1 for s in sprites.values())
CW, CH = MAXW + 16, MAXH + 14
print("canvas", CW, CH, "max sprite", MAXW, MAXH)

for name, (rgba, x0, x1, y0, y1) in sprites.items():
    cutimg = Image.fromarray(rgba[y0:y1 + 1, x0:x1 + 1], "RGBA")
    canvas = Image.new("RGBA", (CW, CH), (0, 0, 0, 0))
    ox = (CW - cutimg.width) // 2
    oy = CH - cutimg.height - 6
    canvas.paste(cutimg, (ox, oy), cutimg)
    canvas.save(OUT + name + ".webp", "WEBP", quality=92, alpha_quality=100, method=6)
    print(name, cutimg.size, os.path.getsize(OUT + name + ".webp"))

# bảng xem thử trên nền sáng và nền tối
names = [n for row in NAMES for n in row]
cols = 5
sheet = Image.new("RGB", (CW * cols, CH * 5 * 2 // 1), (246, 244, 235))
sheet = Image.new("RGB", (CW * cols, CH * 5), (246, 244, 235))
for i, n in enumerate(names):
    sp = Image.open(OUT + n + ".webp").convert("RGBA")
    bgc = (246, 244, 235) if (i // cols) % 2 == 0 else (11, 16, 34)
    tile = Image.new("RGB", (CW, CH), bgc)
    tile.paste(sp, (0, 0), sp)
    sheet.paste(tile, ((i % cols) * CW, (i // cols) * CH))
sheet.save(os.path.join(HERE, "sprite_check.png"))
print("done")
