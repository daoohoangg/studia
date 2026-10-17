"""
Local Fail-safe Database & Storage Engine for Studia
Tự động fallback khi Supabase Cloud bị mất kết nối, lỗi DNS hoặc hết quota.
Lưu trữ dữ liệu vào backend/data/local_db.json và backend/data/storage/
"""
import os
import json
import uuid
import math
import random
import functools
import logging
import threading
import secrets
import time
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import jwt

from app.config import settings

logger = logging.getLogger("studia.local_db")
_DB_LOCK = threading.RLock()

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
DB_FILE = os.path.join(DATA_DIR, "local_db.json")
STORAGE_DIR = os.path.join(DATA_DIR, "storage")

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(STORAGE_DIR, exist_ok=True)

DEFAULT_DB = {
    "learning_profiles": [],
    "documents": [],
    "document_chunks": [],
    "topics": [],
    "topic_relationships": [],
    "learning_paths": [],
    "learning_path_steps": [],
    "lessons": [],
    "quizzes": [],
    "questions": [],
    "knowledge_states": [],
    "question_attempts": [],
    "review_schedules": [],
    "study_goals": [],
    "daily_learning_plans": [],
    "flashcards": [],
    "flashcard_states": [],
    "ai_chat_sessions": [],
    "document_blocks": [],
    "document_notes": [],
    "document_highlights": [],
    "document_block_revisions": [],
    "reading_progress": [],
    "exam_sets": [],
    "study_slots": [],
    "study_moments": [],
    "reminder_log": []
}


def _load_db() -> Dict[str, List[Dict[str, Any]]]:
    if not os.path.exists(DB_FILE):
        _save_db(DEFAULT_DB)
        return json.loads(json.dumps(DEFAULT_DB))
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Ensure all keys exist
            for key in DEFAULT_DB:
                if key not in data:
                    data[key] = []
            return data
    except Exception as e:
        logger.error(f"Error loading local_db.json: {e}")
        return json.loads(json.dumps(DEFAULT_DB))


def _save_db(data: Dict[str, List[Dict[str, Any]]]):
    # Ghi ra tệp tạm rồi thay thế: tệp chính không bao giờ ở trạng thái ghi dở
    tmp_file = f"{DB_FILE}.{os.getpid()}.{threading.get_ident()}.tmp"
    try:
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_file, DB_FILE)
    except Exception as e:
        logger.error(f"Error saving local_db.json: {e}")
        try:
            os.remove(tmp_file)
        except OSError:
            pass


def _locked(method):
    """Mỗi thao tác đọc-sửa-ghi trên local_db.json chạy trọn vẹn dưới một khoá (xử lý tài liệu chạy đa luồng)."""
    @functools.wraps(method)
    def wrapper(*args, **kwargs):
        with _DB_LOCK:
            return method(*args, **kwargs)
    return wrapper


def _compare(a: Any, b: Any) -> int:
    """So sánh số theo giá trị số, còn lại theo chuỗi (ISO timestamp so sánh đúng thứ tự)."""
    numeric = (int, float)
    if isinstance(a, numeric) and isinstance(b, numeric) and not isinstance(a, bool) and not isinstance(b, bool):
        return (a > b) - (a < b)
    a, b = str(a), str(b)
    return (a > b) - (a < b)


def _ilike_match(value: Any, pattern: str) -> bool:
    """Khớp kiểu SQL ILIKE: % = chuỗi bất kỳ, _ = một ký tự, dấu gạch ngược thoát ký tự đặc biệt."""
    import re as _re
    regex, i = "", 0
    while i < len(pattern):
        ch = pattern[i]
        if ch == "\\" and i + 1 < len(pattern):
            regex += _re.escape(pattern[i + 1])
            i += 2
            continue
        regex += ".*" if ch == "%" else "." if ch == "_" else _re.escape(ch)
        i += 1
    return value is not None and _re.fullmatch(regex, str(value), _re.IGNORECASE | _re.DOTALL) is not None


class LocalResponse:
    def __init__(self, data: Any = None, count: Optional[int] = None):
        self.data = data if data is not None else []
        self.count = count if count is not None else len(self.data)


class LocalTableQuery:
    def __init__(self, table_name: str):
        self.table_name = table_name
        self._select_fields = "*"
        self._filters = []
        self._order_by = None
        self._limit_val = None

    def select(self, fields: str = "*", count: Optional[str] = None):
        self._select_fields = fields
        return self

    def eq(self, column: str, value: Any):
        self._filters.append(("eq", column, value))
        return self

    def lte(self, column: str, value: Any):
        self._filters.append(("lte", column, value))
        return self

    def gte(self, column: str, value: Any):
        self._filters.append(("gte", column, value))
        return self

    def ilike(self, column: str, pattern: str):
        self._filters.append(("ilike", column, pattern))
        return self

    def gt(self, column: str, value: Any):
        self._filters.append(("gt", column, value))
        return self

    def lt(self, column: str, value: Any):
        self._filters.append(("lt", column, value))
        return self

    def in_(self, column: str, values: List[Any]):
        self._filters.append(("in", column, values))
        return self

    def order(self, column: str, desc: bool = False):
        self._order_by = (column, desc)
        return self

    def limit(self, val: int):
        self._limit_val = val
        return self

    @_locked
    def execute(self) -> LocalResponse:
        db = _load_db()
        rows = db.get(self.table_name, [])

        # Apply filters
        filtered = []
        for row in rows:
            match = True
            for op, col, val in self._filters:
                row_val = row.get(col)
                if op == "eq" and str(row_val) != str(val):
                    match = False
                    break
                elif op == "in" and row_val not in val:
                    match = False
                    break
                elif op == "ilike" and not _ilike_match(row_val, val):
                    match = False
                    break
                elif op == "gt" and (row_val is None or _compare(row_val, val) <= 0):
                    match = False
                    break
                elif op == "lte" and row_val is not None and _compare(row_val, val) > 0:
                    match = False
                    break
                elif op == "gte" and row_val is not None and _compare(row_val, val) < 0:
                    match = False
                    break
                elif op == "lt" and row_val is not None and _compare(row_val, val) >= 0:
                    match = False
                    break
            if match:
                filtered.append(row)

        # Order by
        if self._order_by:
            col, desc = self._order_by
            # Số xếp theo giá trị số (order_index), còn lại xếp theo chuỗi
            def sort_key(r):
                v = r.get(col, "")
                return (0, v, "") if isinstance(v, (int, float)) and not isinstance(v, bool) else (1, 0, str(v))
            filtered.sort(key=sort_key, reverse=desc)

        # Limit
        if self._limit_val:
            filtered = filtered[:self._limit_val]

        return LocalResponse(filtered, len(filtered))

    def insert(self, record: Any):
        return LocalTableQueryInsertWrapper(self.table_name, record)

    def update(self, updates: Dict[str, Any]):
        self._updates = updates
        return LocalTableQueryUpdateExecuter(self)

    def delete(self):
        return LocalTableQueryDeleteExecuter(self)

    def upsert(self, record: Any, on_conflict: Optional[str] = None):
        return LocalTableQueryInsertWrapper(self.table_name, record, upsert=True, on_conflict=on_conflict)


class LocalTableQueryInsertWrapper:
    """Insert/upsert trì hoãn: chỉ ghi vào local_db.json khi gọi execute()."""

    def __init__(self, table_name: str, record: Any, upsert: bool = False, on_conflict: Optional[str] = None):
        self.table_name = table_name
        self.records = record if isinstance(record, list) else [record]
        self.upsert = upsert
        self.on_conflict = on_conflict

    @_locked
    def execute(self) -> LocalResponse:
        db = _load_db()
        rows = db.get(self.table_name, [])
        conflict_cols = [c.strip() for c in self.on_conflict.split(",")] if self.on_conflict else ["id"]

        for r in self.records:
            if "id" not in r:
                r["id"] = str(uuid.uuid4())
            if "created_at" not in r:
                r["created_at"] = datetime.now(timezone.utc).isoformat()

            match_index = -1
            if self.upsert:
                for idx, existing in enumerate(rows):
                    if all(str(existing.get(c)) == str(r.get(c)) for c in conflict_cols if c in r):
                        match_index = idx
                        break
            if match_index >= 0:
                rows[match_index].update(r)
            else:
                rows.append(r)

        db[self.table_name] = rows
        _save_db(db)
        return LocalResponse(self.records)


class LocalRowsResult:
    """Kết quả có sẵn (dùng cho rpc)."""

    def __init__(self, records: List[Dict[str, Any]]):
        self.records = records

    @_locked
    def execute(self) -> LocalResponse:
        return LocalResponse(self.records)


def _row_matches(row: Dict[str, Any], filters: list) -> bool:
    for op, col, val in filters:
        if op == "eq" and str(row.get(col)) != str(val):
            return False
        if op == "in" and row.get(col) not in val:
            return False
    return True


class LocalTableQueryDeleteExecuter:
    def __init__(self, query: LocalTableQuery):
        self.query = query

    def eq(self, column: str, value: Any):
        self.query.eq(column, value)
        return self

    def in_(self, column: str, values: List[Any]):
        self.query.in_(column, values)
        return self

    @_locked
    def execute(self) -> LocalResponse:
        if not self.query._filters:
            return LocalResponse([])  # không bao giờ xoá cả bảng
        db = _load_db()
        rows = db.get(self.query.table_name, [])
        deleted = [r for r in rows if _row_matches(r, self.query._filters)]
        db[self.query.table_name] = [r for r in rows if not _row_matches(r, self.query._filters)]
        _save_db(db)
        return LocalResponse(deleted)


class LocalTableQueryUpdateExecuter:
    def __init__(self, query: LocalTableQuery):
        self.query = query

    def eq(self, column: str, value: Any):
        self.query.eq(column, value)
        return self

    @_locked
    def execute(self) -> LocalResponse:
        db = _load_db()
        rows = db.get(self.query.table_name, [])
        updated = []

        for row in rows:
            match = True
            for op, col, val in self.query._filters:
                if str(row.get(col)) != str(val):
                    match = False
                    break
            if match:
                row.update(self.query._updates)
                updated.append(row)

        db[self.query.table_name] = rows
        _save_db(db)
        return LocalResponse(updated)


# Khóa ký link tải local: sinh mới mỗi lần khởi động, link cũ tự hết hiệu lực
_LOCAL_URL_SECRET = secrets.token_bytes(32)


def resolve_storage_path(bucket_name: str, path: str) -> str:
    """Đường dẫn tuyệt đối của object, chặn mọi đường dẫn thoát khỏi thư mục bucket."""
    bucket_dir = os.path.realpath(os.path.join(STORAGE_DIR, bucket_name))
    full_path = os.path.realpath(os.path.join(bucket_dir, path.replace("/", os.sep)))
    if os.path.commonpath([bucket_dir, full_path]) != bucket_dir or full_path == bucket_dir:
        raise ValueError(f"Invalid storage path: {path}")
    return full_path


def sign_local_storage_token(bucket_name: str, path: str, expires_in: int) -> str:
    return jwt.encode(
        {"b": bucket_name, "p": path, "exp": int(time.time()) + expires_in},
        _LOCAL_URL_SECRET,
        algorithm="HS256",
    )


def resolve_local_storage_token(token: str) -> str:
    """Trả về đường dẫn tệp của token hợp lệ; token sai/hết hạn → jwt.InvalidTokenError."""
    claims = jwt.decode(token, _LOCAL_URL_SECRET, algorithms=["HS256"], options={"require": ["exp", "b", "p"]})
    return resolve_storage_path(claims["b"], claims["p"])


class LocalStorageBucket:
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        self.bucket_dir = os.path.join(STORAGE_DIR, bucket_name)
        os.makedirs(self.bucket_dir, exist_ok=True)

    def upload(self, path: str, file: bytes, file_options: Optional[Dict] = None):
        full_path = resolve_storage_path(self.bucket_name, path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(file)
        return {"path": path}

    def download(self, path: str) -> bytes:
        with open(resolve_storage_path(self.bucket_name, path), "rb") as f:
            return f.read()

    def remove(self, paths: List[str]):
        for p in paths:
            try:
                os.remove(resolve_storage_path(self.bucket_name, p))
            except (OSError, ValueError):
                pass
        return []

    def get_public_url(self, path: str) -> str:
        return f"http://localhost:8000/static/storage/{self.bucket_name}/{path}"

    def create_signed_url(self, path: str, expires_in: int, options: Optional[Dict] = None) -> Dict[str, str]:
        if not os.path.isfile(resolve_storage_path(self.bucket_name, path)):
            raise FileNotFoundError(path)
        token = sign_local_storage_token(self.bucket_name, path, expires_in)
        url = f"{settings.BACKEND_PUBLIC_URL.rstrip('/')}/local-storage/{token}"
        return {"signedURL": url, "signedUrl": url}


class LocalStorageClient:
    def create_bucket(self, name: str, options: Optional[Dict] = None):
        os.makedirs(os.path.join(STORAGE_DIR, name), exist_ok=True)

    def update_bucket(self, name: str, options: Optional[Dict] = None):
        os.makedirs(os.path.join(STORAGE_DIR, name), exist_ok=True)

    def from_(self, bucket_name: str) -> LocalStorageBucket:
        return LocalStorageBucket(bucket_name)


class LocalStoreClient:
    """Mock Client thay thế Supabase Client khi offline."""
    def __init__(self):
        self.storage = LocalStorageClient()

    def table(self, table_name: str) -> LocalTableQuery:
        return LocalTableQuery(table_name)

    @_locked
    def rpc(self, fn_name: str, params: Dict[str, Any]) -> LocalTableQuery:
        db = _load_db()
        if fn_name == "match_document_chunks_by_doc":
            doc_id = params.get("target_document_id")
            query_vec = params.get("query_embedding", [])
            top_k = params.get("match_count", 5)

            chunks = [c for c in db.get("document_chunks", []) if str(c.get("document_id")) == str(doc_id)]
            scored = []
            for c in chunks:
                vec = c.get("embedding") or []
                if vec and len(vec) == len(query_vec):
                    dot = sum(a * b for a, b in zip(query_vec, vec))
                    similarity = round(dot, 4)
                else:
                    similarity = 0.5
                scored.append({**c, "similarity": similarity})

            scored.sort(key=lambda x: x.get("similarity", 0), reverse=True)
            return LocalRowsResult(scored[:top_k])

        elif fn_name == "get_due_flashcards":
            uid = params.get("p_user_id")
            limit = params.get("p_limit", 20)
            now = datetime.now(timezone.utc).isoformat()

            cards = db.get("flashcards", [])
            states = {s["flashcard_id"]: s for s in db.get("flashcard_states", []) if str(s.get("user_id")) == str(uid)}

            due = []
            for fc in cards:
                st = states.get(fc["id"], {})
                next_rev = st.get("next_review_at", "1970-01-01T00:00:00Z")
                if next_rev <= now:
                    due.append({**fc, **st})

            due.sort(key=lambda x: x.get("next_review_at", ""))
            return LocalRowsResult(due[:limit])

        return LocalRowsResult([])
