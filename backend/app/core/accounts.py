"""
Tài khoản & vai trò.

- Mỗi người dùng Supabase có một dòng `user_accounts` (tạo ở request đầu tiên): role = 'student' | 'admin',
  status = 'active' | 'locked'.
- Quản lý đầu tiên được chỉ định bằng ADMIN_EMAILS / ADMIN_USER_IDS trong .env (luôn được nâng lên admin).
- Kết quả tra cứu được cache ngắn trong tiến trình để không đọc DB ở mọi request.
"""
from __future__ import annotations

import logging
import threading
import time
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException

from app.config import settings

logger = logging.getLogger("studia.accounts")

ROLES = ("student", "admin")
STATUSES = ("active", "locked")

_current_email: ContextVar[Optional[str]] = ContextVar("current_email", default=None)
_cache: dict[str, tuple[float, dict]] = {}
_cache_lock = threading.Lock()
CACHE_TTL_SECONDS = 60
LAST_SEEN_EVERY_SECONDS = 600


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _db():
    from app.core.supabase_client import get_supabase_client
    db = get_supabase_client()
    if not db:
        raise HTTPException(status_code=503, detail="Cơ sở dữ liệu không khả dụng")
    return db


def set_current_email(email: Optional[str]) -> None:
    _current_email.set((email or "").strip().lower() or None)


def _is_bootstrap_admin(uid: str, email: Optional[str]) -> bool:
    ids = {x.strip() for x in settings.ADMIN_USER_IDS.split(",") if x.strip()}
    emails = {x.strip().lower() for x in settings.ADMIN_EMAILS.split(",") if x.strip()}
    return uid in ids or bool(email and email.lower() in emails)


def invalidate(uid: Optional[str] = None) -> None:
    with _cache_lock:
        if uid is None:
            _cache.clear()
        else:
            _cache.pop(uid, None)


def ensure_account(uid: str, email: Optional[str] = None) -> dict:
    """Đọc (hoặc tạo) tài khoản của uid. Không dùng cache."""
    db = _db()
    rows = db.table("user_accounts").select("*").eq("id", uid).limit(1).execute().data or []
    bootstrap = _is_bootstrap_admin(uid, email)
    if not rows:
        acc = {
            "id": uid,
            "email": email,
            "role": "admin" if bootstrap else "student",
            "status": "active",
            "created_at": _now_iso(),
            "last_seen_at": _now_iso(),
        }
        db.table("user_accounts").insert(acc).execute()
        logger.info(f"Created account {uid} role={acc['role']}")
        return acc

    acc = dict(rows[0])
    acc.setdefault("role", "student")
    acc.setdefault("status", "active")
    updates: dict = {}
    if bootstrap and acc.get("role") != "admin":
        updates["role"] = "admin"
    if email and acc.get("email") != email:
        updates["email"] = email
    last_seen = acc.get("last_seen_at")
    try:
        stale = (not last_seen) or (
            time.time() - datetime.fromisoformat(str(last_seen).replace("Z", "+00:00")).timestamp()
            > LAST_SEEN_EVERY_SECONDS
        )
    except ValueError:
        stale = True
    if stale:
        updates["last_seen_at"] = _now_iso()
    if updates:
        try:
            db.table("user_accounts").update(updates).eq("id", uid).execute()
        except Exception as e:  # không chặn request chỉ vì không cập nhật được last_seen
            logger.warning(f"Cannot update account {uid}: {e}")
        acc.update(updates)
    return acc


def get_account(uid: str, email: Optional[str] = None) -> dict:
    now = time.time()
    with _cache_lock:
        hit = _cache.get(uid)
        if hit and hit[0] > now:
            return hit[1]
    acc = ensure_account(uid, email)
    with _cache_lock:
        _cache[uid] = (now + CACHE_TTL_SECONDS, acc)
    return acc


def check_active(uid: str) -> dict:
    """Gọi trong require_user: chặn tài khoản bị khoá."""
    acc = get_account(uid, _current_email.get())
    if acc.get("status") == "locked":
        raise HTTPException(status_code=403, detail="Tài khoản đã bị khoá. Liên hệ quản lý để được hỗ trợ.")
    return acc


def current_account() -> dict:
    from app.core.auth import current_user_id
    return get_account(current_user_id(), _current_email.get())


def is_admin(uid: Optional[str] = None) -> bool:
    if uid is None:
        acc = current_account()
    else:
        acc = get_account(uid)
    return acc.get("role") == "admin"


async def require_admin() -> str:
    """Dependency cho router quản trị (đặt sau require_user)."""
    from fastapi.concurrency import run_in_threadpool
    from app.core.auth import current_user_id

    uid = current_user_id()
    acc = await run_in_threadpool(get_account, uid, _current_email.get())
    if acc.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Chỉ quản lý mới dùng được chức năng này")
    return uid
