"""
Cấu hình hệ thống do quản lý chỉnh: bật/tắt tính năng, giới hạn upload, banner, nội dung luyện tập, thông tin sách chung.
Chạy trên LocalStore tạm, không gọi Supabase.
"""
import os
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import settings
from app.core import accounts, local_db
from app.core.supabase_client import SafeSupabaseWrapper
from app.services import sysconfig
from main import app

DEMO = "11111111-1111-1111-1111-111111111111"
OWNER = "cccccccc-cccc-cccc-cccc-cccccccccccc"
API = "/api/v1"


class ConfigTestCase(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        db_file = os.path.join(tmp.name, "local_db.json")
        with open(db_file, "w", encoding="utf-8") as f:
            f.write("{}")
        self.store = SafeSupabaseWrapper(None)
        for p in (
            patch.object(local_db, "DB_FILE", db_file),
            patch.object(local_db, "STORAGE_DIR", os.path.join(tmp.name, "storage")),
            patch.object(settings, "AUTH_REQUIRED", False),
            patch.object(settings, "ENVIRONMENT", "development"),
            patch.object(settings, "ADMIN_USER_IDS", ""),
            patch.object(settings, "ADMIN_EMAILS", ""),
            patch("app.core.supabase_client.get_supabase_client", return_value=self.store),
            patch("app.api.v1.documents.get_supabase_client", return_value=self.store),
            patch("app.api.v1.documents.process_text_document"),
        ):
            p.start()
            self.addCleanup(p.stop)
        accounts.invalidate()
        sysconfig.invalidate()
        self.addCleanup(accounts.invalidate)
        self.addCleanup(sysconfig.invalidate)
        self.client = TestClient(app)

    def make_admin(self):
        accounts.ensure_account(DEMO)
        self.store.table("user_accounts").update({"role": "admin"}).eq("id", DEMO).execute()
        accounts.invalidate()

    def put(self, path, body):
        return self.client.put(f"{API}{path}", json=body)


class PublicConfigTests(ConfigTestCase):
    def test_defaults_everything_on_and_no_banner(self):
        c = self.client.get(f"{API}/config/public").json()
        self.assertTrue(all(c["features"].values()))
        self.assertIn("dictation", c["features"])
        self.assertIsNone(c["announcement"])
        self.assertIsNone(c["dictation_segments"])
        self.assertEqual(c["limits"]["MAX_PDF_MB"], settings.MAX_PDF_MB)

    def test_public_endpoint_needs_no_login(self):
        with patch.object(settings, "AUTH_REQUIRED", True), patch.object(settings, "ENVIRONMENT", "production"):
            self.assertEqual(self.client.get(f"{API}/config/public").status_code, 200)


class AdminOnlyTests(ConfigTestCase):
    def test_students_cannot_read_or_change_config(self):
        for method, path, body in (("get", "/admin/config", None), ("put", "/admin/config", {"features": {"tutor": False}}),
                                   ("get", "/admin/content", None), ("put", "/admin/content", {"announcement": {"enabled": False}})):
            r = getattr(self.client, method)(f"{API}{path}", **({"json": body} if body is not None else {}))
            self.assertEqual(r.status_code, 403, path)


class FeatureFlagTests(ConfigTestCase):
    def test_disabled_feature_blocks_students_but_not_admins(self):
        self.make_admin()
        r = self.put("/admin/config", {"features": {"tutor": False}})
        self.assertEqual(r.status_code, 200)
        self.assertFalse(next(f for f in r.json()["features"] if f["id"] == "tutor")["enabled"])
        self.assertFalse(self.client.get(f"{API}/config/public").json()["features"]["tutor"])
        self.assertNotEqual(self.client.get(f"{API}/tutor/sessions").status_code, 403)  # admin vẫn vào được

        self.store.table("user_accounts").update({"role": "student"}).eq("id", DEMO).execute()
        accounts.invalidate()
        r = self.client.get(f"{API}/tutor/sessions")
        self.assertEqual(r.status_code, 403)
        self.assertIn("tạm tắt", r.json()["detail"])

    def test_other_features_stay_on(self):
        self.make_admin()
        self.put("/admin/config", {"features": {"tutor": False}})
        flags = self.client.get(f"{API}/config/public").json()["features"]
        self.assertTrue(flags["exam"] and flags["dictation"])

    def test_unknown_feature_rejected(self):
        self.make_admin()
        self.assertEqual(self.put("/admin/config", {"features": {"nope": False}}).status_code, 400)

    def test_upload_off_blocks_student_uploads_only(self):
        self.make_admin()
        self.put("/admin/config", {"features": {"upload": False}})
        self.store.table("user_accounts").update({"role": "student"}).eq("id", DEMO).execute()
        accounts.invalidate()
        r = self.client.post(f"{API}/documents/upload", json={"title": "A", "raw_content": "hello world"})
        self.assertEqual(r.status_code, 403)
        self.assertEqual(len(self.store.table("documents").select("*").execute().data), 0)
        self.make_admin()
        r = self.client.post(f"{API}/documents/upload", json={"title": "A", "raw_content": "hello world"})
        self.assertEqual(r.status_code, 200)


class LimitTests(ConfigTestCase):
    def test_override_and_reset(self):
        self.make_admin()
        r = self.put("/admin/config", {"limits": {"MAX_PDF_MB": 7}})
        self.assertEqual(r.json()["limits"]["MAX_PDF_MB"]["value"], 7)
        self.assertTrue(r.json()["limits"]["MAX_PDF_MB"]["overridden"])
        self.assertEqual(sysconfig.limit("MAX_PDF_MB"), 7)
        self.assertEqual(self.client.get(f"{API}/config/public").json()["limits"]["MAX_PDF_MB"], 7)
        r = self.put("/admin/config", {"limits": {"MAX_PDF_MB": None}})
        self.assertEqual(sysconfig.limit("MAX_PDF_MB"), settings.MAX_PDF_MB)
        self.assertFalse(r.json()["limits"]["MAX_PDF_MB"]["overridden"])

    def test_out_of_range_and_unknown_rejected(self):
        self.make_admin()
        self.assertEqual(self.put("/admin/config", {"limits": {"MAX_PDF_MB": 0}}).status_code, 400)
        self.assertEqual(self.put("/admin/config", {"limits": {"MAX_PDF_MB": 100000}}).status_code, 400)
        self.assertEqual(self.put("/admin/config", {"limits": {"SECRET": 5}}).status_code, 400)

    def test_override_is_enforced_by_upload_validation(self):
        from fastapi import HTTPException
        from app.core.uploads import validate_docx_bytes
        self.make_admin()
        self.put("/admin/config", {"limits": {"MAX_PDF_MB": 1}})
        with self.assertRaises(HTTPException) as cm:
            validate_docx_bytes(b"PK" + b"0" * (1024 * 1024 + 10))
        self.assertEqual(cm.exception.status_code, 413)
        self.assertIn("1 MB", cm.exception.detail)

    def test_reminders_toggle_only_turns_off(self):
        self.make_admin()
        with patch.object(settings, "REMINDERS_ENABLED", True):
            self.assertTrue(sysconfig.reminders_enabled())
            self.put("/admin/config", {"reminders_enabled": False})
            self.assertFalse(sysconfig.reminders_enabled())
            self.put("/admin/config", {"reminders_enabled": True})
            self.assertTrue(sysconfig.reminders_enabled())
        with patch.object(settings, "REMINDERS_ENABLED", False):
            self.assertFalse(sysconfig.reminders_enabled())  # .env là công tắc tổng


class ContentTests(ConfigTestCase):
    SEG = {"id": "z1", "level": "easy", "topic": "Thử", "text": "The quick brown fox jumps over the lazy dog near the old river bank today."}

    def test_announcement_flow(self):
        self.make_admin()
        self.assertEqual(self.put("/admin/content", {"announcement": {"enabled": True, "text": "  ", "level": "info"}}).status_code, 400)
        self.assertEqual(self.put("/admin/content", {"announcement": {"enabled": True, "text": "x" * 301}}).status_code, 400)
        self.assertEqual(self.put("/admin/content", {"announcement": {"enabled": True, "text": "Bảo trì", "level": "bad"}}).status_code, 400)
        r = self.put("/admin/content", {"announcement": {"enabled": True, "text": "Bảo trì  lúc  22h", "level": "warning"}})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get(f"{API}/config/public").json()["announcement"], {"enabled": True, "text": "Bảo trì lúc 22h", "level": "warning"})
        self.put("/admin/content", {"announcement": {"enabled": False, "text": "Bảo trì", "level": "info"}})
        self.assertIsNone(self.client.get(f"{API}/config/public").json()["announcement"])

    def test_dictation_segments_validated_saved_and_reset(self):
        self.make_admin()
        bad = [{**self.SEG, "text": "Too short."}]
        self.assertEqual(self.put("/admin/content", {"dictation_segments": bad}).status_code, 400)
        bad = [{**self.SEG, "level": "expert"}]
        self.assertEqual(self.put("/admin/content", {"dictation_segments": bad}).status_code, 400)
        self.assertEqual(self.put("/admin/content", {"dictation_segments": "x"}).status_code, 400)

        r = self.put("/admin/content", {"dictation_segments": [self.SEG, {**self.SEG, "id": "z1"}]})
        self.assertEqual(r.status_code, 200)
        got = self.client.get(f"{API}/config/public").json()["dictation_segments"]
        self.assertEqual([s["id"] for s in got], ["z1", "z1_"])  # id trùng được đánh lại

        r = self.put("/admin/content", {"dictation_segments": None})
        self.assertIsNone(r.json()["dictation_segments"])
        self.assertIsNone(self.client.get(f"{API}/config/public").json()["dictation_segments"])

    def test_pronunciation_sentences(self):
        self.make_admin()
        self.assertEqual(self.put("/admin/content", {"pronunciation_sentences": [{"group": "A", "text": "Hi"}]}).status_code, 400)
        r = self.put("/admin/content", {"pronunciation_sentences": [{"group": "Part 1", "text": "I grew up in a small town."}]})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get(f"{API}/config/public").json()["pronunciation_sentences"][0]["group"], "Part 1")

    def test_untouched_keys_are_left_alone(self):
        self.make_admin()
        self.put("/admin/content", {"dictation_segments": [self.SEG]})
        self.put("/admin/content", {"announcement": {"enabled": False, "text": "", "level": "info"}})
        self.assertEqual(len(self.client.get(f"{API}/config/public").json()["dictation_segments"]), 1)


class BookMetaTests(ConfigTestCase):
    def add_doc(self, title, visibility="shared"):
        return self.store.table("documents").insert({
            "user_id": OWNER, "title": title, "source_type": "pdf", "processing_status": "completed", "visibility": visibility,
        }).execute().data[0]["id"]

    def test_edit_book_and_ordering_for_students(self):
        self.make_admin()
        a, b, c = self.add_doc("A book"), self.add_doc("B book"), self.add_doc("C book")
        r = self.client.patch(f"{API}/admin/documents/{c}", json={"title": " C  renamed ", "description": "Đề thi Cambridge", "category": "Reading", "sort_order": 2})
        self.assertEqual(r.status_code, 200)
        self.client.patch(f"{API}/admin/documents/{b}", json={"featured": True})
        self.client.patch(f"{API}/admin/documents/{a}", json={"sort_order": 1})

        lib = {d["id"]: d for d in self.client.get(f"{API}/admin/library?scope=shared").json()["documents"]}
        self.assertEqual(lib[c]["title"], "C renamed")
        self.assertEqual(lib[c]["category"], "Reading")
        self.assertTrue(lib[b]["featured"])

        self.store.table("user_accounts").update({"role": "student"}).eq("id", DEMO).execute()
        accounts.invalidate()
        docs = self.client.get(f"{API}/documents/").json()["documents"]
        self.assertEqual([d["id"] for d in docs], [b, a, c])  # nổi bật trước, rồi theo thứ tự
        self.assertEqual(next(d for d in docs if d["id"] == c)["description"], "Đề thi Cambridge")

    def test_visibility_still_works_and_validation(self):
        self.make_admin()
        d = self.add_doc("Hidden", visibility="private")
        self.assertEqual(self.client.patch(f"{API}/admin/documents/{d}", json={"visibility": "bogus"}).status_code, 400)
        self.assertEqual(self.client.patch(f"{API}/admin/documents/{d}", json={"title": "  "}).status_code, 400)
        self.assertEqual(self.client.patch(f"{API}/admin/documents/{d}", json={"sort_order": -1}).status_code, 400)
        self.assertEqual(self.client.patch(f"{API}/admin/documents/{d}", json={"visibility": "shared"}).status_code, 200)
        self.assertEqual(self.client.patch(f"{API}/admin/documents/missing", json={"featured": True}).status_code, 404)


if __name__ == "__main__":
    unittest.main()
