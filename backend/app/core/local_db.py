"""
Local Fail-safe Database & Storage Engine for Studia
Tự động dùng khi Supabase Cloud chưa cấu hình (dev/test).
Lưu trữ dữ liệu vào backend/data/local_db.json và backend/data/storage/
"""
import copy
import functools
import json
import logging
import os
import re as _re
import secrets
import shutil
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

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
    "vocabulary_items": [],
    "error_logs": [],
    "document_blocks": [],
    "document_notes": [],
    "document_highlights": [],
    "document_block_revisions": [],
    "reading_progress": [],
    "exam_sets": [],
    "exam_sessions": [],
    "user_accounts": [],
    "app_settings": [],
    "credit_packs": [],
    "payment_orders": [],
    "credit_ledger": [],
    "payment_transactions": [],
    "user_profiles": [],
    "placement_results": [],
    "study_slots": [],
    "study_moments": [],
    "reminder_log": [],
    "friend_profiles": [],
    "friendships": [],
    "moment_reactions": [],
    "push_tokens": [],
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_now(value: Any) -> Any:
    if isinstance(value, str) and value.strip().lower() == "now()":
        return _now_iso()
    return value


def _normalize_record(record: Dict[str, Any]) -> Dict[str, Any]:
    return {k: _normalize_now(v) for k, v in record.items()}


def _load_db() -> Dict[str, List[Dict[str, Any]]]:
    if not os.path.exists(DB_FILE):
        _save_db(DEFAULT_DB)
        return json.loads(json.dumps(DEFAULT_DB))
    try:
        with open(DB_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict):
            raise ValueError("local_db.json root is not a JSON object")
        for key in DEFAULT_DB:
            if key not in data or not isinstance(data[key], list):
                data[key] = []
        return data
    except Exception as e:
        logger.error(f"Error loading local_db.json: {e}")
        try:
            if os.path.getsize(DB_FILE) > 0:
                backup = f"{DB_FILE}.corrupt.{int(time.time())}"
                shutil.copy2(DB_FILE, backup)
                logger.warning(f"Backed up corrupt local_db.json to {backup}")
        except OSError as be:
            logger.warning(f"Could not back up corrupt local_db.json: {be}")
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


_ISO_DATE_PREFIX = _re.compile(r"^\d{4}-\d{2}-\d{2}")


def _try_parse_dt(val: str) -> Optional[datetime]:
    if not _ISO_DATE_PREFIX.match(val):
        return None
    try:
        dt = datetime.fromisoformat(val.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _compare(a: Any, b: Any) -> int:
    """So sánh số theo giá trị số, ISO timestamp theo datetime UTC, còn lại theo chuỗi."""
    numeric = (int, float)
    if isinstance(a, numeric) and isinstance(b, numeric) and not isinstance(a, bool) and not isinstance(b, bool):
        return (a > b) - (a < b)
    sa, sb = str(_normalize_now(a)), str(_normalize_now(b))
    da, db = _try_parse_dt(sa), _try_parse_dt(sb)
    if da is not None and db is not None:
        return (da > db) - (da < db)
    return (sa > sb) - (sa < sb)


def _like_match(value: Any, pattern: str, ignore_case: bool = True) -> bool:
    """Khớp kiểu SQL LIKE/ILIKE: % = chuỗi bất kỳ, _ = một ký tự, dấu gạch ngược thoát ký tự đặc biệt."""
    regex, i = "", 0
    while i < len(pattern):
        ch = pattern[i]
        if ch == "\\" and i + 1 < len(pattern):
            regex += _re.escape(pattern[i + 1])
            i += 2
            continue
        regex += ".*" if ch == "%" else "." if ch == "_" else _re.escape(ch)
        i += 1
    flags = (_re.IGNORECASE | _re.DOTALL) if ignore_case else _re.DOTALL
    return value is not None and _re.fullmatch(regex, str(value), flags) is not None


def _row_matches(row: Dict[str, Any], filters: list) -> bool:
    for op, col, val in filters:
        row_val = row.get(col)
        target = _normalize_now(val)
        if op == "eq":
            if str(row_val) != str(target):
                return False
        elif op == "neq":
            if str(row_val) == str(target):
                return False
        elif op == "in":
            if row_val not in val:
                return False
        elif op == "like":
            if not _like_match(row_val, str(target), ignore_case=False):
                return False
        elif op == "ilike":
            if not _like_match(row_val, str(target), ignore_case=True):
                return False
        elif op == "gt":
            if row_val is None or _compare(row_val, target) <= 0:
                return False
        elif op == "lte":
            if row_val is None or _compare(row_val, target) > 0:
                return False
        elif op == "gte":
            if row_val is None or _compare(row_val, target) < 0:
                return False
        elif op == "lt":
            if row_val is None or _compare(row_val, target) >= 0:
                return False
    return True


class LocalResponse:
    def __init__(self, data: Any = None, count: Optional[int] = None):
        self.data = data if data is not None else []
        self.count = count if count is not None else len(self.data)


class LocalTableQuery:
    def __init__(self, table_name: str):
        self.table_name = table_name
        self._select_fields = "*"
        self._count_mode: Optional[str] = None
        self._filters: list = []
        self._order_by = None
        self._limit_val: Optional[int] = None
        self._range_val: Optional[tuple] = None
        self._updates: Dict[str, Any] = {}

    def select(self, fields: str = "*", count: Optional[str] = None):
        self._select_fields = fields
        self._count_mode = count
        return self

    def eq(self, column: str, value: Any):
        self._filters.append(("eq", column, value))
        return self

    def neq(self, column: str, value: Any):
        self._filters.append(("neq", column, value))
        return self

    def lte(self, column: str, value: Any):
        self._filters.append(("lte", column, value))
        return self

    def gte(self, column: str, value: Any):
        self._filters.append(("gte", column, value))
        return self

    def like(self, column: str, pattern: str):
        self._filters.append(("like", column, pattern))
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
        self._filters.append(("in", column, list(values)))
        return self

    def order(self, column: str, desc: bool = False):
        self._order_by = (column, desc)
        return self

    def limit(self, val: int):
        self._limit_val = val
        return self

    def range(self, start: int, end: int):
        self._range_val = (start, end)
        return self

    @_locked
    def execute(self) -> LocalResponse:
        db = _load_db()
        rows = db.get(self.table_name, [])

        filtered = [copy.deepcopy(row) for row in rows if _row_matches(row, self._filters)]

        # Resolve simple relational embeds like `topics(name)` or `topics(name, difficulty_level)`
        embed_match = _re.search(r"topics\(([^)]+)\)", self._select_fields or "")
        if embed_match and self.table_name != "topics":
            cols = [c.strip() for c in embed_match.group(1).split(",") if c.strip()]
            topics_by_id = {str(t.get("id")): t for t in db.get("topics", [])}
            for row in filtered:
                tid = str(row.get("topic_id") or "")
                topic = topics_by_id.get(tid)
                row["topics"] = {c: topic.get(c) for c in cols} if topic else None

        if self._order_by:
            col, desc = self._order_by
            def sort_key(r):
                v = r.get(col, "")
                return (0, v, "") if isinstance(v, (int, float)) and not isinstance(v, bool) else (1, 0, str(v))
            filtered.sort(key=sort_key, reverse=desc)

        total_count = len(filtered)

        if self._range_val is not None:
            start, end = self._range_val
            filtered = filtered[max(0, start) : max(0, end + 1)]

        if self._limit_val is not None:
            filtered = filtered[: self._limit_val]

        resp_count = total_count if self._count_mode == "exact" else len(filtered)
        return LocalResponse(filtered, resp_count)

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
        raw_list = record if isinstance(record, list) else [record]
        self.records = [_normalize_record(dict(r)) for r in raw_list]
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
                r["created_at"] = _now_iso()

            match_index = -1
            if self.upsert:
                for idx, existing in enumerate(rows):
                    if all(str(existing.get(c)) == str(r.get(c)) for c in conflict_cols if c in r):
                        match_index = idx
                        break
            if match_index >= 0:
                rows[match_index].update(r)
            else:
                rows.append(copy.deepcopy(r))

        db[self.table_name] = rows
        _save_db(db)
        return LocalResponse(copy.deepcopy(self.records))


class LocalRowsResult:
    """Kết quả có sẵn (dùng cho rpc)."""

    def __init__(self, records: List[Dict[str, Any]]):
        self.records = records

    @_locked
    def execute(self) -> LocalResponse:
        return LocalResponse(self.records)


class _FilteredExecuterBase:
    def __init__(self, query: LocalTableQuery):
        self.query = query

    def eq(self, column: str, value: Any):
        self.query.eq(column, value)
        return self

    def neq(self, column: str, value: Any):
        self.query.neq(column, value)
        return self

    def in_(self, column: str, values: List[Any]):
        self.query.in_(column, values)
        return self

    def like(self, column: str, pattern: str):
        self.query.like(column, pattern)
        return self

    def ilike(self, column: str, pattern: str):
        self.query.ilike(column, pattern)
        return self

    def gt(self, column: str, value: Any):
        self.query.gt(column, value)
        return self

    def gte(self, column: str, value: Any):
        self.query.gte(column, value)
        return self

    def lt(self, column: str, value: Any):
        self.query.lt(column, value)
        return self

    def lte(self, column: str, value: Any):
        self.query.lte(column, value)
        return self


class LocalTableQueryDeleteExecuter(_FilteredExecuterBase):
    @_locked
    def execute(self) -> LocalResponse:
        if not self.query._filters:
            return LocalResponse([])  # không bao giờ xoá cả bảng
        db = _load_db()
        rows = db.get(self.query.table_name, [])
        deleted = [copy.deepcopy(r) for r in rows if _row_matches(r, self.query._filters)]
        db[self.query.table_name] = [r for r in rows if not _row_matches(r, self.query._filters)]
        _save_db(db)
        return LocalResponse(deleted)


class LocalTableQueryUpdateExecuter(_FilteredExecuterBase):
    @_locked
    def execute(self) -> LocalResponse:
        if not self.query._filters:
            return LocalResponse([])
        db = _load_db()
        rows = db.get(self.query.table_name, [])
        updates = _normalize_record(self.query._updates)
        updated = []

        for row in rows:
            if _row_matches(row, self.query._filters):
                row.update(copy.deepcopy(updates))
                updated.append(copy.deepcopy(row))

        db[self.query.table_name] = rows
        _save_db(db)
        return LocalResponse(updated)


# Khóa ký link tải local: sinh mới mỗi lần khởi động, link cũ tự hết hiệu lực
_LOCAL_URL_SECRET = secrets.token_bytes(32)


def resolve_storage_path(bucket_name: str, path: str) -> str:
    """Đường dẫn tuyệt đối của object, chặn mọi đường dẫn thoát khỏi thư mục bucket."""
    bucket_dir = os.path.realpath(os.path.join(STORAGE_DIR, bucket_name))
    full_path = os.path.realpath(os.path.join(bucket_dir, path.replace("\\", "/").replace("/", os.sep)))
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


def _score_chunks(chunks: List[Dict[str, Any]], query_vec: List[float], threshold: float, top_k: int) -> List[Dict[str, Any]]:
    scored = []
    for c in chunks:
        vec = c.get("embedding") or []
        if vec and query_vec and len(vec) == len(query_vec):
            dot = sum(a * b for a, b in zip(query_vec, vec))
            similarity = round(dot, 4)
        else:
            similarity = 0.0
        if similarity > threshold:
            scored.append({**c, "similarity": similarity})
    scored.sort(key=lambda x: x.get("similarity", 0), reverse=True)
    return scored[:top_k]


class LocalStoreClient:
    """Mock Client thay thế Supabase Client khi offline/dev."""
    def __init__(self):
        self.storage = LocalStorageClient()

    def table(self, table_name: str) -> LocalTableQuery:
        return LocalTableQuery(table_name)

    @_locked
    def rpc(self, fn_name: str, params: Dict[str, Any]) -> LocalRowsResult:
        db = _load_db()
        if fn_name == "match_document_chunks_by_doc":
            doc_id = params.get("target_document_id")
            query_vec = params.get("query_embedding", [])
            threshold = float(params.get("match_threshold", 0.4))
            top_k = int(params.get("match_count", 5))
            chunks = [c for c in db.get("document_chunks", []) if str(c.get("document_id")) == str(doc_id)]
            return LocalRowsResult(_score_chunks(chunks, query_vec, threshold, top_k))

        elif fn_name == "match_document_chunks":
            query_vec = params.get("query_embedding", [])
            threshold = float(params.get("match_threshold", 0.4))
            top_k = int(params.get("match_count", 5))
            chunks = db.get("document_chunks", [])
            return LocalRowsResult(_score_chunks(chunks, query_vec, threshold, top_k))

        elif fn_name == "get_due_flashcards":
            uid = str(params.get("p_user_id") or "")
            limit = int(params.get("p_limit", 20))
            now = _now_iso()

            cards = db.get("flashcards", [])
            states = {
                str(s["flashcard_id"]): s
                for s in db.get("flashcard_states", [])
                if str(s.get("user_id")) == uid
            }
            accessible_docs = {
                str(d["id"])
                for d in db.get("documents", [])
                if str(d.get("user_id")) == uid or (d.get("visibility") or "private") == "shared"
            }
            own_topics = {
                str(t["id"])
                for t in db.get("topics", [])
                if str(t.get("document_id") or "") in accessible_docs
                or any(
                    str(t.get("slug") or "").startswith(prefix)
                    for prefix in (f"deck-{uid}-", f"custom-{uid}-", f"vocab-{uid}-")
                )
            }

            due = []
            for fc in cards:
                fc_id = str(fc["id"])
                st = states.get(fc_id)
                if st is None:
                    doc_id = str(fc.get("document_id") or "")
                    topic_id = str(fc.get("topic_id") or "")
                    if doc_id not in accessible_docs and topic_id not in own_topics:
                        continue
                    due.append({
                        **fc,
                        "flashcard_id": fc["id"],
                        "stability": 1.0,
                        "difficulty_rating": 5.0,
                        "mastery_score": 0.0,
                        "next_review_at": now,
                        "review_count": 0,
                    })
                else:
                    next_rev = _normalize_now(st.get("next_review_at") or now)
                    if _compare(next_rev, now) <= 0:
                        merged = {**st, **fc, "flashcard_id": fc["id"], "next_review_at": next_rev}
                        due.append(merged)

            due.sort(key=lambda x: str(x.get("next_review_at", "")))
            return LocalRowsResult(due[:limit])

        elif fn_name == "get_recurring_errors":
            uid = str(params.get("p_user_id") or "")
            min_occ = int(params.get("p_min_occurrences", 2))
            limit = int(params.get("p_limit", 20))
            rows = [
                r for r in db.get("error_logs", [])
                if str(r.get("user_id")) == uid and int(r.get("occurrence_count", 1)) >= min_occ
            ]
            rows.sort(key=lambda r: (int(r.get("occurrence_count", 1)), str(r.get("last_seen_at") or "")), reverse=True)
            return LocalRowsResult(rows[:limit])

        elif fn_name == "get_vocabulary_stats":
            uid = str(params.get("p_user_id") or "")
            items = [r for r in db.get("vocabulary_items", []) if str(r.get("user_id")) == uid]
            total = len(items)
            avg = sum(float(i.get("mastery_score") or 0) for i in items) / total if total else 0.0
            mastered = sum(1 for i in items if float(i.get("mastery_score") or 0) >= 80)
            return LocalRowsResult([{
                "total_words": total,
                "avg_mastery": avg,
                "words_mastered": mastered,
                "words_learning": total - mastered,
            }])

        raise NotImplementedError(f"RPC {fn_name} is not implemented in LocalStore")
