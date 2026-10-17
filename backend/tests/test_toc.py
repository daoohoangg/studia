import unittest

from app.services.doc_ingest.quality import page_quality
from app.services.doc_ingest.toc import build_toc, chapter_progress, detect_book_title, parse_contents_text


def make_blocks(spec):
    """spec: [(page, type, level, text)] → khối có id/order_index tăng dần."""
    return [
        {"id": f"b{i}", "order_index": float(i + 1), "page_number": page, "block_type": kind, "level": level, "text": text}
        for i, (page, kind, level, text) in enumerate(spec)
    ]


class ParseContentsTests(unittest.TestCase):
    def test_entries_with_numbers_in_titles(self):
        entries = parse_contents_text("Introduction 4 Test 1 10 Test 2 32 Audioscripts 97\nAnswer keys 117 Acknowledgements 144")
        self.assertEqual([(e["title"], e["printed_page"]) for e in entries], [
            ("Introduction", 4), ("Test 1", 10), ("Test 2", 32), ("Audioscripts", 97),
            ("Answer keys", 117), ("Acknowledgements", 144),
        ])

    def test_dot_leaders_and_trailing_folio(self):
        entries = parse_contents_text("Chapter 1 Basics ........ 7\nChapter 2 Grammar ........ 21\nIndex ..... 90\n3")
        self.assertEqual([(e["title"], e["printed_page"]) for e in entries],
                         [("Chapter 1 Basics", 7), ("Chapter 2 Grammar", 21), ("Index", 90)])

    def test_rejects_decreasing_page_numbers(self):
        entries = parse_contents_text("Part A 5 Part B 3 Part C 9")
        self.assertEqual([e["title"] for e in entries], ["Part A", "Part C"])


class BuildTocTests(unittest.TestCase):
    def book(self):
        return make_blocks([
            (1, "heading", 1, "My Study Guide"),
            (2, "heading", 1, "Contents"),
            (2, "paragraph", None, "Unit 1 Greetings 3 Unit 2 Travel 5 Unit 3 Food 7"),
            (3, "heading", 1, "Unit 1 Greetings"), (3, "paragraph", None, "hello"),
            (4, "paragraph", None, "more"),
            (5, "heading", 1, "Unit 2 Travel"), (5, "paragraph", None, "airport"),
            (6, "paragraph", None, "more"),
            (7, "heading", 1, "Unit 3 Food"), (7, "paragraph", None, "menu"),
        ])

    def test_contents_page_is_mapped_to_blocks(self):
        toc = build_toc(self.book())
        self.assertEqual(toc["source"], "contents")
        self.assertEqual([(e["title"], e["page"]) for e in toc["entries"]],
                         [("Unit 1 Greetings", 3), ("Unit 2 Travel", 5), ("Unit 3 Food", 7)])
        first, second, third = toc["entries"]
        self.assertEqual(first["end_order_index"], second["order_index"])
        self.assertEqual(second["end_order_index"], third["order_index"])

    def test_printed_pages_offset_to_pdf_pages(self):
        blocks = self.book()
        for b in blocks:
            if b["page_number"] >= 3:
                b["page_number"] += 2  # sách có 2 trang bìa/lời nói đầu: số in ≠ số trang PDF
        toc = build_toc(blocks)
        self.assertEqual([e["page"] for e in toc["entries"]], [5, 7, 9])

    def test_pdf_bookmarks_take_priority(self):
        toc = build_toc(self.book(), bookmarks=[{"title": "Part One", "level": 1, "page": 3}, {"title": "Part Two", "level": 1, "page": 6}])
        self.assertEqual((toc["source"], [e["title"] for e in toc["entries"]]), ("bookmarks", ["Part One", "Part Two"]))

    def test_falls_back_to_headings(self):
        blocks = make_blocks([(1, "heading", 1, "Alpha"), (1, "paragraph", None, "x"), (2, "heading", 2, "Beta"), (2, "paragraph", None, "y")])
        toc = build_toc(blocks)
        self.assertEqual((toc["source"], [e["title"] for e in toc["entries"]]), ("headings", ["Alpha", "Beta"]))

    def test_no_blocks(self):
        self.assertEqual(build_toc([]), {"source": "none", "entries": []})

    def test_chapter_progress_follows_reading_position(self):
        entries = build_toc(self.book())["entries"]
        position = entries[1]["order_index"] + (entries[1]["end_order_index"] - entries[1]["order_index"]) / 2
        self.assertEqual([chapter_progress(e, position) for e in entries], [100.0, 50.0, 0.0])
        self.assertEqual([chapter_progress(e, None) for e in entries], [0.0, 0.0, 0.0])

    def test_book_title_from_cover_heading(self):
        self.assertEqual(detect_book_title(self.book(), fallback="x.pdf"), "My Study Guide")
        self.assertEqual(detect_book_title(make_blocks([(1, "paragraph", None, "text")]), fallback="x"), "x")


class PageQualityTests(unittest.TestCase):
    def test_flags_noisy_sparse_table_and_blank_pages(self):
        good = "A normal paragraph of readable English text. " * 6
        blocks = make_blocks(
            [(1, "paragraph", None, good)]
            + [(2, "paragraph", None, "~|~  ~~ |~| 中文乱码 " * 4)]
            + [(3, "paragraph", None, "Fig 1")]
            + [(4, "paragraph", None, x) for x in ["A", "B", "C", "1", "2", "3", "yes", "no", "x", "y"]] + [(4, "paragraph", None, good)]
            + [(5, "paragraph", None, f"Fill in {n} ........ and {good}") for n in (1, 2, 3)]
        )
        flagged = {p["page"]: p["reasons"] for p in page_quality(blocks)}
        self.assertNotIn(1, flagged)
        self.assertIn("noisy", flagged[2])
        self.assertIn("sparse", flagged[3])
        self.assertIn("table", flagged[4])
        self.assertIn("blanks", flagged[5])


if __name__ == "__main__":
    unittest.main()
