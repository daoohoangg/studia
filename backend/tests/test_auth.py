import os
import tempfile
import time
import unittest
from unittest.mock import Mock, patch

import jwt
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient

from app.config import settings
from app.core import accounts, auth, local_db
from app.core.auth import current_user_id, require_owned, require_user
from app.core.supabase_client import SafeSupabaseWrapper
from main import app as real_app

SECRET = "test-secret-with-at-least-32-bytes-of-length"
USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


def make_token(sub=USER_A, secret=SECRET, aud="authenticated", exp_delta=3600):
    return jwt.encode({"sub": sub, "aud": aud, "exp": int(time.time()) + exp_delta}, secret, algorithm="HS256")


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows
        self.data = []

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self.rows = [r for r in self.rows if str(r.get(column)) == str(value)]
        return self

    def limit(self, n):
        self.rows = self.rows[:n]
        return self

    def insert(self, rec):
        self._insert_rec = rec
        return self

    def update(self, upd):
        self._upd = upd
        return self

    def execute(self):
        if hasattr(self, "_insert_rec"):
            self.data = [self._insert_rec]
            return self
        self.data = self.rows
        return self


class FakeSupabase:
    def __init__(self, tables):
        self.tables = tables

    def table(self, name):
        return FakeQuery(list(self.tables.get(name, [])))


def build_probe_app():
    probe = FastAPI()
    router = APIRouter()

    @router.get("/whoami")
    async def whoami(user_id: str = "ignored"):
        return {"user_id": current_user_id()}

    @router.get("/docs/{doc_id}")
    async def get_doc(doc_id: str):
        require_owned("documents", doc_id)
        return {"ok": True}

    probe.include_router(router, dependencies=[Depends(require_user)])
    return probe


class AuthTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        db_file = os.path.join(tmp.name, "local_db.json")
        with open(db_file, "w", encoding="utf-8") as f:
            f.write("{}")
        self.store = SafeSupabaseWrapper(None)
        patches = [
            patch.object(local_db, "DB_FILE", db_file),
            patch.object(local_db, "STORAGE_DIR", os.path.join(tmp.name, "storage")),
            patch.object(settings, "SUPABASE_JWT_SECRET", SECRET),
            patch.object(settings, "AUTH_REQUIRED", True),
            patch.object(settings, "ENVIRONMENT", "production"),
            patch.object(settings, "ADMIN_USER_IDS", ""),
            patch.object(settings, "ADMIN_EMAILS", ""),
            patch("app.core.supabase_client.get_supabase_client", return_value=self.store),
            patch("app.api.v1.documents.get_supabase_client", return_value=self.store),
            patch("app.api.v1.tutor.get_supabase_client", return_value=self.store),
            patch("app.api.v1.export.get_supabase_client", return_value=self.store),
            patch("app.api.v1.learning_paths.get_supabase_client", return_value=self.store),
            patch("app.api.v1.scenarios.get_supabase_client", return_value=self.store),
            patch("app.api.v1.feedback.get_supabase_client", return_value=self.store),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
        accounts.invalidate()
        self.addCleanup(accounts.invalidate)
        self.client = TestClient(build_probe_app())

    def test_missing_token_is_rejected(self):
        self.assertEqual(self.client.get("/whoami").status_code, 401)

    def test_valid_token_sets_current_user(self):
        res = self.client.get("/whoami", headers=bearer(make_token(USER_A)))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["user_id"], USER_A)

    def test_client_supplied_user_id_is_ignored(self):
        res = self.client.get(f"/whoami?user_id={USER_B}", headers=bearer(make_token(USER_A)))
        self.assertEqual(res.json()["user_id"], USER_A)

    def test_bad_signature_expired_and_wrong_audience_are_rejected(self):
        for token in (
            make_token(secret="another-secret-with-at-least-32-bytes-len"),
            make_token(exp_delta=-10),
            make_token(aud="anon"),
            "not-a-jwt",
        ):
            self.assertEqual(self.client.get("/whoami", headers=bearer(token)).status_code, 401)

    def test_unsigned_token_is_rejected(self):
        token = jwt.encode({"sub": USER_A, "aud": "authenticated", "exp": int(time.time()) + 60}, None, algorithm="none")
        self.assertEqual(self.client.get("/whoami", headers=bearer(token)).status_code, 401)

    def test_auth_cannot_be_disabled_outside_development(self):
        with patch.object(settings, "AUTH_REQUIRED", False):
            self.assertEqual(self.client.get("/whoami").status_code, 401)
            with patch.object(settings, "ENVIRONMENT", "development"):
                res = self.client.get("/whoami")
                self.assertEqual(res.json()["user_id"], settings.DEFAULT_USER_ID)

    def test_require_owned_hides_other_users_rows(self):
        fake = FakeSupabase({
            "documents": [{"id": "doc-a", "user_id": USER_A}, {"id": "doc-b", "user_id": USER_B}],
            "user_accounts": [{"id": USER_A, "role": "student", "status": "active"}],
        })
        with patch("app.core.supabase_client.get_supabase_client", return_value=fake):
            headers = bearer(make_token(USER_A))
            self.assertEqual(self.client.get("/docs/doc-a", headers=headers).status_code, 200)
            self.assertEqual(self.client.get("/docs/doc-b", headers=headers).status_code, 404)
            self.assertEqual(self.client.get("/docs/missing", headers=headers).status_code, 404)

    def test_every_v1_route_requires_auth(self):
        client = TestClient(real_app)
        self.assertEqual(client.get("/api/v1/exam/sample-data").status_code, 401)
        self.assertEqual(client.post("/api/v1/speech/guide", json={"text": "hello"}).status_code, 401)
        ok = client.get("/api/v1/exam/sample-data", headers=bearer(make_token()))
        self.assertEqual(ok.status_code, 200)

        unprotected = [
            r.path for r in real_app.routes
            if getattr(r, "path", "").startswith("/api/v1/")
            and not r.path.endswith("/openapi.json")
            and not any(d.call is auth.require_user for d in r.dependant.dependencies)
        ]
        self.assertEqual(unprotected, [])

    def test_invalid_bearer_token_is_rejected_even_on_public_documents_get(self):
        client = TestClient(real_app)
        self.assertEqual(client.get("/api/v1/documents/", headers=bearer("invalid-jwt")).status_code, 401)
        self.assertEqual(client.get("/api/v1/documents/").status_code, 200)

    def test_topics_endpoint_requires_auth_and_checks_ownership(self):
        deck_id = "11111111-2222-3333-4444-555555555555"
        self.store.table("topics").insert({
            "id": deck_id,
            "name": "Private Deck",
            "slug": f"deck-{USER_A}-{deck_id[:8]}",
            "difficulty_level": 1,
        }).execute()
        client = TestClient(real_app)
        self.assertEqual(client.get(f"/api/v1/documents/topics/{deck_id}").status_code, 401)
        self.assertEqual(client.get(f"/api/v1/documents/topics/{deck_id}", headers=bearer(make_token(USER_A))).status_code, 200)
        self.assertEqual(client.get(f"/api/v1/documents/topics/{deck_id}", headers=bearer(make_token(USER_B))).status_code, 404)

    def test_safe_supabase_wrapper_does_not_mask_real_db_errors(self):
        real = Mock()
        real.table.return_value.select.return_value.execute.side_effect = RuntimeError("db down")
        real.rpc.return_value.execute.side_effect = RuntimeError("rpc down")
        real.storage.from_.return_value.upload.side_effect = RuntimeError("storage down")
        wrapper = SafeSupabaseWrapper(real)
        with self.assertRaises(RuntimeError):
            wrapper.table("documents").select("*").execute()
        with self.assertRaises(RuntimeError):
            wrapper.rpc("get_due_flashcards", {}).execute()
        with self.assertRaises(RuntimeError):
            wrapper.storage.from_("documents").upload("a/b.pdf", b"x")

    def test_health_endpoint_probes_db(self):
        client = TestClient(real_app)
        ok = client.get("/health")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["status"], "healthy")

        with patch("app.core.supabase_client.get_supabase_client", return_value=None):
            down = client.get("/health")
            self.assertEqual(down.status_code, 503)
            self.assertEqual(down.json()["status"], "unhealthy")

        broken = Mock()
        broken.table.return_value.select.return_value.limit.return_value.execute.side_effect = RuntimeError("timeout")
        with patch("app.core.supabase_client.get_supabase_client", return_value=broken):
            err = client.get("/health")
            self.assertEqual(err.status_code, 503)

    def test_tutor_export_and_graph_enforce_ownership(self):
        doc_a = "aaaaaaaa-0000-0000-0000-000000000001"
        topic_a = "aaaaaaaa-0000-0000-0000-000000000002"
        sess_a = "aaaaaaaa-0000-0000-0000-000000000003"
        self.store.table("documents").insert({
            "id": doc_a, "user_id": USER_A, "title": "Secret A", "source_type": "text", "visibility": "private",
        }).execute()
        self.store.table("topics").insert({
            "id": topic_a, "document_id": doc_a, "name": "Secret Topic A", "slug": "secret-a",
        }).execute()
        self.store.table("ai_chat_sessions").insert({
            "id": sess_a, "user_id": USER_A, "document_id": doc_a, "messages": [],
        }).execute()
        self.store.table("flashcards").insert({
            "id": "fc-a", "topic_id": topic_a, "document_id": doc_a, "front": "Q", "back": "A",
        }).execute()

        client = TestClient(real_app)
        hdr_b = bearer(make_token(USER_B))
        self.assertEqual(
            client.post("/api/v1/tutor/ask", json={"question": "hi", "document_id": doc_a}, headers=hdr_b).status_code,
            404,
        )
        self.assertEqual(
            client.post("/api/v1/tutor/ask", json={"question": "hi", "session_id": sess_a}, headers=hdr_b).status_code,
            404,
        )
        self.assertEqual(client.get(f"/api/v1/export/flashcards/anki/{topic_a}", headers=hdr_b).status_code, 404)
        self.assertEqual(client.get(f"/api/v1/export/flashcards/json/{topic_a}", headers=hdr_b).status_code, 404)
        graph_b = client.get("/api/v1/learning-paths/graph", headers=hdr_b).json()
        self.assertEqual(graph_b["nodes"], [])

    def test_scenarios_and_feedback_reject_non_uuid(self):
        client = TestClient(real_app)
        hdr_a = bearer(make_token(USER_A))
        with patch("app.services.sysconfig.feature_enabled", return_value=True), \
                patch("app.services.ai_engine.ai_feature_enabled", return_value=True):
            r1 = client.post(
                "/api/v1/scenarios/generate",
                json={"document_id": "default", "topic_name": "Topic"},
                headers=hdr_a,
            )
            r2 = client.post(
                "/api/v1/feedback/remedial-exercises",
                json={"topic_id": "default", "topic_name": "Topic"},
                headers=hdr_a,
            )
        self.assertEqual(r1.status_code, 422)
        self.assertEqual(r2.status_code, 422)


if __name__ == "__main__":
    unittest.main()
