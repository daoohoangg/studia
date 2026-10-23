"""Toàn vẹn dữ liệu các đề Cambridge dựng sẵn đang mở cho học viên.

Danh sách bộ đang mở nằm ở frontend/src/data/builtin_exams.json (cùng file mà sảnh /exam đọc).
Mở lại một bộ (vd C17) = thêm số vào `published_series`; test này phải đạt trước khi phát hành.
"""
import hashlib
import json
from itertools import combinations
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
DATA_DIR = REPO / "frontend" / "src" / "data"
REGISTRY = DATA_DIR / "builtin_exams.json"

# Các phần phải khác nhau giữa mọi cặp đề đang mở
UNIQUE_FIELDS = ("reading_passages", "reading", "listening", "writing_task1", "writing_task2", "listening_audio")

pytestmark = pytest.mark.skipif(not REGISTRY.exists(), reason="không có thư mục frontend (vd trong image backend)")


def _fingerprint(value) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()


def find_duplicates(tests: dict) -> list:
    """Trả về các cặp (đề A, đề B, trường) có nội dung trùng nhau."""
    dups = []
    for (a, da), (b, db) in combinations(sorted(tests.items()), 2):
        for field in UNIQUE_FIELDS:
            if da.get(field) is not None and _fingerprint(da.get(field)) == _fingerprint(db.get(field)):
                dups.append((a, b, field))
    return dups


def _published_tests() -> dict:
    series = json.loads(REGISTRY.read_text(encoding="utf-8"))["published_series"]
    out = {}
    for cam in series:
        for n in (1, 2, 3, 4):
            path = DATA_DIR / f"cambridge{cam}_test{n}.json"
            assert path.exists(), f"thiếu file dữ liệu {path.name} cho bộ đang mở C{cam}"
            out[path.stem] = json.loads(path.read_text(encoding="utf-8"))
    return out


def test_registry_is_valid():
    series = json.loads(REGISTRY.read_text(encoding="utf-8"))["published_series"]
    assert series, "phải có ít nhất một bộ đang mở"
    assert all(isinstance(x, int) for x in series)
    assert len(series) == len(set(series))


def test_published_tests_have_all_sections():
    for name, d in _published_tests().items():
        assert len(d.get("listening") or []) == 40, f"{name}: Listening không đủ 40 câu"
        assert len(d.get("reading") or []) == 40, f"{name}: Reading không đủ 40 câu"
        assert d.get("reading_passages"), f"{name}: thiếu bài đọc"
        assert (d.get("writing_task1") or "").strip(), f"{name}: thiếu Writing Task 1"
        assert (d.get("writing_task2") or "").strip(), f"{name}: thiếu Writing Task 2"
        assert d.get("listening_audio"), f"{name}: thiếu audio Listening"


def test_published_tests_do_not_share_content():
    dups = find_duplicates(_published_tests())
    assert not dups, "các đề đang mở trùng nội dung: " + ", ".join(f"{a}~{b}:{f}" for a, b, f in dups)


def test_find_duplicates_detects_copied_test():
    base = {"reading_passages": [{"title": "A"}], "listening": [{"number": 1}], "writing_task1": "x", "writing_task2": "y"}
    other = {"reading_passages": [{"title": "B"}], "listening": [{"number": 2}], "writing_task1": "z", "writing_task2": "w"}
    copy = dict(base, listening_audio="other.mp3")
    assert find_duplicates({"t1": base, "t2": other}) == []
    found = {f for _, _, f in find_duplicates({"t1": base, "t2": copy})}
    assert found == {"reading_passages", "listening", "writing_task1", "writing_task2"}


PUBLIC_DIR = REPO / "frontend" / "public"
# Chuỗi rác do OCR / header trang sách lẫn vào chữ đề Writing
WRITING_JUNK = ("WRITING WRITING", "TASK 1 WRITING", "WRITING TASK 1", "WRITING TASK 2", "TASK 2 WRITING", "Test 1 \n", "�")


# (đề, trường) còn rác OCR đã biết, chờ T39; xoá khỏi tập này khi đã làm sạch
PENDING_CLEANUP = {(f"cambridge21_test{n}", "writing_task2") for n in (1, 2, 3, 4)}


def _has_junk(text: str) -> list:
    import re
    found = [j for j in WRITING_JUNK if j in text]
    if re.search(r"(?m)^\s*Test\s*\d\s*$", text):
        found.append("dòng 'Test N' thừa")
    if re.search(r"(?m)^\s*WRITING\s*$", text):
        found.append("dòng 'WRITING' thừa")
    return found


def test_published_writing_task1_has_existing_image():
    for name, d in _published_tests().items():
        img = d.get("writing_task1_image")
        assert img, f"{name}: thiếu writing_task1_image (Task 1 cần biểu đồ/sơ đồ)"
        assert img.startswith("/") and ".." not in img, f"{name}: đường dẫn ảnh không hợp lệ: {img}"
        f = PUBLIC_DIR / img.lstrip("/")
        assert f.is_file(), f"{name}: ảnh {img} không tồn tại trong frontend/public"
        assert 5_000 < f.stat().st_size < 400_000, f"{name}: ảnh {img} quá nhỏ/lớn ({f.stat().st_size} byte)"


def test_published_writing_text_is_clean():
    for name, d in _published_tests().items():
        for field, minimum in (("writing_task1", 150), ("writing_task2", 250)):
            if (name, field) in PENDING_CLEANUP:
                continue
            text = d.get(field) or ""
            junk = _has_junk(text)
            assert not junk, f"{name}.{field} còn rác OCR/header: {junk}"
            assert f"Write at least {minimum} words" in text, f"{name}.{field}: thiếu câu 'Write at least {minimum} words'"
            declared = d.get(f"{field}_min_words")  # C21 chưa có trường này (frontend mặc định 150/250)
            assert declared in (None, minimum), f"{name}.{field}_min_words phải là {minimum}"


def test_has_junk_detects_ocr_noise():
    assert _has_junk("Test 1 \nWRITING \nTASK 2 You should spend")
    assert _has_junk("x\nWRITING\ny")
    assert _has_junk("The chart WRITING WRITING")
    assert not _has_junk("You should spend about 20 minutes on this task.\n\nThe chart below shows...")
