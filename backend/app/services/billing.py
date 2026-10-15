"""
Lượt upload sách & thanh toán chuyển khoản.

Quy tắc:
  * Học sinh: số lượt còn = free_book_limit + tổng delta trong credit_ledger.
      - Mỗi lần tải một cuốn sách mới: -1 (reason 'upload'). Xử lý lại sách không tốn lượt. Xoá sách không hoàn lượt.
      - Mua gói: +books (reason 'purchase', mỗi đơn tối đa một lần).
      - Quản lý điều chỉnh tay: ±N (reason 'admin_adjust', bắt buộc ghi lý do).
  * Quản lý: không giới hạn, không ghi sổ khi upload.
  * Đơn hàng có mã nội dung riêng (PAYMENT_CODE_PREFIX + 6 ký tự). Webhook ngân hàng (SePay) khớp mã + đủ tiền
    thì tự duyệt; thiếu tiền hoặc không có mã thì chờ quản lý kiểm tra. Đơn đã hết hạn mà tiền vẫn về đúng thì
    vẫn được duyệt (người học không bị mất tiền vì chuyển chậm).
"""
from __future__ import annotations

import hashlib
import hmac
import logging
import re
import secrets
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from urllib.parse import quote

from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger("studia.billing")

DEFAULT_SETTINGS: dict[str, Any] = {
    "free_book_limit": 1,
    "order_ttl_minutes": 15,
    "bank": {"bank_id": "", "account_no": "", "account_name": ""},
}
ORDER_STATUSES = ("pending", "paid", "review", "expired", "cancelled", "rejected")
CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # bỏ I, O, 0, 1 cho dễ đọc
CODE_LEN = 6
MAX_PENDING_ORDERS = 3


# ---------------------------------------------------------------- helpers
def _db():
    from app.core.supabase_client import get_supabase_client
    db = get_supabase_client()
    if not db:
        raise HTTPException(status_code=503, detail="Cơ sở dữ liệu không khả dụng")
    return db


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: Optional[datetime] = None) -> str:
    return (dt or _now()).isoformat()


def _parse_dt(v: Any) -> Optional[datetime]:
    if not v:
        return None
    try:
        dt = datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _int(v: Any, default: int = 0) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


# ---------------------------------------------------------------- settings
def get_setting(key: str) -> Any:
    rows = _db().table("app_settings").select("*").eq("key", key).limit(1).execute().data or []
    if rows and rows[0].get("value") is not None:
        return rows[0]["value"]
    return DEFAULT_SETTINGS.get(key)


def set_setting(key: str, value: Any) -> None:
    _db().table("app_settings").upsert({"key": key, "value": value, "updated_at": _iso()}, on_conflict="key").execute()


def free_book_limit() -> int:
    return max(0, _int(get_setting("free_book_limit"), 1))


def bank_info() -> dict:
    b = get_setting("bank") or {}
    return {
        "bank_id": str(b.get("bank_id") or "").strip(),
        "account_no": str(b.get("account_no") or "").strip(),
        "account_name": str(b.get("account_name") or "").strip(),
    }


def bank_configured() -> bool:
    b = bank_info()
    return bool(b["bank_id"] and b["account_no"])


# ---------------------------------------------------------------- quota
def ledger_rows(uid: str) -> list[dict]:
    return _db().table("credit_ledger").select("*").eq("user_id", uid).order("created_at", desc=True).execute().data or []


def quota(uid: str, role: Optional[str] = None) -> dict:
    if role is None:
        from app.core.accounts import get_account
        role = get_account(uid).get("role", "student")
    rows = ledger_rows(uid)
    purchased = sum(_int(r.get("delta")) for r in rows if r.get("reason") == "purchase")
    used = -sum(_int(r.get("delta")) for r in rows if r.get("reason") == "upload")
    adjusted = sum(_int(r.get("delta")) for r in rows if r.get("reason") in ("admin_adjust", "refund"))
    free = free_book_limit()
    remaining = free + purchased - used + adjusted
    return {
        "unlimited": role == "admin",
        "free": free,
        "purchased": purchased,
        "adjusted": adjusted,
        "used": used,
        "remaining": max(0, remaining),
    }


def consume_upload_credit(uid: str, title: str) -> Optional[str]:
    """
    Trừ 1 lượt trước khi tạo tài liệu. Quản lý: không trừ. Hết lượt: 402.
    Trả về id dòng sổ (để gắn document_id hoặc hoàn lại nếu tạo tài liệu thất bại).
    """
    from app.core.accounts import get_account
    acc = get_account(uid)
    if acc.get("role") == "admin":
        return None
    q = quota(uid, acc.get("role"))
    if q["remaining"] <= 0:
        raise HTTPException(
            status_code=402,
            detail="Bạn đã dùng hết lượt upload sách. Mua thêm lượt trong mục Gói & lượt upload để tải sách mới.",
        )
    row = {"user_id": uid, "delta": -1, "reason": "upload", "note": (title or "")[:200], "created_at": _iso()}
    res = _db().table("credit_ledger").insert(row).execute()
    data = getattr(res, "data", None) or [row]
    return data[0].get("id")


def attach_document(ledger_id: Optional[str], document_id: str) -> None:
    if ledger_id:
        try:
            _db().table("credit_ledger").update({"document_id": document_id}).eq("id", ledger_id).execute()
        except Exception as e:
            logger.warning(f"Cannot link ledger {ledger_id} to document {document_id}: {e}")


def refund_upload(ledger_id: Optional[str]) -> None:
    """Hoàn lượt khi tài liệu không tạo được (lỗi ngay khi ghi). Xoá dòng trừ thay vì ghi dòng hoàn."""
    if ledger_id:
        _db().table("credit_ledger").delete().eq("id", ledger_id).execute()


def admin_adjust(uid: str, delta: int, reason_note: str, actor_id: str) -> dict:
    if delta == 0:
        raise HTTPException(status_code=400, detail="Số lượt điều chỉnh phải khác 0")
    if abs(delta) > 10000:
        raise HTTPException(status_code=400, detail="Số lượt điều chỉnh quá lớn")
    note = (reason_note or "").strip()
    if not note:
        raise HTTPException(status_code=400, detail="Cần ghi lý do điều chỉnh")
    row = {"user_id": uid, "delta": int(delta), "reason": "admin_adjust", "note": note[:300],
           "actor_id": actor_id, "created_at": _iso()}
    _db().table("credit_ledger").insert(row).execute()
    return quota(uid)


# ---------------------------------------------------------------- packs
def list_packs(include_inactive: bool = False) -> list[dict]:
    rows = _db().table("credit_packs").select("*").order("sort_order").execute().data or []
    if not include_inactive:
        rows = [r for r in rows if r.get("active") and _int(r.get("price_vnd")) > 0]
    return rows


def get_pack(pack_id: str) -> dict:
    rows = _db().table("credit_packs").select("*").eq("id", pack_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy gói")
    return rows[0]


def validate_pack(data: dict, partial: bool = False) -> dict:
    out: dict = {}
    if "name" in data or not partial:
        name = str(data.get("name") or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Tên gói không được để trống")
        out["name"] = name[:80]
    if "books" in data or not partial:
        books = _int(data.get("books"), 0)
        if books <= 0 or books > 1000:
            raise HTTPException(status_code=400, detail="Số sách của gói phải từ 1 đến 1000")
        out["books"] = books
    if "price_vnd" in data or not partial:
        price = _int(data.get("price_vnd"), -1)
        if price < 0 or price > 1_000_000_000:
            raise HTTPException(status_code=400, detail="Giá không hợp lệ")
        out["price_vnd"] = price
    for k in ("description",):
        if k in data:
            out[k] = (str(data.get(k) or "").strip() or None)
    for k in ("highlight", "active"):
        if k in data:
            out[k] = bool(data.get(k))
    if "sort_order" in data:
        out["sort_order"] = _int(data.get("sort_order"), 0)
    if out.get("active") and out.get("price_vnd", 1) == 0:
        raise HTTPException(status_code=400, detail="Đặt giá lớn hơn 0 trước khi mở bán gói")
    return out


# ---------------------------------------------------------------- orders
def _new_code() -> str:
    prefix = (settings.PAYMENT_CODE_PREFIX or "STD").upper()
    db = _db()
    for _ in range(10):
        code = prefix + "".join(secrets.choice(CODE_ALPHABET) for _ in range(CODE_LEN))
        if not (db.table("payment_orders").select("id").eq("code", code).limit(1).execute().data or []):
            return code
    raise HTTPException(status_code=500, detail="Không tạo được mã thanh toán, thử lại")


def qr_url(order: dict) -> Optional[str]:
    b = bank_info()
    if not (b["bank_id"] and b["account_no"]):
        return None
    url = (f"https://img.vietqr.io/image/{quote(b['bank_id'])}-{quote(b['account_no'])}-compact2.png"
           f"?amount={_int(order.get('amount_vnd'))}&addInfo={quote(order.get('code') or '')}")
    if b["account_name"]:
        url += f"&accountName={quote(b['account_name'])}"
    return url


def refresh_status(order: dict) -> dict:
    """Đơn chờ quá hạn → 'expired' (vẫn có thể được duyệt nếu tiền về sau)."""
    if order.get("status") == "pending":
        exp = _parse_dt(order.get("expires_at"))
        if exp and exp < _now():
            _db().table("payment_orders").update({"status": "expired", "updated_at": _iso()}).eq("id", order["id"]).execute()
            order = {**order, "status": "expired"}
    return order


def order_view(order: dict, with_payment: bool = True) -> dict:
    order = refresh_status(order)
    view = {k: order.get(k) for k in (
        "id", "user_id", "pack_id", "pack_name", "books", "amount_vnd", "code", "status", "paid_method",
        "paid_amount_vnd", "paid_at", "note", "expires_at", "created_at", "updated_at", "approved_by")}
    if with_payment and order.get("status") == "pending":
        b = bank_info()
        view["payment"] = {**b, "amount_vnd": order.get("amount_vnd"), "content": order.get("code"), "qr_url": qr_url(order)}
    return view


def create_order(uid: str, pack_id: str) -> dict:
    if not bank_configured():
        raise HTTPException(status_code=503, detail="Quản lý chưa cấu hình tài khoản nhận tiền. Vui lòng quay lại sau.")
    pack = get_pack(pack_id)
    if not pack.get("active") or _int(pack.get("price_vnd")) <= 0:
        raise HTTPException(status_code=400, detail="Gói này hiện không mở bán")
    db = _db()
    pending = [refresh_status(o) for o in
               (db.table("payment_orders").select("*").eq("user_id", uid).eq("status", "pending").execute().data or [])]
    pending = [o for o in pending if o.get("status") == "pending"]
    # Đang có đơn chờ cùng gói, cùng giá → dùng lại mã cũ (tránh hai mã cho một lần chuyển)
    for o in pending:
        if str(o.get("pack_id")) == str(pack_id) and _int(o.get("amount_vnd")) == _int(pack.get("price_vnd")):
            return o
    if len(pending) >= MAX_PENDING_ORDERS:
        raise HTTPException(status_code=429, detail="Bạn có quá nhiều đơn đang chờ. Huỷ bớt đơn cũ rồi thử lại.")
    ttl = max(5, _int(get_setting("order_ttl_minutes"), 15))
    now = _now()
    order = {
        "user_id": uid,
        "pack_id": pack["id"],
        "pack_name": pack.get("name") or f"+{pack.get('books')} sách",
        "books": _int(pack.get("books")),
        "amount_vnd": _int(pack.get("price_vnd")),
        "code": _new_code(),
        "status": "pending",
        "expires_at": _iso(now + timedelta(minutes=ttl)),
        "created_at": _iso(now),
        "updated_at": _iso(now),
    }
    res = db.table("payment_orders").insert(order).execute()
    data = getattr(res, "data", None) or [order]
    return {**order, **data[0]}


def get_order(order_id: str) -> dict:
    rows = _db().table("payment_orders").select("*").eq("id", order_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn")
    return rows[0]


def user_orders(uid: str, limit: int = 50) -> list[dict]:
    rows = _db().table("payment_orders").select("*").eq("user_id", uid).order("created_at", desc=True).limit(limit).execute().data or []
    return rows


def cancel_order(order: dict) -> dict:
    order = refresh_status(order)
    if order.get("status") not in ("pending", "expired"):
        raise HTTPException(status_code=409, detail="Đơn này không huỷ được")
    _db().table("payment_orders").update({"status": "cancelled", "updated_at": _iso()}).eq("id", order["id"]).execute()
    return {**order, "status": "cancelled"}


def mark_paid(order: dict, method: str, paid_amount: Optional[int] = None,
              actor_id: Optional[str] = None, note: Optional[str] = None) -> dict:
    """Duyệt đơn và cộng lượt. Idempotent: gọi lại với đơn đã paid không cộng thêm."""
    db = _db()
    fresh = get_order(order["id"])
    if fresh.get("status") == "paid":
        return fresh
    if fresh.get("status") in ("cancelled", "rejected") and method == "webhook":
        # Tiền về cho đơn đã huỷ/bị từ chối: không tự cộng, để quản lý quyết định
        db.table("payment_orders").update({"status": "review", "note": "Tiền về sau khi đơn đã huỷ/từ chối",
                                           "paid_amount_vnd": paid_amount, "updated_at": _iso()}).eq("id", fresh["id"]).execute()
        return {**fresh, "status": "review"}
    updates = {
        "status": "paid",
        "paid_method": method,
        "paid_amount_vnd": paid_amount if paid_amount is not None else fresh.get("amount_vnd"),
        "paid_at": _iso(),
        "updated_at": _iso(),
    }
    if actor_id:
        updates["approved_by"] = actor_id
    if note:
        updates["note"] = note[:300]
    db.table("payment_orders").update(updates).eq("id", fresh["id"]).execute()
    already = db.table("credit_ledger").select("id").eq("order_id", fresh["id"]).eq("reason", "purchase").limit(1).execute().data or []
    if not already:
        db.table("credit_ledger").insert({
            "user_id": fresh["user_id"], "delta": _int(fresh.get("books")), "reason": "purchase",
            "note": f"Đơn {fresh.get('code')} · {fresh.get('pack_name')}", "order_id": fresh["id"],
            "actor_id": actor_id, "created_at": _iso(),
        }).execute()
    logger.info(f"Order {fresh.get('code')} paid via {method}")
    return {**fresh, **updates}


def reject_order(order: dict, actor_id: str, note: str = "") -> dict:
    if order.get("status") == "paid":
        raise HTTPException(status_code=409, detail="Đơn đã thanh toán, không từ chối được. Dùng điều chỉnh lượt nếu cần.")
    upd = {"status": "rejected", "approved_by": actor_id, "note": (note or "")[:300] or None, "updated_at": _iso()}
    _db().table("payment_orders").update(upd).eq("id", order["id"]).execute()
    return {**order, **upd}


# ---------------------------------------------------------------- webhook (SePay)
def verify_sepay(headers: dict, raw_body: bytes) -> None:
    """Xác thực webhook: API key (Authorization: Apikey ...) hoặc HMAC-SHA256 (X-SePay-Signature)."""
    h = {k.lower(): v for k, v in headers.items()}
    if settings.SEPAY_WEBHOOK_SECRET:
        sig = h.get("x-sepay-signature", "")
        ts = h.get("x-sepay-timestamp", "")
        if not sig or not ts:
            raise HTTPException(status_code=401, detail="Thiếu chữ ký")
        try:
            if abs(time.time() - int(ts)) > 600:
                raise HTTPException(status_code=401, detail="Chữ ký hết hạn")
        except ValueError:
            raise HTTPException(status_code=401, detail="Timestamp không hợp lệ")
        expected = "sha256=" + hmac.new(settings.SEPAY_WEBHOOK_SECRET.encode(), f"{ts}.".encode() + raw_body,
                                        hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig.strip()):
            raise HTTPException(status_code=401, detail="Chữ ký không hợp lệ")
        return
    if settings.SEPAY_API_KEY:
        auth = h.get("authorization", "")
        if not hmac.compare_digest(auth.strip(), f"Apikey {settings.SEPAY_API_KEY}"):
            raise HTTPException(status_code=401, detail="API key không hợp lệ")
        return
    raise HTTPException(status_code=503, detail="Webhook thanh toán chưa được cấu hình")


def extract_code(code_field: Any, content: str) -> Optional[str]:
    prefix = re.escape((settings.PAYMENT_CODE_PREFIX or "STD").upper())
    pat = re.compile(prefix + r"[A-Z0-9]{%d}" % CODE_LEN)
    if isinstance(code_field, str) and code_field.strip():
        m = pat.search(code_field.upper())
        if m:
            return m.group(0)
    text = (content or "").upper()
    m = pat.search(text)
    if m:
        return m.group(0)
    # Một số ngân hàng chèn dấu cách/gạch giữa nội dung → thử lại sau khi bỏ ký tự phân cách
    m = pat.search(re.sub(r"[^A-Z0-9]", "", text))
    return m.group(0) if m else None


def handle_sepay(payload: dict) -> dict:
    """Xử lý một giao dịch SePay. Luôn trả về dict mô tả kết quả (endpoint vẫn trả success để SePay không gửi lại)."""
    if str(payload.get("transferType") or "").lower() != "in":
        return {"result": "ignored_out"}
    txn_id = str(payload.get("id") or "").strip()
    if not txn_id:
        return {"result": "ignored_no_id"}
    db = _db()
    exists = db.table("payment_transactions").select("id").eq("provider", "sepay").eq("provider_txn_id", txn_id).limit(1).execute().data or []
    if exists:
        return {"result": "duplicate"}

    amount = _int(payload.get("transferAmount"))
    content = str(payload.get("content") or payload.get("description") or "")
    code = extract_code(payload.get("code"), content)
    tx = {
        "provider": "sepay", "provider_txn_id": txn_id, "amount_vnd": amount, "content": content[:500],
        "code": code, "match_status": "unmatched", "order_id": None, "raw": payload, "received_at": _iso(),
    }
    order = None
    if code:
        rows = db.table("payment_orders").select("*").eq("code", code).limit(1).execute().data or []
        order = rows[0] if rows else None

    if order:
        tx["order_id"] = order["id"]
        if order.get("status") == "paid":
            tx["match_status"] = "duplicate_order"
        elif amount >= _int(order.get("amount_vnd")):
            tx["match_status"] = "matched"
        else:
            tx["match_status"] = "underpaid"
    db.table("payment_transactions").insert(tx).execute()

    if order and tx["match_status"] == "matched":
        mark_paid(order, "webhook", paid_amount=amount)
    elif order and tx["match_status"] == "underpaid":
        db.table("payment_orders").update({
            "status": "review", "paid_amount_vnd": amount, "updated_at": _iso(),
            "note": f"Thiếu tiền: nhận {amount}đ / cần {_int(order.get('amount_vnd'))}đ",
        }).eq("id", order["id"]).execute()
    return {"result": tx["match_status"], "code": code}


def assign_transaction(tx_id: str, order_id: str, actor_id: str) -> dict:
    db = _db()
    rows = db.table("payment_transactions").select("*").eq("id", tx_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy giao dịch")
    tx = rows[0]
    if tx.get("match_status") in ("matched", "assigned"):
        raise HTTPException(status_code=409, detail="Giao dịch đã được gán cho đơn")
    order = get_order(order_id)
    if order.get("status") == "paid":
        raise HTTPException(status_code=409, detail="Đơn này đã thanh toán")
    db.table("payment_transactions").update({"match_status": "assigned", "order_id": order_id}).eq("id", tx_id).execute()
    return mark_paid(order, "manual", paid_amount=_int(tx.get("amount_vnd")), actor_id=actor_id,
                     note=f"Gán giao dịch {tx.get('provider_txn_id')}")


def ignore_transaction(tx_id: str) -> None:
    _db().table("payment_transactions").update({"match_status": "ignored"}).eq("id", tx_id).execute()
