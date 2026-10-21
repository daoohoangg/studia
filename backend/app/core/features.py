"""Dependency chặn API của tính năng mà quản lý đã tắt (quản lý vẫn dùng được để kiểm thử)."""
from fastapi import HTTPException

from app.services import sysconfig


def require_feature(key: str):
    async def dependency() -> None:
        if sysconfig.feature_enabled(key):
            return
        from fastapi.concurrency import run_in_threadpool
        from app.core.accounts import current_account

        acc = await run_in_threadpool(current_account)
        if acc.get("role") == "admin":
            return
        raise HTTPException(status_code=403, detail="Tính năng này đang được tạm tắt")

    return dependency
