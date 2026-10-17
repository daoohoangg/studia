"""
Gửi email qua SMTP (thư viện chuẩn). Không cấu hình SMTP thì không gửi và báo rõ lý do,
để phần còn lại của hệ thống vẫn chạy bình thường.
"""
from __future__ import annotations

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from typing import Tuple

from app.config import settings

logger = logging.getLogger("studia.mailer")


def smtp_configured() -> bool:
    return bool(settings.SMTP_HOST.strip() and (settings.SMTP_FROM.strip() or settings.SMTP_USER.strip()))


def _sender() -> str:
    raw = settings.SMTP_FROM.strip() or settings.SMTP_USER.strip()
    name, addr = parseaddr(raw)
    return formataddr((name or "Studia", addr or raw))


def send_email(to: str, subject: str, html: str, text: str) -> Tuple[bool, str]:
    """Gửi một email. Trả về (đã gửi, lý do/ghi chú). Hàm đồng bộ — gọi từ luồng nền."""
    to = (to or "").strip()
    if not to or "@" not in to:
        return False, "no_recipient"
    if not smtp_configured():
        logger.info(f"SMTP chưa cấu hình, bỏ qua email '{subject}' tới {to}")
        return False, "smtp_not_configured"

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = _sender()
    msg["To"] = to
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    try:
        security = settings.SMTP_SECURITY.strip().lower()
        if security == "ssl":
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20,
                                      context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20)
        with server:
            if security == "starttls":
                server.starttls(context=ssl.create_default_context())
            if settings.SMTP_USER:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True, "sent"
    except Exception as e:
        logger.warning(f"Gửi email tới {to} thất bại: {e}")
        return False, f"error: {type(e).__name__}"
