"""
Xác thực người dùng qua Supabase Auth JWT.

- `require_user`: dependency gắn ở cấp router, xác thực `Authorization: Bearer <access_token>`.
- `current_user_id()`: lấy user id của request hiện tại (không bao giờ tin `user_id` do client gửi).
- `require_owned()`: chặn truy cập tài nguyên của người dùng khác.
"""
from contextvars import ContextVar
from typing import Optional
import logging
import threading
import time
import uuid

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

logger = logging.getLogger("studia.auth")

_bearer = HTTPBearer(auto_error=False)
_current_user_id: ContextVar[Optional[str]] = ContextVar("current_user_id", default=None)
_jwks_client: Optional[jwt.PyJWKClient] = None

ASYMMETRIC_ALGS = ["ES256", "RS256"]

# Cache ngắn các lần xác nhận "bản ghi này của tôi" để các request liên tiếp (đọc ebook, làm bài…) không hỏi DB lại.
# Chỉ cache kết quả khớp chủ sở hữu; quyền đọc sách chung / admin vẫn được tra mới mỗi lần.
_OWNED_TTL = 20.0
_OWNED_MAX = 5000
_owned_cache: dict[tuple[str, str, str], float] = {}
_owned_lock = threading.Lock()


def forget_owned(table: str, row_id: str) -> None:
    with _owned_lock:
        for k in [k for k in _owned_cache if k[1] == table and k[2] == str(row_id)]:
            _owned_cache.pop(k, None)


def _get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = jwt.PyJWKClient(url, cache_keys=True, lifespan=3600)
    return _jwks_client


def decode_access_token(token: str) -> dict:
    """Giải mã & kiểm tra chữ ký access token của Supabase (HS256 secret cũ hoặc JWKS ES256/RS256)."""
    alg = jwt.get_unverified_header(token).get("alg", "")
    if alg == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise jwt.InvalidTokenError("HS256 token but SUPABASE_JWT_SECRET is not configured")
        key, algorithms = settings.SUPABASE_JWT_SECRET, ["HS256"]
    elif alg in ASYMMETRIC_ALGS:
        key, algorithms = _get_jwks_client().get_signing_key_from_jwt(token).key, ASYMMETRIC_ALGS
    else:
        raise jwt.InvalidTokenError(f"Unsupported alg: {alg}")

    return jwt.decode(
        token,
        key,
        algorithms=algorithms,
        audience="authenticated",
        options={"require": ["exp", "sub"]},
    )


def auth_disabled() -> bool:
    """Chỉ cho phép tắt auth ở môi trường development."""
    return not settings.AUTH_REQUIRED and settings.ENVIRONMENT == "development"


_PUBLIC_DOC_SUFFIXES = (
    "/status",
    "/blocks",
    "/outline",
    "/toc",
    "/page-quality",
    "/search",
    "/highlights",
    "/export",
    "/file-url",
    "/topics",
)


def _is_public_read_request(request: Optional[Request]) -> bool:
    """Chỉ cho phép khách (không gửi Bearer token) đọc danh sách và nội dung sách thư viện chung."""
    if not request or request.method != "GET":
        return False
    path = request.url.path
    if path in ("/api/v1/documents", "/api/v1/documents/"):
        return True
    if not path.startswith("/api/v1/documents/"):
        return False
    rest = path[len("/api/v1/documents/"):]
    if rest.startswith("topics/") or rest == "topics":
        return False
    return (
        any(rest.endswith(sfx) for sfx in _PUBLIC_DOC_SUFFIXES)
        or "/pages/" in rest
    )


async def require_user(
    request: Request = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[str]:
    from app.core.accounts import check_active, set_current_email

    if auth_disabled():
        _current_user_id.set(settings.DEFAULT_USER_ID)
        set_current_email(None)
        await run_in_threadpool(check_active, settings.DEFAULT_USER_ID)
        return settings.DEFAULT_USER_ID

    if credentials is None:
        if _is_public_read_request(request):
            _current_user_id.set(None)
            set_current_email(None)
            return None
        raise HTTPException(status_code=401, detail="Chưa đăng nhập", headers={"WWW-Authenticate": "Bearer"})

    try:
        claims = await run_in_threadpool(decode_access_token, credentials.credentials)
    except Exception as e:
        logger.info(f"Rejected access token: {e}")
        raise HTTPException(
            status_code=401,
            detail="Phiên đăng nhập không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )

    _current_user_id.set(claims["sub"])
    set_current_email(claims.get("email"))
    await run_in_threadpool(check_active, claims["sub"])
    return claims["sub"]


def current_user_id() -> str:
    uid = _current_user_id.get()
    if not uid:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    return uid


def validate_uuid(value: Optional[str], field: str = "id", required: bool = False) -> Optional[str]:
    """Chuẩn hoá chuỗi ID: rỗng -> None (hoặc 422 nếu required), chuỗi không phải UUID -> 422."""
    raw = (value or "").strip() if isinstance(value, str) else value
    if not raw:
        if required:
            raise HTTPException(status_code=422, detail=f"{field} không được để trống")
        return None
    try:
        return str(uuid.UUID(str(raw)))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=422, detail=f"{field} không hợp lệ (cần định dạng UUID)")


def require_owned(table: str, row_id: str, missing_ok: bool = False, write: bool = False) -> None:
    """
    404 nếu bản ghi không thuộc về người dùng hiện tại (không tiết lộ sự tồn tại của bản ghi).

    Riêng bảng `documents`:
      - quản lý (role admin) đọc/ghi được mọi tài liệu;
      - sách trong thư viện chung (visibility = 'shared') ai cũng ĐỌC được (kể cả khách / chưa đăng nhập),
        nhưng chỉ chủ sở hữu hoặc quản lý mới SỬA được (`write=True`: sửa khối nội dung, xử lý lại, xoá...).
    """
    from app.core.supabase_client import get_supabase_client

    uid = _current_user_id.get()
    if not uid:
        if table == "documents" and not write:
            db = get_supabase_client()
            if not db:
                raise HTTPException(status_code=503, detail="Cơ sở dữ liệu không khả dụng")
            try:
                resp = db.table(table).select("visibility").eq("id", row_id).execute()
                rows = getattr(resp, "data", None) or []
                if rows and (rows[0].get("visibility") or "private") == "shared":
                    return
            except Exception:
                pass
            raise HTTPException(status_code=404, detail="Không tìm thấy")
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")
    ck = (uid, table, str(row_id))
    with _owned_lock:
        if _owned_cache.get(ck, 0) > time.time():
            return
    db = get_supabase_client()
    if not db:
        raise HTTPException(status_code=503, detail="Cơ sở dữ liệu không khả dụng")
    cols = "user_id, visibility" if table == "documents" else "user_id"
    try:
        resp = db.table(table).select(cols).eq("id", row_id).execute()
    except Exception:
        resp = db.table(table).select("user_id").eq("id", row_id).execute()
    rows = getattr(resp, "data", None) or []
    if not rows:
        if missing_ok:
            return
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    row = rows[0]
    if str(row.get("user_id")) == uid:
        with _owned_lock:
            if len(_owned_cache) >= _OWNED_MAX:
                _owned_cache.clear()
            _owned_cache[ck] = time.time() + _OWNED_TTL
        return
    if table == "documents":
        from app.core.accounts import is_admin
        if is_admin(uid):
            return
        if not write and (row.get("visibility") or "private") == "shared":
            return
    raise HTTPException(status_code=404, detail="Không tìm thấy")


def require_topic_owned(topic_id: str, missing_ok: bool = False) -> Optional[dict]:
    """Kiểm tra quyền đọc chủ đề (qua tài liệu chủ quản hoặc quyền sở hữu bộ thẻ/từ vựng của user)."""
    from app.core.accounts import is_admin
    from app.core.supabase_client import get_supabase_client

    uid = current_user_id()
    db = get_supabase_client()
    if not db:
        raise HTTPException(status_code=503, detail="Cơ sở dữ liệu không khả dụng")

    rows = db.table("topics").select("*").eq("id", topic_id).limit(1).execute().data or []
    if not rows:
        if missing_ok:
            return None
        raise HTTPException(status_code=404, detail="Không tìm thấy chủ đề")

    topic = rows[0]
    doc_id = topic.get("document_id")
    if doc_id:
        require_owned("documents", str(doc_id))
        return topic

    if is_admin(uid):
        return topic

    slug = str(topic.get("slug") or "")
    if any(slug.startswith(prefix) for prefix in (f"deck-{uid}-", f"custom-{uid}-", f"vocab-{uid}-")):
        return topic

    # Chủ đề cá nhân cũ (custom-/vocab-): kiểm tra user có liên kết dữ liệu với chủ đề này không
    try:
        if db.table("vocabulary_items").select("id").eq("user_id", uid).eq("topic_id", topic_id).limit(1).execute().data:
            return topic
        if db.table("knowledge_states").select("id").eq("user_id", uid).eq("topic_id", topic_id).limit(1).execute().data:
            return topic
        fc_rows = db.table("flashcards").select("id").eq("topic_id", topic_id).limit(50).execute().data or []
        fc_ids = [r["id"] for r in fc_rows if r.get("id")]
        if fc_ids and db.table("flashcard_states").select("id").eq("user_id", uid).in_("flashcard_id", fc_ids).limit(1).execute().data:
            return topic
    except Exception:
        pass

    raise HTTPException(status_code=404, detail="Không tìm thấy chủ đề")


def require_quiz_owned(quiz_id: str, missing_ok: bool = False) -> Optional[dict]:
    """Kiểm tra quyền truy cập quiz thông qua chủ đề của nó."""
    from app.core.supabase_client import get_supabase_client

    current_user_id()
    db = get_supabase_client()
    if not db:
        raise HTTPException(status_code=503, detail="Cơ sở dữ liệu không khả dụng")
    rows = db.table("quizzes").select("*").eq("id", quiz_id).limit(1).execute().data or []
    if not rows:
        if missing_ok:
            return None
        raise HTTPException(status_code=404, detail="Không tìm thấy bài quiz")
    quiz = rows[0]
    if quiz.get("topic_id"):
        require_topic_owned(str(quiz["topic_id"]))
    return quiz
