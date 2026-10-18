"""
Tài khoản của tôi, gói lượt upload, đơn thanh toán và webhook ngân hàng.
"""
import json
import logging

from fastapi import APIRouter, HTTPException, Request, Response
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

from app.core.accounts import current_account
from app.core.auth import current_user_id
from app.services import billing

logger = logging.getLogger("studia.billing.api")

account_router = APIRouter(prefix="/account", tags=["Account"])
router = APIRouter(prefix="/billing", tags=["Billing"])
public_router = APIRouter(prefix="/billing", tags=["Billing public"])
webhook_router = APIRouter(prefix="/billing/webhook", tags=["Billing webhook"])


@account_router.get("/me")
def get_me():
    acc = current_account()
    return {
        "id": acc.get("id"),
        "email": acc.get("email"),
        "full_name": acc.get("full_name"),
        "role": acc.get("role", "student"),
        "status": acc.get("status", "active"),
        "quota": billing.quota(acc["id"], acc.get("role")),
    }


@public_router.get("/public-packs")
def get_public_packs(response: Response):
    """Gói đang bán cho trang giới thiệu (xem được khi chưa đăng nhập). Gói chưa mở bán chỉ trả tên và số sách, không có giá."""
    response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
    all_packs = billing.list_packs(include_inactive=True)
    on_sale = [p for p in all_packs if p.get("active") and int(p.get("price_vnd") or 0) > 0]
    upcoming = [p for p in all_packs if p not in on_sale]
    pick = ("id", "name", "books", "price_vnd", "description", "highlight")
    return {
        "packs": [{k: p.get(k) for k in pick} for p in on_sale],
        "upcoming": [{k: p.get(k) for k in ("name", "books", "description", "highlight")} for p in upcoming],
        "free_books": billing.free_book_limit(),
        "payments_ready": billing.payments_configured(),
    }


@router.get("/packs")
def get_packs():
    packs = billing.list_packs()
    return {
        "packs": [{k: p.get(k) for k in ("id", "name", "books", "price_vnd", "description", "highlight")} for p in packs],
        "bank_configured": billing.payments_configured(),
    }


@router.get("/ledger")
def get_ledger():
    uid = current_user_id()
    rows = billing.ledger_rows(uid)
    return {"ledger": [{k: r.get(k) for k in ("id", "delta", "reason", "note", "created_at", "order_id", "document_id")} for r in rows]}


class CreateOrderRequest(BaseModel):
    pack_id: str


@router.post("/orders")
def create_order(req: CreateOrderRequest):
    acc = current_account()
    if acc.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Tài khoản quản lý không cần mua lượt")
    order = billing.create_order(acc["id"], req.pack_id)
    return {"order": billing.order_view(order)}


@router.get("/orders")
def list_orders():
    uid = current_user_id()
    return {"orders": [billing.order_view(o, with_payment=False) for o in billing.user_orders(uid)]}


def _own_order(order_id: str) -> dict:
    order = billing.get_order(order_id)
    if str(order.get("user_id")) != current_user_id():
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn")
    return order


@router.get("/orders/{order_id}")
def get_order(order_id: str):
    order = _own_order(order_id)
    view = billing.order_view(order)
    if view.get("status") == "paid":
        view["quota"] = billing.quota(order["user_id"])
    return {"order": view}


@router.post("/orders/{order_id}/cancel")
def cancel_order(order_id: str):
    return {"order": billing.order_view(billing.cancel_order(_own_order(order_id)), with_payment=False)}


# ---------------- webhook: không dùng token người dùng, xác thực bằng API key/HMAC của SePay
@webhook_router.post("/sepay")
async def sepay_webhook(request: Request):
    raw = await request.body()
    billing.verify_sepay(dict(request.headers), raw)
    try:
        payload = json.loads(raw.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Body không phải JSON")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Body không hợp lệ")
    try:
        result = await run_in_threadpool(billing.handle_sepay, payload)
        logger.info(f"SePay webhook {payload.get('id')}: {result}")
    except HTTPException:
        raise
    except Exception as e:
        # Lỗi phía mình (DB...) → trả 500 để SePay gửi lại sau
        logger.exception(f"SePay webhook error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi xử lý giao dịch")
    # SePay chỉ coi là thành công khi body đúng {"success": true}
    return {"success": True}


@webhook_router.post("/sepay-ipn")
async def sepay_gateway_ipn(request: Request):
    """IPN của Cổng thanh toán SePay (khác webhook biến động số dư ở trên)."""
    billing.verify_sepay_ipn(dict(request.headers))
    try:
        payload = json.loads((await request.body()).decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        raise HTTPException(status_code=400, detail="Body không phải JSON")
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Body không hợp lệ")
    try:
        result = await run_in_threadpool(billing.handle_sepay_ipn, payload)
        logger.info(f"SePay IPN: {result}")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"SePay IPN error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi xử lý giao dịch")
    return {"success": True}
