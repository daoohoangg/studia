"""Dựng Studia Reel 01 thành MP4 theo từng khung hình (xác định, không ghi màn hình thời gian thực).

Cách chạy (từ bất kỳ đâu):
    python brand/video/reel-01/render.py            # dựng đủ 738 khung + âm thanh -> out/studia-reel-01.mp4
    python brand/video/reel-01/render.py --frames 0,345,732 --png DIR   # chỉ chụp vài khung để xem thử

Cần: Python 3.12, playwright (dùng Chrome có sẵn, channel="chrome"), Pillow, numpy, imageio-ffmpeg, edge-tts.
"""
import argparse
import io
import os
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
FPS, N_FRAMES, W, H = 30, 738, 1080, 1920
sys.stdout.reconfigure(encoding="utf-8")


def ffmpeg_exe() -> str:
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def open_page(p):
    browser = p.chromium.launch(channel="chrome", headless=True, args=["--font-render-hinting=none", "--disable-lcd-text"])
    page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
    page.goto((HERE / "reel.html").as_uri())
    report = page.evaluate("window.ready")
    return browser, page, report


def shoot(page, i: int) -> bytes:
    page.evaluate(f"window.render({i}/{FPS})")
    return page.screenshot(type="png", clip={"x": 0, "y": 0, "width": W, "height": H}, animations="disabled", caret="hide")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", help="danh sách khung cách nhau bằng dấu phẩy (chế độ xem thử)")
    ap.add_argument("--png", help="thư mục lưu PNG ở chế độ xem thử")
    ap.add_argument("--no-audio", action="store_true")
    args = ap.parse_args()

    with sync_playwright() as p:
        browser, page, report = open_page(p)
        print("init report:", report, flush=True)

        if args.frames:
            outdir = Path(args.png or (OUT / "preview"))
            outdir.mkdir(parents=True, exist_ok=True)
            for f in [int(x) for x in args.frames.split(",")]:
                (outdir / f"f{f:04d}.png").write_bytes(shoot(page, f))
            print("saved", outdir)
            browser.close()
            return

        OUT.mkdir(parents=True, exist_ok=True)
        ff = ffmpeg_exe()
        silent = OUT / "_video_only.mp4"
        cmd = [ff, "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "png", "-i", "-",
               "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "slow",
               "-r", str(FPS), "-movflags", "+faststart", str(silent)]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        t0 = time.time()
        cover = None
        for i in range(N_FRAMES):
            png = shoot(page, i)
            if i == 732:
                cover = png
            proc.stdin.write(png)
            if i % 60 == 0:
                print(f"frame {i}/{N_FRAMES}  {time.time() - t0:.1f}s", flush=True)
        proc.stdin.close()
        proc.wait()
        browser.close()
        print(f"frames done in {time.time() - t0:.1f}s", flush=True)
        (OUT / "cover.png").write_bytes(cover)

    final = OUT / "studia-reel-01.mp4"
    if args.no_audio:
        os.replace(silent, final)
    else:
        wav = OUT / "_audio.wav"
        subprocess.check_call([sys.executable, str(HERE / "voice.py"), "--wav", str(wav)])  # nhạc + hiệu ứng + lồng tiếng
        subprocess.check_call([ff, "-y", "-loglevel", "error", "-i", str(silent), "-i", str(wav),
                               "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                               "-shortest", "-movflags", "+faststart", str(final)])
        silent.unlink(missing_ok=True)
        wav.unlink(missing_ok=True)
    print("done:", final, f"{final.stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
