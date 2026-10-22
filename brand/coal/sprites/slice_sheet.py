"""Cắt bảng minh hoạ Coal (coal-sheet.webp, lưới 5x5) thành 25 tư thế WebP trong suốt cho frontend/public/coal.

Chạy:  python brand/coal/sprites/slice_sheet.py
Cần: Pillow, numpy. Nếu thay bảng ảnh mới có bố cục khác, chỉnh ROWS/COLS/NAMES bên dưới
(ROWS = vùng dọc chứa nhân vật của từng hàng, không gồm nhãn chữ; COLS = ranh giới giữa các cột).
"""
import os
from collections import deque

import numpy as np
from PIL import Image, ImageFilter

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


SCALE = 3


def refine(img, scale=SCALE):
    """RGBA 1x -> RGBA phóng lớn `scale` lần, viền sắc: bỏ quầng xám ở rìa, giữ bóng đổ mềm dưới chân."""
    w, h = img.size
    a = np.asarray(img).astype(np.float32)
    # phóng lớn trên ảnh nhân alpha để rìa trong suốt không kéo màu đen vào viền
    pm = a[..., :3] * (a[..., 3:4] / 255.0)
    big = lambda arr, mode: np.asarray(Image.fromarray(arr).resize((w * scale, h * scale), mode)).astype(np.float32)
    pmb = np.stack([big(np.clip(pm[..., i], 0, 255).astype(np.uint8), Image.LANCZOS) for i in range(3)], axis=2)
    al = big(a[..., 3].astype(np.uint8), Image.LANCZOS) / 255.0
    al = np.clip(al, 0, 1)

    solid = al >= 0.92
    # khoảng cách tới phần đặc (xấp xỉ bằng dilate lặp)
    ring_px = 2 * scale
    near = solid.copy()
    reach = np.zeros(al.shape, dtype=np.int32)
    cur = solid.copy()
    for i in range(1, ring_px + 1):
        p = np.pad(cur, 1)
        nxt = p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1] | p[1:-1, :-2] | p[1:-1, 2:]
        reach[nxt & ~cur] = i
        cur = nxt
    in_ring = cur & ~solid                     # trong vòng 2px (ảnh gốc) quanh phần đặc

    # màu: phần đặc dùng màu thật; vùng viền lấy màu của điểm đặc gần nhất (hết quầng xám)
    col = np.where(al[..., None] > 1e-3, pmb / np.maximum(al[..., None], 1e-3), 0)
    col = np.clip(col, 0, 255)
    filled = solid.copy()
    cfill = np.where(solid[..., None], col, 0).astype(np.float32)
    for _ in range(ring_px):
        p = np.pad(filled, 1)
        cnt = np.zeros(al.shape, dtype=np.float32)
        acc = np.zeros(al.shape + (3,), dtype=np.float32)
        pc = np.pad(cfill, ((1, 1), (1, 1), (0, 0)))
        pf = np.pad(filled, 1)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            f = pf[1 + dy:1 + dy + al.shape[0], 1 + dx:1 + dx + al.shape[1]]
            c = pc[1 + dy:1 + dy + al.shape[0], 1 + dx:1 + dx + al.shape[1]]
            cnt += f
            acc += c * f[..., None]
        new = (~filled) & (cnt > 0)
        cfill = np.where(new[..., None], acc / np.maximum(cnt, 1)[..., None], cfill)
        filled |= new
    rgb = np.where(in_ring[..., None], cfill, col)

    # alpha: trong vòng viền, siết bằng smoothstep để rìa sắc; xa nhân vật (bóng đổ) giữ nguyên
    lo, hi = 0.45, 0.8
    t = np.clip((al - lo) / (hi - lo), 0, 1)
    t = t * t * (3 - 2 * t)
    out_a = np.where(in_ring, t, al)

    # làm mịn rìa nhẹ để không răng cưa
    out = np.dstack([np.clip(rgb, 0, 255), out_a * 255]).astype(np.uint8)
    im = Image.fromarray(out, "RGBA")
    r, g, b, aa = im.split()
    aa = aa.filter(ImageFilter.GaussianBlur(0.6))
    rgbim = Image.merge("RGB", (r, g, b)).filter(ImageFilter.UnsharpMask(radius=1.5, percent=60, threshold=2))
    rr, gg, bb = rgbim.split()
    return Image.merge("RGBA", (rr, gg, bb, aa))


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
    # phóng 3 lần và làm sắc viền: ảnh gốc nhỏ nên hiển thị lớn trên màn hình retina sẽ bị mờ rìa
    canvas = refine(canvas)
    canvas.save(OUT + name + ".webp", "WEBP", quality=90, alpha_quality=100, method=6)
    print(name, cutimg.size, os.path.getsize(OUT + name + ".webp"))

# bảng xem thử trên nền sáng và nền tối
names = [n for row in NAMES for n in row]
cols = 5
CWS, CHS = CW * SCALE, CH * SCALE
sheet = Image.new("RGB", (CWS * cols, CHS * 5), (246, 244, 235))
for i, n in enumerate(names):
    sp = Image.open(OUT + n + ".webp").convert("RGBA")
    bgc = (246, 244, 235) if (i // cols) % 2 == 0 else (11, 16, 34)
    tile = Image.new("RGB", (CWS, CHS), bgc)
    tile.paste(sp, (0, 0), sp)
    sheet.paste(tile, ((i % cols) * CWS, (i // cols) * CHS))
sheet.save(os.path.join(HERE, "sprite_check.png"))
print("done")
