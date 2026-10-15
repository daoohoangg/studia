import json
import os
import unittest
from unittest.mock import Mock, patch

from app.config import settings
from app.services import document_pipeline
from app.services.exam_builder import service
from test_uploads import OTHER_USER, LocalStoreTestCase

PNG = bytes([0x89]) + b"PNG\r\n\x1a\n" + b"\x00" * 64
MP3 = b"ID3" + b"\x03\x00\x00\x00\x00\x00\x21" + b"\x00" * 128


class ExamSetsApiTestCase(LocalStoreTestCase):
    def setUp(self):
        super().setUp()
        p = patch.object(document_pipeline, "index_document", Mock())
        p.start()
        self.addCleanup(p.stop)
        p = patch("app.api.v1.exam_sets.get_supabase_client", return_value=self.store)
        p.start()
        self.addCleanup(p.stop)

    def upload_pdf(self, name="mini_ielts", user_id=None, title="Mini IELTS"):
        with open(os.path.join(self.fixtures_dir.name, f"{name}.pdf"), "rb") as f, \
                patch.object(settings, "DEFAULT_USER_ID", user_id or settings.DEFAULT_USER_ID):
            res = self.client.post("/api/v1/documents/upload-file", files={"file": (f"{name}.pdf", f.read(), "application/pdf")},
                                   data={"title": title})
        self.assertEqual(res.status_code, 200, res.text)
        return res.json()["document_id"]

    def build(self, doc_id, **body):
        return self.client.post(f"/api/v1/documents/{doc_id}/exam-sets/build", json=body)

    def built_set(self):
        doc_id = self.upload_pdf()
        res = self.build(doc_id)
        self.assertEqual(res.status_code, 200, res.text)
        return doc_id, res.json()["exam_sets"][0]["id"]


class BuildAndReadTests(ExamSetsApiTestCase):
    def test_build_creates_one_draft_with_summary(self):
        doc_id = self.upload_pdf()
        res = self.build(doc_id)
        self.assertEqual(res.status_code, 200)
        sets = res.json()["exam_sets"]
        self.assertEqual(len(sets), 1)
        summary = sets[0]
        self.assertEqual(summary["title"], "Mini IELTS — Test 1")
        self.assertEqual((summary["status"], summary["errors"], summary["warnings"]), ("draft", 0, 1))
        self.assertEqual(summary["stats"]["listening"], 40)
        self.assertFalse(summary["has_audio"])

        listed = self.client.get("/api/v1/exam-sets", params={"document_id": doc_id}).json()["exam_sets"]
        self.assertEqual([s["id"] for s in listed], [summary["id"]])
        self.assertNotIn("content", listed[0])

    def test_rebuild_replaces_old_drafts_but_not_published(self):
        doc_id = self.upload_pdf()
        first = self.build(doc_id).json()["exam_sets"][0]["id"]
        second = self.build(doc_id).json()["exam_sets"][0]["id"]
        self.assertNotEqual(first, second)
        ids = [s["id"] for s in self.client.get("/api/v1/exam-sets").json()["exam_sets"]]
        self.assertEqual(ids, [second])

        self.client.post(f"/api/v1/exam-sets/{second}/publish")
        third = self.build(doc_id).json()["exam_sets"][0]["id"]
        statuses = {s["id"]: s["status"] for s in self.client.get("/api/v1/exam-sets").json()["exam_sets"]}
        self.assertEqual(statuses, {second: "published", third: "draft"})

    def test_build_errors_are_explained(self):
        text_doc = self.client.post("/api/v1/documents/upload",
                                    json={"title": "Notes", "raw_content": "Just some notes.\n\nNo exam here."})
        res = self.build(text_doc.json()["document_id"])
        self.assertEqual(res.status_code, 422)
        self.assertIn("Test N", res.json()["detail"])

        self.store.table("documents").insert({"id": "empty", "user_id": settings.DEFAULT_USER_ID, "title": "x",
                                              "source_type": "text"}).execute()
        self.assertEqual(self.build("empty").status_code, 409)

    def test_answer_key_only_with_include_key_and_never_in_preview(self):
        _doc, set_id = self.built_set()
        plain = self.client.get(f"/api/v1/exam-sets/{set_id}").json()
        self.assertNotIn("answer_key", plain)
        self.assertEqual(plain["content"]["sections"]["listening"]["parts"][0]["groups"][0]["questions"][0]["number"], 1)

        keyed = self.client.get(f"/api/v1/exam-sets/{set_id}", params={"include_key": "true"}).json()
        self.assertEqual(keyed["answer_key"]["listening"]["1"]["accept"], ["25"])

        preview = self.client.get(f"/api/v1/exam-sets/{set_id}/preview").json()
        text = json.dumps(preview)
        for secret in ("accept", "Hallam", "audioscripts", "WOMAN:"):
            self.assertNotIn(secret, text)
        self.assertEqual(len(preview["questions"]["listening"]), 40)

    def test_foreign_user_cannot_touch_exam_sets(self):
        foreign_doc = self.upload_pdf(user_id=OTHER_USER)
        with patch.object(settings, "DEFAULT_USER_ID", OTHER_USER):
            foreign_set = self.build(foreign_doc).json()["exam_sets"][0]["id"]
        self.assertEqual(self.build(foreign_doc).status_code, 404)
        self.assertEqual(self.client.get("/api/v1/exam-sets").json()["exam_sets"], [])
        for method, url in (("get", f"/api/v1/exam-sets/{foreign_set}"), ("post", f"/api/v1/exam-sets/{foreign_set}/publish"),
                            ("get", f"/api/v1/exam-sets/{foreign_set}/preview"),
                            ("delete", f"/api/v1/exam-sets/{foreign_set}"),
                            ("post", f"/api/v1/exam-sets/{foreign_set}/validate")):
            self.assertEqual(self.client.request(method, url).status_code, 404, url)


class EditAndPublishTests(ExamSetsApiTestCase):
    def test_edit_revalidates_and_blocks_publish_until_fixed(self):
        _doc, set_id = self.built_set()
        full = self.client.get(f"/api/v1/exam-sets/{set_id}", params={"include_key": "true"}).json()
        key = full["answer_key"]
        del key["listening"]["7"]

        res = self.client.patch(f"/api/v1/exam-sets/{set_id}", json={"answer_key": key})
        self.assertEqual(res.status_code, 200)
        self.assertEqual([(e["code"], e["question"]) for e in res.json()["validation"]["errors"]],
                         [("MISSING_KEY", 7)])

        blocked = self.client.post(f"/api/v1/exam-sets/{set_id}/publish")
        self.assertEqual(blocked.status_code, 409)
        self.assertEqual(blocked.json()["detail"]["errors"][0]["code"], "MISSING_KEY")

        key["listening"]["7"] = {"accept": ["Hallam"], "raw": "Hallam"}
        self.client.patch(f"/api/v1/exam-sets/{set_id}", json={"answer_key": key})
        ok = self.client.post(f"/api/v1/exam-sets/{set_id}/publish")
        self.assertEqual((ok.status_code, ok.json()["status"]), (200, "published"))

    def test_published_set_is_locked_until_unpublished(self):
        _doc, set_id = self.built_set()
        self.client.post(f"/api/v1/exam-sets/{set_id}/publish")
        self.assertEqual(self.client.patch(f"/api/v1/exam-sets/{set_id}", json={"title": "New"}).status_code, 409)
        self.client.post(f"/api/v1/exam-sets/{set_id}/unpublish")
        renamed = self.client.patch(f"/api/v1/exam-sets/{set_id}", json={"title": "Renamed test"})
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(self.client.get(f"/api/v1/exam-sets/{set_id}").json()["content"]["title"], "Renamed test")

    def test_invalid_content_shape_is_rejected(self):
        _doc, set_id = self.built_set()
        self.assertEqual(self.client.patch(f"/api/v1/exam-sets/{set_id}", json={"content": {"oops": 1}}).status_code, 422)

    def test_edit_blocked_while_ai_is_refining(self):
        _doc, set_id = self.built_set()
        row = self.store.table("exam_sets").select("*").eq("id", set_id).execute().data[0]
        row["validation"]["build"] = {"state": "refining", "ai": True}
        self.store.table("exam_sets").update({"validation": row["validation"]}).eq("id", set_id).execute()
        self.assertEqual(self.client.patch(f"/api/v1/exam-sets/{set_id}", json={"title": "x"}).status_code, 409)
        self.assertEqual(self.client.post(f"/api/v1/exam-sets/{set_id}/publish").status_code, 409)

    def test_archive_hides_set_from_list(self):
        _doc, set_id = self.built_set()
        self.assertEqual(self.client.delete(f"/api/v1/exam-sets/{set_id}").status_code, 200)
        self.assertEqual(self.client.get("/api/v1/exam-sets").json()["exam_sets"], [])
        archived = self.client.get("/api/v1/exam-sets", params={"status": "archived"}).json()["exam_sets"]
        self.assertEqual([s["id"] for s in archived], [set_id])


class MediaTests(ExamSetsApiTestCase):
    def test_audio_upload_clears_warning_and_is_served_by_signed_url(self):
        _doc, set_id = self.built_set()
        res = self.client.post(f"/api/v1/exam-sets/{set_id}/audio", files={"file": ("listening.mp3", MP3, "audio/mpeg")})
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["content_type"], "audio/mpeg")
        info = self.client.get(f"/api/v1/exam-sets/{set_id}").json()
        self.assertTrue(info["has_audio"])
        self.assertEqual(info["warnings"], 0)

        url = self.client.get(f"/api/v1/exam-sets/{set_id}/audio-url").json()["url"]
        self.assertEqual(self.client.get(url).content, MP3)
        preview = self.client.get(f"/api/v1/exam-sets/{set_id}/preview").json()
        self.assertTrue(preview["questions"]["listening_audio"].startswith("http://testserver/local-storage/"))

    def test_audio_validation(self):
        _doc, set_id = self.built_set()
        url = f"/api/v1/exam-sets/{set_id}/audio"
        self.assertEqual(self.client.post(url, files={"file": ("a.mp3", b"", "audio/mpeg")}).status_code, 400)
        self.assertEqual(self.client.post(url, files={"file": ("a.mp3", b"<html>nope</html>", "audio/mpeg")}).status_code, 400)
        with patch.object(settings, "MAX_AUDIO_MB", 1):
            big = MP3 + b"\x00" * (1024 * 1024)
            self.assertEqual(self.client.post(url, files={"file": ("a.mp3", big, "audio/mpeg")}).status_code, 413)
        self.assertEqual(self.client.get(f"{url}-url").status_code, 404)

    def test_image_is_attached_to_a_slot_and_resolved_in_preview(self):
        _doc, set_id = self.built_set()
        before = self.client.get(f"/api/v1/exam-sets/{set_id}").json()
        self.assertIsNone(before["content"]["sections"]["writing"]["task1"]["image_url"])

        res = self.client.post(f"/api/v1/exam-sets/{set_id}/images", params={"target": "writing.task1"},
                               files={"file": ("chart.png", PNG, "image/png")})
        self.assertEqual(res.status_code, 200, res.text)
        after = self.client.get(f"/api/v1/exam-sets/{set_id}").json()
        image_url = after["content"]["sections"]["writing"]["task1"]["image_url"]
        self.assertTrue(image_url.startswith("http://testserver/local-storage/"))
        self.assertEqual(self.client.get(image_url).content, PNG)

        stored = self.store.table("exam_sets").select("content").eq("id", set_id).execute().data[0]["content"]
        self.assertTrue(stored["sections"]["writing"]["task1"]["image_url"].startswith(service.MEDIA_PREFIX))

    def test_image_validation(self):
        _doc, set_id = self.built_set()
        url = f"/api/v1/exam-sets/{set_id}/images"
        png = {"file": ("c.png", PNG, "image/png")}
        self.assertEqual(self.client.post(url, params={"target": "writing.nope"}, files=png).status_code, 404)
        self.assertEqual(self.client.post(url, params={"target": "group:listening:15"}, files=png).status_code, 200)
        self.assertEqual(self.client.post(url, params={"target": "writing.task1"},
                                          files={"file": ("c.png", b"not an image", "image/png")}).status_code, 400)


class AiRefinementTests(ExamSetsApiTestCase):
    def test_background_refinement_improves_weak_group_and_marks_done(self):
        doc_id = self.upload_pdf()
        class FakeLLM:
            def generate_json(self, prompt):
                return None  # AI không trả được gì: giữ nguyên kết quả luật

        rows = service.build_for_document(self.store, settings.DEFAULT_USER_ID,
                                          {"id": doc_id, "title": "Mini"}, llm=FakeLLM())
        row = rows[0]
        self.assertEqual(row["validation"]["build"], {"state": "refining", "ai": True})
        service.refine_with_ai(self.store, row["id"], FakeLLM())
        stored = self.store.table("exam_sets").select("*").eq("id", row["id"]).execute().data[0]
        self.assertEqual(stored["validation"]["build"]["state"], "ready")
        self.assertTrue(stored["validation"]["ok"])

    def test_refinement_failure_still_leaves_a_usable_draft(self):
        doc_id = self.upload_pdf()
        rows = service.build_for_document(self.store, settings.DEFAULT_USER_ID, {"id": doc_id}, llm=Mock())
        with patch.object(service, "load_all_blocks", side_effect=RuntimeError("db down")):
            service.refine_with_ai(self.store, rows[0]["id"], Mock())
        stored = self.store.table("exam_sets").select("*").eq("id", rows[0]["id"]).execute().data[0]
        self.assertEqual(stored["validation"]["build"]["state"], "ready")
        self.assertFalse(stored["validation"]["build"]["ai"])


if __name__ == "__main__":
    unittest.main()
