"""
Hồ sơ học tập và kết quả kiểm tra trình độ — chạy trên LocalStore tạm.
"""
import os
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import settings
from app.core import accounts, local_db
from app.core.supabase_client import SafeSupabaseWrapper
from main import app


class ProfileTestCase(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        db_file = os.path.join(tmp.name, "local_db.json")
        with open(db_file, "w", encoding="utf-8") as f:
            f.write("{}")
        store = SafeSupabaseWrapper(None)
        for p in (
            patch.object(local_db, "DB_FILE", db_file),
            patch.object(local_db, "STORAGE_DIR", os.path.join(tmp.name, "storage")),
            patch.object(settings, "AUTH_REQUIRED", False),
            patch.object(settings, "ENVIRONMENT", "development"),
            patch.object(settings, "ADMIN_USER_IDS", ""),
            patch.object(settings, "ADMIN_EMAILS", ""),
            patch("app.core.supabase_client.get_supabase_client", return_value=store),
            patch("app.api.v1.profile.get_supabase_client", return_value=store),
            patch("app.api.v1.export.get_supabase_client", return_value=store),
            patch("app.core.accounts._db", return_value=store),
        ):
            p.start()
            self.addCleanup(p.stop)
        accounts.invalidate()
        self.client = TestClient(app)
        self.api = settings.API_V1_STR

    def test_empty_profile(self):
        r = self.client.get(f"{self.api}/profile")
        self.assertEqual(r.status_code, 200)
        self.assertIsNone(r.json()["profile"])
        self.assertIsNone(r.json()["placement"])

    def test_save_and_read_profile(self):
        body = {"purpose": "Du học", "kind": "Academic", "target": 7.0, "noExam": True,
                "level": "5.5–6.0", "minutes": 30, "days": ["T2", "T3"], "remindAt": "20:30"}
        self.assertEqual(self.client.put(f"{self.api}/profile", json=body).status_code, 200)
        body["minutes"] = 45
        self.assertEqual(self.client.put(f"{self.api}/profile", json=body).status_code, 200)
        got = self.client.get(f"{self.api}/profile").json()["profile"]
        self.assertEqual(got["minutes"], 45)
        self.assertEqual(got["days"], ["T2", "T3"])

    def test_rejects_invalid_profile(self):
        r = self.client.put(f"{self.api}/profile", json={"target": 12})
        self.assertEqual(r.status_code, 422)

    def test_placement_roundtrip_and_validation(self):
        per = {"vocab": {"right": 3, "total": 6}, "grammar": {"right": 5, "total": 6}}
        r = self.client.post(f"{self.api}/profile/placement", json={"band": 5.7, "per": per})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["placement"]["band"], 5.5)
        latest = self.client.get(f"{self.api}/profile").json()["placement"]
        self.assertEqual(latest["per"]["grammar"]["right"], 5)
        bad = self.client.post(f"{self.api}/profile/placement",
                               json={"band": 5, "per": {"vocab": {"right": 9, "total": 6}}})
        self.assertEqual(bad.status_code, 422)
        unknown = self.client.post(f"{self.api}/profile/placement",
                                   json={"band": 5, "per": {"cooking": {"right": 1, "total": 2}}})
        self.assertEqual(unknown.status_code, 422)

    def test_export_and_delete_account(self):
        self.client.put(f"{self.api}/profile", json={"target": 6.5})
        data = self.client.get(f"{self.api}/profile/export").json()
        self.assertEqual(len(data["user_profiles"]), 1)
        # email xác nhận sai
        bad = self.client.post(f"{self.api}/profile/delete-account", json={"confirm_email": "khac@x.com"})
        self.assertIn(bad.status_code, (400, 403))

    def test_anki_all_empty_is_404(self):
        self.assertEqual(self.client.get(f"{self.api}/export/flashcards/anki-all").status_code, 404)


if __name__ == "__main__":
    unittest.main()
