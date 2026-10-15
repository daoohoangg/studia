"""
Xác thực người dùng qua Supabase Auth JWT.

- `require_user`: dependency gắn ở cấp router, xác thực `Authorization: Bearer <access_token>`.
- `current_user_id()`: lấy user id của request hiện tại (không bao giờ tin `user_id` do client gửi).
- `require_owned()`: chặn truy cập tài nguyên của người dùng khác.
"""
from contextvars import ContextVar
from typing import Optional
import logging

import jwt
from fastapi import Depends, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings

logger = logging.getLogger("studia.auth")

_bearer = HTTPBearer(auto_error=False)
_current_user_id: ContextVar[Optional[str]] = ContextVar("current_user_id", default=None)
_jwks_client: Optional[jwt.PyJWKClient] = None

ASYMMETRIC_ALGS = ["ES256", "RS256"]


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


async def require_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> str:
    from app.core.accounts import check_active, set_current_email

    if auth_disabled():
        _current_user_id.set(settings.DEFAULT_USER_ID)
        set_current_email(None)
        await run_in_threadpool(check_active, settings.DEFAULT_USER_ID)
        return settings.DEFAULT_USER_ID

    if credentials is None:
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


def require_owned(table: str, row_id: str, missing_ok: bool = False, write: bool = False) -> None:
    """
    404 nếu bản ghi không thuộc về người dùng hiện tại (không tiết lộ sự tồn tại của bản ghi).

    Riêng bảng `documents`:
      - quản lý (role admin) đọc/ghi được mọi tài liệu;
      - sách trong thư viện chung (visibility = 'shared') ai đăng nhập cũng ĐỌC được, nhưng chỉ chủ sở hữu
        hoặc quản lý mới SỬA được (`write=True`: sửa khối nội dung, xử lý lại, xoá...).
    """
    from app.core.supabase_client import get_supabase_client

    uid = current_user_id()
    cols = "user_id, visibility" if table == "documents" else "user_id"
    try:
        resp = get_supabase_client().table(table).select(cols).eq("id", row_id).execute()
    except Exception:
        resp = get_supabase_client().table(table).select("user_id").eq("id", row_id).execute()
    rows = getattr(resp, "data", None) or []
    if not rows:
        if missing_ok:
            return
        raise HTTPException(status_code=404, detail="Không tìm thấy")
    row = rows[0]
    if str(row.get("user_id")) == uid:
        return
    if table == "documents":
        from app.core.accounts import is_admin
        if is_admin(uid):
            return
        if not write and (row.get("visibility") or "private") == "shared":
            return
    raise HTTPException(status_code=404, detail="Không tìm thấy")
