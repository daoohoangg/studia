"""
Quản trị: tài khoản, vai trò, lượt upload, đơn thanh toán, gói, cài đặt, thư viện chung.
Mọi route yêu cầu role = admin (đặt dependency ở main.py).
"""
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core import accounts
from app.core.auth import current_user_id
from app.services import billing

router = APIRouter(prefix="/admin", tags=["Admin"])

PAGE_SIZE = 25


def _db():
    return billing._db()


def _int(v, d=0):
    return billing._int(v, d)


def _since(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


# ---------------------------------------------------------------- tổng quan
@router.get("/stats")
def stats():
    db = _db()
    users = db.table("user_accounts").select("id, role, status, created_at").execute().data or []
    orders = db.table("payment_orders").select("*").execute().data or []
    docs = db.table("documents").select("id, processing_status").execute().data or []
    txs = db.table("payment_transactions").select("id, match_status, received_at").order("received_at", desc=True).limit(200).execute().data or []

    since30 = _since(30)
    paid = [o for o in orders if o.get("status") == "paid"]
    paid30 = [o for o in paid if (billing._parse_dt(o.get("paid_at")) or since30) >= since30]
    by_day: dict = defaultdict(int)
    since14 = _since(14).date()
    for o in paid:
        d = billing._parse_dt(o.get("paid_at"))
        if d and d.date() >= since14:
            by_day[d.date().isoformat()] += _int(o.get("paid_amount_vnd") or o.get("amount_vnd"))
    days = [(_since(13 - i)).date().isoformat() for i in range(14)]
    return {
        "users_total": len(users),
        "users_new_30d": sum(1 for u in users if (billing._parse_dt(u.get("created_at")) or since30) > since30),
        "admins": sum(1 for u in users if u.get("role") == "admin"),
        "locked": sum(1 for u in users if u.get("status") == "locked"),
        "paying_users": len({o.get("user_id") for o in paid}),
        "revenue_30d": sum(_int(o.get("paid_amount_vnd") or o.get("amount_vnd")) for o in paid30),
        "paid_orders_30d": len(paid30),
        "orders_review": sum(1 for o in orders if o.get("status") == "review")
                         + sum(1 for t in txs if t.get("match_status") == "unmatched"),
        "orders_pending": sum(1 for o in orders if o.get("status") == "pending"),
        "auto_matched_30d": sum(1 for o in paid30 if o.get("paid_method") == "webhook"),
        "docs_processing": sum(1 for d in docs if d.get("processing_status") in ("pending", "processing")),
        "docs_failed": sum(1 for d in docs if d.get("processing_status") == "failed"),
        "revenue_by_day": [{"date": d, "amount_vnd": by_day.get(d, 0)} for d in days],
        "last_webhook_at": txs[0].get("received_at") if txs else None,
        "webhook_configured": bool(billing.settings.SEPAY_API_KEY or billing.settings.SEPAY_WEBHOOK_SECRET),
        "bank_configured": billing.bank_configured(),
    }


# ---------------------------------------------------------------- tài khoản
def _user_summaries() -> list[dict]:
    db = _db()
    users = db.table("user_accounts").select("*").order("created_at", desc=True).execute().data or []
    ledger = db.table("credit_ledger").select("user_id, delta, reason").execute().data or []
    orders = db.table("payment_orders").select("user_id, status, amount_vnd, paid_amount_vnd").eq("status", "paid").execute().data or []
    free = billing.free_book_limit()
    agg: dict = defaultdict(lambda: {"bal": 0, "uploads": 0})
    for r in ledger:
        a = agg[str(r.get("user_id"))]
        a["bal"] += _int(r.get("delta"))
        if r.get("reason") == "upload":
            a["uploads"] += 1
    spent: dict = defaultdict(int)
    for o in orders:
        spent[str(o.get("user_id"))] += _int(o.get("paid_amount_vnd") or o.get("amount_vnd"))
    out = []
    for u in users:
        uid = str(u.get("id"))
        is_admin = u.get("role") == "admin"
        out.append({
            "id": uid, "email": u.get("email"), "full_name": u.get("full_name"),
            "role": u.get("role", "student"), "status": u.get("status", "active"),
            "created_at": u.get("created_at"), "last_seen_at": u.get("last_seen_at"),
            "remaining": None if is_admin else max(0, free + agg[uid]["bal"]),
            "uploads": agg[uid]["uploads"], "spent_vnd": spent.get(uid, 0),
        })
    return out


@router.get("/users")
def list_users(q: str = "", role: str = "", status: str = "", paying: bool = False, page: int = 1):
    users = _user_summaries()
    ql = q.strip().lower()
    if ql:
        users = [u for u in users if ql in (u.get("email") or "").lower() or ql in (u.get("full_name") or "").lower() or ql == u["id"]]
    if role in accounts.ROLES:
        users = [u for u in users if u["role"] == role]
    if status in accounts.STATUSES:
        users = [u for u in users if u["status"] == status]
    if paying:
        users = [u for u in users if u["spent_vnd"] > 0]
    total = len(users)
    page = max(1, page)
    return {"users": users[(page - 1) * PAGE_SIZE: page * PAGE_SIZE], "total": total, "page": page, "page_size": PAGE_SIZE}


def _get_user(user_id: str) -> dict:
    rows = _db().table("user_accounts").select("*").eq("id", user_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản")
    return rows[0]


@router.get("/users/{user_id}")
def get_user(user_id: str):
    u = _get_user(user_id)
    db = _db()
    docs = db.table("documents").select("id, title, source_type, processing_status, visibility, created_at") \
        .eq("user_id", user_id).order("created_at", desc=True).execute().data or []
    return {
        "user": u,
        "quota": billing.quota(user_id, u.get("role")),
        "ledger": billing.ledger_rows(user_id)[:100],
        "orders": [billing.order_view(o, with_payment=False) for o in billing.user_orders(user_id, 50)],
        "documents": docs,
    }


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None
    full_name: Optional[str] = None


@router.patch("/users/{user_id}")
def update_user(user_id: str, req: UpdateUserRequest):
    me = current_user_id()
    _get_user(user_id)
    upd: dict = {}
    if req.role is not None:
        if req.role not in accounts.ROLES:
            raise HTTPException(status_code=400, detail="Vai trò không hợp lệ")
        if user_id == me and req.role != "admin":
            raise HTTPException(status_code=400, detail="Bạn không thể tự hạ quyền của chính mình")
        upd["role"] = req.role
    if req.status is not None:
        if req.status not in accounts.STATUSES:
            raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")
        if user_id == me and req.status == "locked":
            raise HTTPException(status_code=400, detail="Bạn không thể tự khoá tài khoản của mình")
        upd["status"] = req.status
    if req.full_name is not None:
        upd["full_name"] = req.full_name.strip()[:120] or None
    if not upd:
        raise HTTPException(status_code=400, detail="Không có gì để cập nhật")
    if upd.get("role") == "student":
        admins = [u for u in (_db().table("user_accounts").select("id, role").eq("role", "admin").execute().data or [])]
        if len(admins) <= 1 and any(str(a.get("id")) == user_id for a in admins):
            raise HTTPException(status_code=400, detail="Phải còn ít nhất một quản lý")
    _db().table("user_accounts").update(upd).eq("id", user_id).execute()
    accounts.invalidate(user_id)
    return {"user": {**_get_user(user_id)}}


class CreditAdjustRequest(BaseModel):
    delta: int
    reason: str


@router.post("/users/{user_id}/credits")
def adjust_credits(user_id: str, req: CreditAdjustRequest):
    _get_user(user_id)
    return {"quota": billing.admin_adjust(user_id, req.delta, req.reason, current_user_id())}


# ---------------------------------------------------------------- đơn & giao dịch
@router.get("/orders")
def list_orders(status: str = "", q: str = "", page: int = 1):
    db = _db()
    orders = db.table("payment_orders").select("*").order("created_at", desc=True).execute().data or []
    orders = [billing.refresh_status(o) for o in orders]
    users = {str(u["id"]): u for u in (db.table("user_accounts").select("id, email, full_name").execute().data or [])}
    if status in billing.ORDER_STATUSES:
        orders = [o for o in orders if o.get("status") == status]
    ql = q.strip().lower()
    if ql:
        orders = [o for o in orders if ql in (o.get("code") or "").lower()
                  or ql in (users.get(str(o.get("user_id")), {}).get("email") or "").lower()]
    total = len(orders)
    page = max(1, page)
    out = []
    for o in orders[(page - 1) * PAGE_SIZE: page * PAGE_SIZE]:
        v = billing.order_view(o, with_payment=False)
        u = users.get(str(o.get("user_id")), {})
        v["user_email"], v["user_name"] = u.get("email"), u.get("full_name")
        out.append(v)
    return {"orders": out, "total": total, "page": page, "page_size": PAGE_SIZE}


class OrderActionRequest(BaseModel):
    note: Optional[str] = None


@router.post("/orders/{order_id}/confirm")
def confirm_order(order_id: str, req: OrderActionRequest):
    order = billing.get_order(order_id)
    if order.get("status") == "paid":
        raise HTTPException(status_code=409, detail="Đơn đã thanh toán")
    return {"order": billing.order_view(billing.mark_paid(order, "manual", actor_id=current_user_id(),
                                                          paid_amount=order.get("paid_amount_vnd"),
                                                          note=req.note or "Quản lý duyệt tay"), with_payment=False)}


@router.post("/orders/{order_id}/reject")
def reject_order(order_id: str, req: OrderActionRequest):
    return {"order": billing.order_view(billing.reject_order(billing.get_order(order_id), current_user_id(), req.note or ""), with_payment=False)}


@router.get("/transactions")
def list_transactions(status: str = "unmatched"):
    db = _db()
    q = db.table("payment_transactions").select("*")
    if status:
        q = q.eq("match_status", status)
    rows = q.order("received_at", desc=True).limit(100).execute().data or []
    return {"transactions": [{k: r.get(k) for k in ("id", "provider", "provider_txn_id", "amount_vnd", "content", "code",
                                                     "match_status", "order_id", "received_at")} for r in rows]}


class AssignRequest(BaseModel):
    order_id: str


@router.post("/transactions/{tx_id}/assign")
def assign_transaction(tx_id: str, req: AssignRequest):
    return {"order": billing.order_view(billing.assign_transaction(tx_id, req.order_id, current_user_id()), with_payment=False)}


@router.post("/transactions/{tx_id}/ignore")
def ignore_transaction(tx_id: str):
    billing.ignore_transaction(tx_id)
    return {"ok": True}


# ---------------------------------------------------------------- gói & cài đặt
@router.get("/packs")
def list_packs():
    return {"packs": billing.list_packs(include_inactive=True)}


class PackRequest(BaseModel):
    name: Optional[str] = None
    books: Optional[int] = None
    price_vnd: Optional[int] = None
    description: Optional[str] = None
    highlight: Optional[bool] = None
    active: Optional[bool] = None
    sort_order: Optional[int] = None


@router.post("/packs")
def create_pack(req: PackRequest):
    data = billing.validate_pack(req.model_dump(exclude_none=True))
    data.setdefault("active", False)
    data.setdefault("highlight", False)
    data.setdefault("sort_order", len(billing.list_packs(include_inactive=True)) + 1)
    now = billing._iso()
    data.update({"created_at": now, "updated_at": now})
    res = _db().table("credit_packs").insert(data).execute()
    return {"pack": (getattr(res, "data", None) or [data])[0]}


@router.patch("/packs/{pack_id}")
def update_pack(pack_id: str, req: PackRequest):
    current = billing.get_pack(pack_id)
    data = billing.validate_pack(req.model_dump(exclude_none=True), partial=True)
    merged_price = data.get("price_vnd", _int(current.get("price_vnd")))
    if data.get("active", current.get("active")) and merged_price <= 0:
        raise HTTPException(status_code=400, detail="Đặt giá lớn hơn 0 trước khi mở bán gói")
    data["updated_at"] = billing._iso()
    _db().table("credit_packs").update(data).eq("id", pack_id).execute()
    return {"pack": billing.get_pack(pack_id)}


@router.delete("/packs/{pack_id}")
def delete_pack(pack_id: str):
    billing.get_pack(pack_id)
    used = _db().table("payment_orders").select("id").eq("pack_id", pack_id).limit(1).execute().data or []
    if used:
        # Đã có đơn dùng gói này → chỉ ngừng bán để giữ lịch sử
        _db().table("credit_packs").update({"active": False, "updated_at": billing._iso()}).eq("id", pack_id).execute()
        return {"deleted": False, "deactivated": True}
    _db().table("credit_packs").delete().eq("id", pack_id).execute()
    return {"deleted": True}


@router.get("/settings")
def get_settings():
    return {
        "free_book_limit": billing.free_book_limit(),
        "order_ttl_minutes": _int(billing.get_setting("order_ttl_minutes"), 15),
        "bank": billing.bank_info(),
        "payment_code_prefix": billing.settings.PAYMENT_CODE_PREFIX,
        "webhook_path": "/api/v1/billing/webhook/sepay",
        "webhook_auth": "hmac" if billing.settings.SEPAY_WEBHOOK_SECRET else "apikey" if billing.settings.SEPAY_API_KEY else None,
    }


class BankSettings(BaseModel):
    bank_id: str = ""
    account_no: str = ""
    account_name: str = ""


class SettingsRequest(BaseModel):
    free_book_limit: Optional[int] = None
    order_ttl_minutes: Optional[int] = None
    bank: Optional[BankSettings] = None


@router.put("/settings")
def put_settings(req: SettingsRequest):
    if req.free_book_limit is not None:
        if not 0 <= req.free_book_limit <= 100:
            raise HTTPException(status_code=400, detail="Số sách miễn phí phải từ 0 đến 100")
        billing.set_setting("free_book_limit", req.free_book_limit)
    if req.order_ttl_minutes is not None:
        if not 5 <= req.order_ttl_minutes <= 1440:
            raise HTTPException(status_code=400, detail="Thời hạn mã thanh toán phải từ 5 đến 1440 phút")
        billing.set_setting("order_ttl_minutes", req.order_ttl_minutes)
    if req.bank is not None:
        b = req.bank
        acct = "".join(ch for ch in b.account_no if ch.isalnum())
        billing.set_setting("bank", {"bank_id": b.bank_id.strip(), "account_no": acct,
                                     "account_name": b.account_name.strip().upper()[:80]})
    return get_settings()


# ---------------------------------------------------------------- thư viện chung
@router.get("/library")
def library(scope: str = "shared"):
    db = _db()
    rows = db.table("documents").select("id, user_id, title, source_type, processing_status, visibility, created_at") \
        .order("created_at", desc=True).execute().data or []
    if scope == "shared":
        rows = [r for r in rows if (r.get("visibility") or "private") in ("shared", "shared_draft")]
    readers: dict = defaultdict(set)
    for p in db.table("reading_progress").select("user_id, document_id").execute().data or []:
        readers[str(p.get("document_id"))].add(str(p.get("user_id")))
    for r in rows:
        r["visibility"] = r.get("visibility") or "private"
        r["readers"] = len(readers.get(str(r["id"]), set()))
    return {"documents": rows}


class VisibilityRequest(BaseModel):
    visibility: str


@router.patch("/documents/{document_id}")
def set_visibility(document_id: str, req: VisibilityRequest):
    if req.visibility not in ("private", "shared", "shared_draft"):
        raise HTTPException(status_code=400, detail="Chế độ hiển thị không hợp lệ")
    rows = _db().table("documents").select("id, processing_status").eq("id", document_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    if req.visibility == "shared" and rows[0].get("processing_status") != "completed":
        raise HTTPException(status_code=409, detail="Sách đang xử lý hoặc bị lỗi, chưa hiện cho học sinh được")
    _db().table("documents").update({"visibility": req.visibility}).eq("id", document_id).execute()
    return {"id": document_id, "visibility": req.visibility}
