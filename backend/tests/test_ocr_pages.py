import io
import os
import unittest
from unittest.mock import patch

from pypdf import PdfReader, PdfWriter

from app.api.v1 import documents
from app.services.doc_ingest import extract_blocks
from app.services.doc_ingest.pdf_extractor import extract_pdf_blocks
from test_ebook import EbookApiTestCase, build_docx
from test_uploads import LocalStoreTestCase, OTHER_USER

PNG_SIGNATURE = bytes([0x89]) + b"PNG"


class FakeOcr:
    """OCR giả: trả về lần lượt các văn bản đã định; `None` nghĩa là lần đọc đó lỗi."""

    def __init__(self, texts):
        self.texts = list(texts)
        self.calls = 0

    def read(self, png_bytes: bytes) -> str:
        assert png_bytes.startswith(PNG_SIGNATURE)
        self.calls += 1
        text = self.texts.pop(0)
        if text is None:
            raise RuntimeError("ocr down")
        return text


class OcrExtractionTests(LocalStoreTestCase):
    def pdf(self, name):
        with open(os.path.join(self.fixtures_dir.name, f"{name}.pdf"), "rb") as f:
            return f.read()

    def mixed_pdf(self):
        """Hai trang có chữ đầu của text_book + một trang scan ở cuối."""
        writer = PdfWriter()
        for page in PdfReader(io.BytesIO(self.pdf("text_book"))).pages[:2]:
            writer.add_page(page)
        writer.add_page(PdfReader(io.BytesIO(self.pdf("scanned"))).pages[0])
        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    def test_scanned_pages_are_read_by_ocr_in_page_order(self):
        ocr = FakeOcr(["# Field Notes on Tidal Pools\n\nA tidal pool is a small body of sea water.",
                       "## Recording Observations\n\n- Visit the same pool\n- Count the species"])
        blocks, pages, empty, ok = extract_pdf_blocks(self.pdf("scanned"), ocr=ocr, ocr_workers=1)
        self.assertEqual((pages, empty, ok, ocr.calls), (2, 2, 2, 2))
        self.assertEqual([(b["block_type"], b["level"], b["page_number"]) for b in blocks], [
            ("heading", 1, 1), ("paragraph", None, 1), ("heading", 2, 2), ("list_item", None, 2), ("list_item", None, 2),
        ])
        self.assertEqual(blocks[0]["text"], "Field Notes on Tidal Pools")

    def test_mixed_document_keeps_text_layer_and_inserts_ocr_page_in_order(self):
        ocr = FakeOcr(["# Scanned appendix\n\nText recovered by OCR."])
        blocks, pages, empty, ok = extract_pdf_blocks(self.mixed_pdf(), ocr=ocr, ocr_workers=1)
        self.assertEqual((pages, empty, ok, ocr.calls), (3, 1, 1, 1))  # chỉ trang scan được OCR
        page_order = [b["page_number"] for b in blocks]
        self.assertEqual(page_order, sorted(page_order))
        self.assertIn("Chapter 1: How Memory Works", [b["text"] for b in blocks])
        self.assertEqual([b["text"] for b in blocks if b["page_number"] == 3],
                         ["Scanned appendix", "Text recovered by OCR."])

    def test_failed_page_is_skipped_and_does_not_break_the_rest(self):
        ocr = FakeOcr([None, "Second page text that was read fine."])
        blocks, _, empty, ok = extract_pdf_blocks(self.pdf("scanned"), ocr=ocr, ocr_workers=1)
        self.assertEqual((empty, ok), (2, 1))
        self.assertEqual([b["page_number"] for b in blocks], [2])

    def test_without_ocr_empty_pages_are_reported_not_invented(self):
        result = extract_blocks(self.pdf("scanned"), "pdf")
        self.assertEqual((result.page_count, result.empty_pages, result.ocr_pages, result.blocks), (2, 2, 0, []))


class ProgressiveReadTests(LocalStoreTestCase):
    """Sách mở đọc được ngay: trang có chữ lưu trước, trang scan (OCR) lưu dần theo lô."""

    def test_text_pages_are_saved_before_ocr_and_order_is_by_page(self):
        from app.services import document_pipeline as dp

        writer = PdfWriter()
        with open(os.path.join(self.fixtures_dir.name, "text_book.pdf"), "rb") as f:
            for page in PdfReader(io.BytesIO(f.read())).pages[:2]:
                writer.add_page(page)
        with open(os.path.join(self.fixtures_dir.name, "scanned.pdf"), "rb") as f:
            writer.add_page(PdfReader(io.BytesIO(f.read())).pages[0])
        out = io.BytesIO()
        writer.write(out)

        seen = {}

        class SpyOcr(FakeOcr):
            def read(inner, png):
                # Khi OCR bắt đầu, hai trang có chữ phải đã nằm trong kho
                seen["blocks_at_ocr"] = len(self.store.table("document_blocks").select("id").eq("document_id", "d1").execute().data)
                return super().read(png)

        saved = dp._extract_pdf_progressively(self.store, "d1", out.getvalue(), SpyOcr(["# Scanned appendix" + chr(10) * 2 + "Recovered by OCR."]))
        self.assertGreater(seen["blocks_at_ocr"], 0)
        pages = [r["page_number"] for r in saved]
        self.assertEqual(pages, sorted(pages))
        self.assertEqual(pages[-1], 3)
        orders = [r["order_index"] for r in saved]
        self.assertEqual(orders, sorted(orders))


class ScannedUploadTests(LocalStoreTestCase):
    def upload_scanned(self):
        with open(os.path.join(self.fixtures_dir.name, "scanned.pdf"), "rb") as f:
            return self.upload(f.read(), filename="scan.pdf")

    def test_scanned_pdf_rejected_when_ocr_not_configured(self):
        with patch.object(documents, "get_ocr_provider", return_value=None):
            res = self.upload_scanned()
        self.assertEqual(res.status_code, 422)
        self.assertIn("OCR", res.json()["detail"])
        self.assertEqual(self.rows("documents"), [])

    def test_scanned_pdf_accepted_when_ocr_is_available(self):
        with patch.object(documents, "get_ocr_provider", return_value=FakeOcr([])), \
                patch.object(documents, "process_uploaded_file") as background:
            res = self.upload_scanned()
        self.assertEqual(res.status_code, 200)
        background.assert_called_once()


class PageImageTests(EbookApiTestCase):
    def test_page_image_is_a_png_of_the_original_page(self):
        doc_id = self.upload_book()
        res = self.client.get(f"/api/v1/documents/{doc_id}/pages/2/image")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "image/png")
        self.assertTrue(res.content.startswith(PNG_SIGNATURE))
        small = self.client.get(f"/api/v1/documents/{doc_id}/pages/2/image", params={"scale": 0.5}).content
        self.assertLess(len(small), len(res.content))

    def test_page_image_errors(self):
        doc_id = self.upload_book()
        self.assertEqual(self.client.get(f"/api/v1/documents/{doc_id}/pages/99/image").status_code, 404)
        self.assertEqual(self.client.get(f"/api/v1/documents/{doc_id}/pages/0/image").status_code, 404)

        docx_id = self.upload(build_docx(), filename="lesson.docx").json()["document_id"]
        self.assertEqual(self.client.get(f"/api/v1/documents/{docx_id}/pages/1/image").status_code, 404)

        foreign = self.upload_book(user_id=OTHER_USER)
        self.assertEqual(self.client.get(f"/api/v1/documents/{foreign}/pages/1/image").status_code, 404)


if __name__ == "__main__":
    unittest.main()
