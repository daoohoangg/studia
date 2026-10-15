import time
import unittest
from unittest.mock import patch

import jwt
from fastapi import APIRouter, Depends, FastAPI
from fastapi.testclient import TestClient

from app.config import settings
from app.core import auth
from app.core.auth import current_user_id, require_owned, require_user
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

    def select(self, *_):
        return self

    def eq(self, column, value):
        self.rows = [r for r in self.rows if str(r.get(column)) == str(value)]
        return self

    def execute(self):
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
        patches = [
            patch.object(settings, "SUPABASE_JWT_SECRET", SECRET),
            patch.object(settings, "AUTH_REQUIRED", True),
            patch.object(settings, "ENVIRONMENT", "production"),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)
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
        fake = FakeSupabase({"documents": [{"id": "doc-a", "user_id": USER_A}, {"id": "doc-b", "user_id": USER_B}]})
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


if __name__ == "__main__":
    unittest.main()
