import io
import unittest
from unittest.mock import Mock, patch

from app.config import settings
from app.services import document_pipeline
from app.services.rag_engine import RAGEngine
from test_ebook import EbookApiTestCase, build_docx
from test_uploads import OTHER_USER


def fake_embeddings(texts):
    return [[0.25, 0.5, 0.75, 1.0] for _ in texts]


class ChunkBlocksTests(unittest.TestCase):
    def blocks(self):
        return [
            {"id": "h1", "block_type": "heading", "level": 1, "text": "Chapter One", "page_number": 1},
            {"id": "h2", "block_type": "heading", "level": 2, "text": "1.1 Basics", "page_number": 1},
            {"id": "p1", "block_type": "paragraph", "text": "Alpha is the first letter. " * 6, "page_number": 1},
            {"id": "p2", "block_type": "paragraph", "text": "Beta follows alpha closely. " * 6, "page_number": 2},
            {"id": "h3", "block_type": "heading", "level": 2, "text": "1.2 More", "page_number": 2},
            {"id": "p3", "block_type": "paragraph", "text": "**Gamma** comes third in order. " * 5, "page_number": 2},
        ]

    def test_chunks_carry_source_pages_headings_and_hash(self):
        chunks = RAGEngine.chunk_blocks(self.blocks())
        self.assertEqual([c["chunk_index"] for c in chunks], list(range(len(chunks))))
        first = chunks[0]
        self.assertTrue(first["content"].startswith("Chapter One\n1.1 Basics\nAlpha"))
        self.assertEqual(first["heading_path"], ["Chapter One", "1.1 Basics"])
        self.assertEqual(first["page_start"], 1)
        self.assertIn("h1", first["block_ids"])
        self.assertTrue(all(len(c["content_hash"]) == 40 for c in chunks))
        self.assertNotIn("**", " ".join(c["content"] for c in chunks))
        last = chunks[-1]
        self.assertEqual(last["heading_path"], ["Chapter One", "1.2 More"])
        self.assertEqual(last["block_ids"][-1], "p3")

    def test_chunk_does_not_cross_headings_and_respects_size(self):
        chunks = RAGEngine.chunk_blocks(self.blocks(), chunk_size=300)
        self.assertTrue(all(len(c["content"]) <= 600 for c in chunks))
        for chunk in chunks:
            self.assertLessEqual(sum(1 for t in ("1.1 Basics", "1.2 More") if t in chunk["content"]), 1)

    def test_editing_one_block_changes_only_its_chunk(self):
        before = RAGEngine.chunk_blocks(self.blocks())
        edited = self.blocks()
        edited[3]["text"] = "Beta was changed."
        after = RAGEngine.chunk_blocks(edited)
        self.assertEqual(len(before), len(after))
        changed = [i for i, (a, b) in enumerate(zip(before, after)) if a["content_hash"] != b["content_hash"]]
        self.assertEqual(len(changed), 1)


class ReindexTests(EbookApiTestCase):
    def setUp(self):
        super().setUp()
        self.doc_id = self.upload_book()
        self.embed = Mock(side_effect=fake_embeddings)
        p = patch.object(document_pipeline.RAGEngine, "generate_embeddings", self.embed)
        p.start()
        self.addCleanup(p.stop)
        self.url = f"/api/v1/documents/{self.doc_id}"

    def status(self):
        return self.client.get(f"{self.url}/index-status").json()

    def reindex(self):
        res = self.client.post(f"{self.url}/reindex")
        self.assertEqual(res.status_code, 200, res.text)
        return res.json()

    def chunks(self):
        return sorted(self.rows("document_chunks"), key=lambda r: r["chunk_index"])

    def test_first_reindex_embeds_everything_then_nothing_is_stale(self):
        self.assertTrue(self.status()["stale"])  # chưa có chunk nào (index_document bị mock)
        result = self.reindex()
        self.assertEqual((result["chunks_total"], result["chunks_reembedded"]), (8, 8))
        self.assertFalse(self.status()["stale"])
        stored = self.chunks()
        self.assertEqual(len(stored), 8)
        self.assertEqual(stored[0]["metadata"]["heading_path"][0], "Chapter 1: How Memory Works")
        self.assertEqual(stored[-1]["metadata"]["page_start"], 6)

    def test_editing_a_block_reembeds_only_the_changed_chunk(self):
        self.reindex()
        before = {r["metadata"]["content_hash"] for r in self.chunks()}
        self.embed.reset_mock()

        block = self.all_blocks(self.doc_id)[2]
        self.client.patch(f"{self.url}/blocks/{block['id']}", json={"text": "Rewritten sentence about attention."})
        status = self.status()
        self.assertTrue(status["stale"])
        self.assertEqual(status["chunks_changed"], 1)

        result = self.reindex()
        self.assertEqual((result["chunks_reembedded"], result["chunks_kept"], result["chunks_deleted"]), (1, 7, 1))
        self.assertEqual(self.embed.call_args.args[0][0].count("Rewritten sentence"), 1)
        after = {r["metadata"]["content_hash"] for r in self.chunks()}
        self.assertEqual(len(before - after), 1)
        self.assertFalse(self.status()["stale"])

        self.embed.reset_mock()
        self.assertEqual(self.reindex()["chunks_reembedded"], 0)
        self.embed.assert_not_called()

    def test_inserting_a_block_reuses_vectors_of_shifted_chunks(self):
        self.reindex()
        self.embed.reset_mock()
        anchor = self.all_blocks(self.doc_id)[0]
        self.client.post(f"{self.url}/blocks", json={"text": "A new heading for the book.", "block_type": "heading",
                                                       "level": 1})
        self.client.post(f"{self.url}/blocks", json={"after_block_id": anchor["id"], "text": "Extra paragraph here."})
        result = self.reindex()
        self.assertLessEqual(result["chunks_reembedded"], 2)
        self.assertEqual(len(self.chunks()), result["chunks_total"])
        self.assertEqual([c["chunk_index"] for c in self.chunks()], list(range(result["chunks_total"])))

    def test_concurrent_reindex_is_rejected(self):
        lock = document_pipeline  # noqa: F841 - giữ import để rõ ý định
        from app.api.v1 import ebook
        held = ebook._reindex_locks.setdefault(self.doc_id, __import__("threading").Lock())
        held.acquire()
        try:
            self.assertEqual(self.client.post(f"{self.url}/reindex").status_code, 409)
        finally:
            held.release()


class SearchProgressHighlightTests(EbookApiTestCase):
    def setUp(self):
        super().setUp()
        self.doc_id = self.upload_book()
        self.url = f"/api/v1/documents/{self.doc_id}"
        self.blocks_all = self.all_blocks(self.doc_id)

    def test_search_finds_blocks_in_reading_order_with_snippets(self):
        res = self.client.get(f"{self.url}/search", params={"q": "REVIEW"}).json()
        self.assertGreaterEqual(len(res["results"]), 2)
        for hit in res["results"]:
            self.assertIn("review", hit["snippet"].lower())
            self.assertTrue(hit["block_id"])
        orders = {b["id"]: b["order_index"] for b in self.blocks_all}
        positions = [orders[h["block_id"]] for h in res["results"]]
        self.assertEqual(positions, sorted(positions))

    def test_search_treats_wildcards_literally_and_validates_input(self):
        self.assertEqual(self.client.get(f"{self.url}/search", params={"q": "%%"}).json()["results"], [])
        self.assertEqual(self.client.get(f"{self.url}/search", params={"q": "a_b"}).json()["results"], [])
        self.assertEqual(self.client.get(f"{self.url}/search", params={"q": "x"}).status_code, 422)

    def test_search_sees_edits_and_ignores_bold_markers(self):
        block = self.blocks_all[2]
        self.client.patch(f"{self.url}/blocks/{block['id']}", json={"text": "The **quokka** is a small marsupial."})
        hit = self.client.get(f"{self.url}/search", params={"q": "quokka is"}).json()["results"]
        self.assertEqual(hit, [])  # dấu ** nằm giữa → không khớp theo chữ hiển thị
        hit = self.client.get(f"{self.url}/search", params={"q": "small marsupial"}).json()["results"]
        self.assertEqual([h["block_id"] for h in hit], [block["id"]])
        self.assertNotIn("**", hit[0]["snippet"])

    def test_reading_progress_roundtrip_is_per_book(self):
        empty = self.client.get(f"{self.url}/progress").json()
        self.assertIsNone(empty["block_id"])
        target = self.blocks_all[10]
        saved = self.client.put(f"{self.url}/progress", json={"block_id": target["id"], "percent": 31.46}).json()
        self.assertEqual(saved["percent"], 31.5)
        self.client.put(f"{self.url}/progress", json={"block_id": self.blocks_all[12]["id"], "percent": 40})
        got = self.client.get(f"{self.url}/progress").json()
        self.assertEqual((got["block_id"], got["percent"]), (self.blocks_all[12]["id"], 40))
        self.assertEqual(len(self.rows("reading_progress")), 1)  # cập nhật, không thêm dòng
        self.assertEqual(self.client.put(f"{self.url}/progress", json={"block_id": "nope", "percent": 1}).status_code, 404)
        self.assertEqual(self.client.put(f"{self.url}/progress", json={"block_id": target["id"], "percent": 101}).status_code, 422)

    def test_highlights_crud_and_validation(self):
        block = self.blocks_all[2]
        url = f"{self.url}/highlights"
        made = self.client.post(url, json={"block_id": block["id"], "start": 4, "end": 15, "color": "green",
                                           "quote": block["text"][4:15]})
        self.assertEqual(made.status_code, 200)
        highlight = made.json()
        self.assertEqual((highlight["start_offset"], highlight["end_offset"], highlight["color"]), (4, 15, "green"))
        self.assertEqual([h["id"] for h in self.client.get(url).json()["highlights"]], [highlight["id"]])

        changed = self.client.patch(f"{url}/{highlight['id']}", json={"color": "pink"})
        self.assertEqual(changed.json()["color"], "pink")
        self.assertEqual(self.client.patch(f"{url}/{highlight['id']}", json={"color": "red"}).status_code, 422)

        self.assertEqual(self.client.post(url, json={"block_id": block["id"], "start": 5, "end": 5}).status_code, 422)
        self.assertEqual(self.client.post(url, json={"block_id": block["id"], "start": 0, "end": 99999}).status_code, 422)
        self.assertEqual(self.client.post(url, json={"block_id": block["id"], "start": 0, "end": 3, "color": "red"}).status_code, 422)
        self.assertEqual(self.client.post(url, json={"block_id": "missing", "start": 0, "end": 3}).status_code, 404)

        self.assertEqual(self.client.delete(f"{url}/{highlight['id']}").status_code, 200)
        self.assertEqual(self.client.get(url).json()["highlights"], [])

    def test_deleting_a_block_removes_its_highlights(self):
        block = self.blocks_all[2]
        self.client.post(f"{self.url}/highlights", json={"block_id": block["id"], "start": 0, "end": 5})
        self.client.delete(f"{self.url}/blocks/{block['id']}")
        self.assertEqual(self.client.get(f"{self.url}/highlights").json()["highlights"], [])

    def test_new_endpoints_are_private_to_the_owner(self):
        foreign = self.upload_book(user_id=OTHER_USER)
        block_id = [r for r in self.rows("document_blocks") if r["document_id"] == foreign][0]["id"]
        base = f"/api/v1/documents/{foreign}"
        calls = [
            ("get", f"{base}/search?q=review", None), ("get", f"{base}/progress", None),
            ("put", f"{base}/progress", {"block_id": block_id, "percent": 1}),
            ("get", f"{base}/highlights", None),
            ("post", f"{base}/highlights", {"block_id": block_id, "start": 0, "end": 2}),
            ("get", f"{base}/index-status", None), ("post", f"{base}/reindex", None),
            ("get", f"{base}/export?format=md", None),
            ("post", f"{base}/blocks/{block_id}/split", {"offset": 3}),
            ("post", f"{base}/blocks/{block_id}/merge-previous", None),
            ("get", f"{base}/blocks/{block_id}/revisions", None),
        ]
        for method, url, body in calls:
            self.assertEqual(self.client.request(method, url, json=body).status_code, 404, url)


class SplitMergeRevisionExportTests(EbookApiTestCase):
    def setUp(self):
        super().setUp()
        self.doc_id = self.upload_book()
        self.url = f"/api/v1/documents/{self.doc_id}/blocks"
        self.blocks_all = self.all_blocks(self.doc_id)

    def texts(self):
        return [b["text"] for b in self.all_blocks(self.doc_id)]

    def test_split_then_merge_roundtrip(self):
        block = self.blocks_all[2]
        text = block["text"]
        cut = text.index("Encoding improves")
        res = self.client.post(f"{self.url}/{block['id']}/split", json={"offset": cut})
        self.assertEqual(res.status_code, 200, res.text)
        left, right = res.json()["block"], res.json()["new_block"]
        self.assertEqual(left["text"], text[:cut].strip())
        self.assertEqual(right["text"], text[cut:].strip())
        self.assertEqual(len(self.texts()), 33)
        ordered = [b["id"] for b in self.all_blocks(self.doc_id)]
        self.assertEqual(ordered[2:4], [left["id"], right["id"]])

        merged = self.client.post(f"{self.url}/{right['id']}/merge-previous")
        self.assertEqual(merged.status_code, 200)
        self.assertEqual(merged.json()["block"]["text"], text)
        self.assertEqual(merged.json()["removed_id"], right["id"])
        self.assertEqual(self.texts(), [b["text"] for b in self.blocks_all])

    def test_split_keeps_bold_pairs_balanced(self):
        block = self.blocks_all[2]
        self.client.patch(f"{self.url}/{block['id']}", json={"text": "Intro **bold part continues here** end."})
        res = self.client.post(f"{self.url}/{block['id']}/split", json={"offset": len("Intro **bold part")})
        self.assertEqual(res.json()["block"]["text"], "Intro **bold part**")
        self.assertEqual(res.json()["new_block"]["text"], "**continues here** end.")

    def test_split_and_merge_reject_bad_requests(self):
        block = self.blocks_all[2]
        self.assertEqual(self.client.post(f"{self.url}/{block['id']}/split", json={"offset": 0}).status_code, 422)
        self.assertEqual(self.client.post(f"{self.url}/{block['id']}/split",
                                          json={"offset": len(block["text"]) + 5}).status_code, 422)
        self.assertEqual(self.client.post(f"{self.url}/{self.blocks_all[0]['id']}/merge-previous").status_code, 409)

    def test_revisions_record_each_edit_and_can_be_restored(self):
        block = self.blocks_all[2]
        original = block["text"]
        self.client.patch(f"{self.url}/{block['id']}", json={"text": "Version two."})
        self.client.patch(f"{self.url}/{block['id']}", json={"text": "Version three."})
        revisions = self.client.get(f"{self.url}/{block['id']}/revisions").json()["revisions"]
        self.assertEqual([r["text"] for r in revisions], ["Version two.", original])

        restored = self.client.post(f"{self.url}/{block['id']}/revisions/{revisions[1]['id']}/restore")
        self.assertEqual(restored.json()["text"], original)
        # khôi phục cũng được ghi lại, nên không mất "Version three."
        texts = [r["text"] for r in self.client.get(f"{self.url}/{block['id']}/revisions").json()["revisions"]]
        self.assertIn("Version three.", texts)
        self.assertEqual(self.client.post(f"{self.url}/{block['id']}/revisions/nope/restore").status_code, 404)

    def test_no_revision_when_nothing_changes(self):
        block = self.blocks_all[2]
        self.client.patch(f"{self.url}/{block['id']}", json={"text": block["text"]})
        self.assertEqual(self.client.get(f"{self.url}/{block['id']}/revisions").json()["revisions"], [])

    def test_export_markdown_reflects_edits(self):
        edited = self.blocks_all[2]
        self.client.patch(f"{self.url}/{edited['id']}", json={"text": "Edited with **bold**."})
        res = self.client.get(f"/api/v1/documents/{self.doc_id}/export", params={"format": "md"})
        self.assertEqual(res.status_code, 200)
        self.assertIn("text/markdown", res.headers["content-type"])
        self.assertIn("attachment", res.headers["content-disposition"])
        body = res.text
        self.assertTrue(body.startswith("# Test book\n\n# Chapter 1: How Memory Works\n\n## 1.1 Encoding\n\n"))
        self.assertIn("Edited with **bold**.", body)
        self.assertIn("- Close the book before you try to answer.\n- Write the answer", body)
        self.assertEqual(self.client.get(f"/api/v1/documents/{self.doc_id}/export", params={"format": "pdf"}).status_code, 422)

    def test_export_docx_table_as_markdown_table(self):
        with patch.object(settings, "DEFAULT_USER_ID", settings.DEFAULT_USER_ID):
            res = self.upload(build_docx(), filename="lesson.docx")
        doc_id = res.json()["document_id"]
        md = self.client.get(f"/api/v1/documents/{doc_id}/export", params={"format": "md"}).text
        self.assertIn("| Word | Meaning |\n| --- | --- |\n| hello | xin chào |", md)
        self.assertIn("Say **hello** when you arrive.", md)


if __name__ == "__main__":
    unittest.main()
