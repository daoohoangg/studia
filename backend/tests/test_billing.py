"""
Vai trò, lượt upload, đơn thanh toán và webhook SePay — chạy trên LocalStore tạm, không gọi Supabase.
"""
import hashlib
import hmac
import json
import os
import tempfile
import time
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.config import settings
from app.core import accounts, local_db
from app.core.supabase_client import SafeSupabaseWrapper
from app.services import billing
from main import app

DEMO = "11111111-1111-1111-1111-111111111111"
OTHER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"


class BillingTestCase(unittest.TestCase):
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
            patch.object(settings, "SEPAY_API_KEY", "test-key"),
            patch.object(settings, "SEPAY_WEBHOOK_SECRET", ""),
            patch("app.core.supabase_client.get_supabase_client", return_value=self.store),
            patch("app.api.v1.documents.get_supabase_client", return_value=self.store),
            # Không chạy pipeline AI thật cho tài liệu tải lên trong test
            patch("app.api.v1.documents.process_text_document"),
        ):
            p.start()
            self.addCleanup(p.stop)
        accounts.invalidate()
        self.addCleanup(accounts.invalidate)
        self.client = TestClient(app)
        # Cấu hình ngân hàng + một gói đang bán
        billing.set_setting("bank", {"bank_id": "970422", "account_no": "0123456789", "account_name": "STUDIA"})
        self.pack = self.store.table("credit_packs").insert(
            {"name": "Gói vừa", "books": 10, "price_vnd": 99000, "active": True, "sort_order": 1}
        ).execute().data[0]

    def make_admin(self, uid=DEMO):
        accounts.ensure_account(uid)
        self.store.table("user_accounts").update({"role": "admin"}).eq("id", uid).execute()
        accounts.invalidate()

    def webhook(self, payload, key="test-key"):
        return self.client.post("/api/v1/billing/webhook/sepay", content=json.dumps(payload),
                                headers={"Authorization": f"Apikey {key}", "Content-Type": "application/json"})


class QuotaTests(BillingTestCase):
    def test_new_student_has_one_free_upload(self):
        me = self.client.get("/api/v1/account/me").json()
        self.assertEqual(me["role"], "student")
        self.assertEqual(me["quota"]["remaining"], 1)
        self.assertFalse(me["quota"]["unlimited"])

    def test_second_upload_is_blocked_with_402(self):
        r1 = self.client.post("/api/v1/documents/upload", json={"title": "A", "raw_content": "hello world"})
        self.assertEqual(r1.status_code, 200)
        r2 = self.client.post("/api/v1/documents/upload", json={"title": "B", "raw_content": "hello again"})
        self.assertEqual(r2.status_code, 402)
        self.assertEqual(len(self.store.table("documents").select("*").execute().data), 1)

    def test_admin_is_unlimited_and_can_share(self):
        self.make_admin()
        for i in range(3):
            r = self.client.post("/api/v1/documents/upload", json={"title": f"B{i}", "raw_content": "x", "shared": True})
            self.assertEqual(r.status_code, 200)
        docs = self.store.table("documents").select("*").execute().data
        self.assertEqual({d["visibility"] for d in docs}, {"shared_draft"})
        self.assertEqual(self.store.table("credit_ledger").select("*").execute().data, [])

    def test_student_cannot_upload_to_shared(self):
        r = self.client.post("/api/v1/documents/upload", json={"title": "A", "raw_content": "x", "shared": True})
        self.assertEqual(r.status_code, 403)

    def test_shared_document_readable_but_not_writable_by_students(self):
        doc = {"id": "doc-shared", "user_id": OTHER, "title": "Cambridge", "processing_status": "completed",
               "visibility": "shared"}
        self.store.table("documents").insert(doc).execute()
        listed = self.client.get("/api/v1/documents/").json()["documents"]
        self.assertEqual([d["id"] for d in listed], ["doc-shared"])
        self.assertTrue(listed[0]["is_shared"])
        self.assertEqual(self.client.get("/api/v1/documents/doc-shared/status").status_code, 200)
        self.assertEqual(self.client.delete("/api/v1/documents/doc-shared").status_code, 404)
        self.store.table("documents").update({"visibility": "shared_draft"}).eq("id", "doc-shared").execute()
        self.assertEqual(self.client.get("/api/v1/documents/doc-shared/status").status_code, 404)


class OrderAndWebhookTests(BillingTestCase):
    def create_order(self):
        res = self.client.post("/api/v1/billing/orders", json={"pack_id": self.pack["id"]})
        self.assertEqual(res.status_code, 200, res.text)
        return res.json()["order"]

    def test_order_has_code_and_vietqr(self):
        order = self.create_order()
        self.assertRegex(order["code"], r"^STD[A-Z0-9]{6}$")
        self.assertIn("img.vietqr.io/image/970422-0123456789", order["payment"]["qr_url"])
        self.assertIn(order["code"], order["payment"]["qr_url"])
        # tạo lại cùng gói → dùng lại mã cũ
        self.assertEqual(self.create_order()["code"], order["code"])

    def test_webhook_matches_code_and_adds_credits_once(self):
        order = self.create_order()
        payload = {"id": 9001, "transferType": "in", "transferAmount": 99000, "code": None,
                   "content": f"MBVCB.123 {order['code'][:5]} {order['code'][5:]} chuyen tien"}
        res = self.webhook(payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {"success": True})
        got = self.client.get(f"/api/v1/billing/orders/{order['id']}").json()["order"]
        self.assertEqual(got["status"], "paid")
        self.assertEqual(got["paid_method"], "webhook")
        self.assertEqual(self.client.get("/api/v1/account/me").json()["quota"]["remaining"], 11)
        # SePay gửi lại cùng giao dịch → không cộng thêm
        self.webhook(payload)
        self.assertEqual(self.client.get("/api/v1/account/me").json()["quota"]["remaining"], 11)

    def test_underpaid_goes_to_review_and_admin_can_confirm(self):
        order = self.create_order()
        self.webhook({"id": 9002, "transferType": "in", "transferAmount": 50000, "code": order["code"], "content": order["code"]})
        self.assertEqual(billing.get_order(order["id"])["status"], "review")
        self.assertEqual(self.client.get("/api/v1/account/me").json()["quota"]["remaining"], 1)
        self.make_admin()
        res = self.client.post(f"/api/v1/admin/orders/{order['id']}/confirm", json={"note": "Đã nhận đủ"})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(billing.quota(DEMO, "student")["purchased"], 10)

    def test_webhook_rejects_bad_key_and_ignores_outgoing(self):
        self.assertEqual(self.webhook({"id": 1, "transferType": "in"}, key="wrong").status_code, 401)
        self.assertEqual(self.webhook({"id": 2, "transferType": "out", "transferAmount": 5}).status_code, 200)
        self.assertEqual(self.store.table("payment_transactions").select("*").execute().data, [])

    def ipn(self, order_code, amount, txn="T1", key="gw-secret", kind="ORDER_PAID"):
        payload = {"timestamp": 1, "notification_type": kind,
                   "order": {"order_invoice_number": order_code, "order_amount": f"{amount}.00"},
                   "transaction": {"transaction_id": txn, "transaction_status": "APPROVED", "transaction_amount": str(amount)}}
        return self.client.post("/api/v1/billing/webhook/sepay-ipn", json=payload, headers={"X-Secret-Key": key})

    def test_gateway_checkout_is_signed_and_ipn_pays_order_once(self):
        import base64
        with patch.object(settings, "SEPAY_MERCHANT_ID", "SP-TEST"), patch.object(settings, "SEPAY_SECRET_KEY", "gw-secret"):
            order = self.create_order()
            gw = order["payment"]["gateway"]
            self.assertEqual(gw["action_url"], "https://pay.sepay.vn/v1/checkout/init")
            f = gw["fields"]
            self.assertEqual((f["merchant"], f["order_invoice_number"], f["order_amount"]), ("SP-TEST", order["code"], "99000"))
            signed = ",".join(f"{k}={f[k]}" for k in ("merchant", "operation", "payment_method", "order_amount", "currency",
                                                       "order_invoice_number", "order_description", "success_url", "error_url", "cancel_url"))
            expected = base64.b64encode(hmac.new(b"gw-secret", signed.encode(), hashlib.sha256).digest()).decode()
            self.assertEqual(f["signature"], expected)

            self.assertEqual(self.ipn(order["code"], 99000, key="wrong").status_code, 401)
            self.assertEqual(self.ipn(order["code"], 99000).json(), {"success": True})
            self.assertEqual(billing.get_order(order["id"])["status"], "paid")
            self.assertEqual(self.client.get("/api/v1/account/me").json()["quota"]["remaining"], 11)
            self.ipn(order["code"], 99000)  # gửi lại cùng giao dịch
            self.assertEqual(self.client.get("/api/v1/account/me").json()["quota"]["remaining"], 11)

    def test_gateway_ipn_underpaid_and_ignored_types(self):
        with patch.object(settings, "SEPAY_MERCHANT_ID", "SP-TEST"), patch.object(settings, "SEPAY_SECRET_KEY", "gw-secret"):
            order = self.create_order()
            self.ipn(order["code"], 1000, txn="T2")
            self.assertEqual(billing.get_order(order["id"])["status"], "review")
            self.ipn(order["code"], 99000, txn="T3", kind="TRANSACTION_VOID")
            self.assertEqual(billing.get_order(order["id"])["status"], "review")

    def test_hmac_signature(self):
        body = json.dumps({"id": 3, "transferType": "in", "transferAmount": 1000, "content": "no code"}).encode()
        ts = str(int(time.time()))
        sig = "sha256=" + hmac.new(b"s3cret", f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
        with patch.object(settings, "SEPAY_WEBHOOK_SECRET", "s3cret"):
            ok = self.client.post("/api/v1/billing/webhook/sepay", content=body,
                                  headers={"X-SePay-Signature": sig, "X-SePay-Timestamp": ts})
            bad = self.client.post("/api/v1/billing/webhook/sepay", content=body,
                                   headers={"X-SePay-Signature": "sha256=00", "X-SePay-Timestamp": ts})
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(bad.status_code, 401)
        tx = self.store.table("payment_transactions").select("*").execute().data
        self.assertEqual(tx[0]["match_status"], "unmatched")


class AdminTests(BillingTestCase):
    def test_student_cannot_open_admin(self):
        self.assertEqual(self.client.get("/api/v1/admin/stats").status_code, 403)

    def test_admin_manages_users(self):
        self.make_admin()
        accounts.ensure_account(OTHER, "hs@email.com")
        users = self.client.get("/api/v1/admin/users", params={"q": "hs@"}).json()["users"]
        self.assertEqual([u["id"] for u in users], [OTHER])
        res = self.client.post(f"/api/v1/admin/users/{OTHER}/credits", json={"delta": 2, "reason": "bù lỗi"})
        self.assertEqual(res.json()["quota"]["remaining"], 3)
        self.assertEqual(self.client.patch(f"/api/v1/admin/users/{OTHER}", json={"status": "locked"}).status_code, 200)
        self.assertEqual(accounts.get_account(OTHER)["status"], "locked")
        # Không tự khoá / tự hạ quyền
        self.assertEqual(self.client.patch(f"/api/v1/admin/users/{DEMO}", json={"status": "locked"}).status_code, 400)
        self.assertEqual(self.client.patch(f"/api/v1/admin/users/{DEMO}", json={"role": "student"}).status_code, 400)

    def test_locked_account_is_rejected(self):
        accounts.ensure_account(DEMO)
        self.store.table("user_accounts").update({"status": "locked"}).eq("id", DEMO).execute()
        accounts.invalidate()
        self.assertEqual(self.client.get("/api/v1/account/me").status_code, 403)

    def test_pack_cannot_be_sold_without_price(self):
        self.make_admin()
        res = self.client.post("/api/v1/admin/packs", json={"name": "X", "books": 3, "price_vnd": 0, "active": True})
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
