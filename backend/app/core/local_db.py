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
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

logger = logging.getLogger("studia.local_db")

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
    "ai_chat_sessions": []
}


def _load_db() -> Dict[str, List[Dict[str, Any]]]:
    if not os.path.exists(DB_FILE):
        _save_db(DEFAULT_DB)
        return DEFAULT_DB
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
        return DEFAULT_DB


def _save_db(data: Dict[str, List[Dict[str, Any]]]):
    try:
        with open(DB_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Error saving local_db.json: {e}")


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
                elif op == "lte" and row_val is not None and str(row_val) > str(val):
                    match = False
                    break
                elif op == "gte" and row_val is not None and str(row_val) < str(val):
                    match = False
                    break
                elif op == "lt" and row_val is not None and str(row_val) >= str(val):
                    match = False
                    break
            if match:
                filtered.append(row)

        # Order by
        if self._order_by:
            col, desc = self._order_by
            filtered.sort(key=lambda r: str(r.get(col, "")), reverse=desc)

        # Limit
        if self._limit_val:
            filtered = filtered[:self._limit_val]

        return LocalResponse(filtered, len(filtered))

    def insert(self, record: Any):
        db = _load_db()
        rows = db.get(self.table_name, [])
        records = record if isinstance(record, list) else [record]

        for r in records:
            if "id" not in r:
                r["id"] = str(uuid.uuid4())
            if "created_at" not in r:
                r["created_at"] = datetime.now(timezone.utc).isoformat()
            rows.append(r)

        db[self.table_name] = rows
        _save_db(db)
        return LocalTableQueryInsertWrapper(records)

    def update(self, updates: Dict[str, Any]):
        self._updates = updates
        return LocalTableQueryUpdateExecuter(self)

    def upsert(self, record: Any, on_conflict: Optional[str] = None):
        db = _load_db()
        rows = db.get(self.table_name, [])
        records = record if isinstance(record, list) else [record]

        for r in records:
            if "id" not in r:
                r["id"] = str(uuid.uuid4())
            if "created_at" not in r:
                r["created_at"] = datetime.now(timezone.utc).isoformat()

            # Find matching record
            match_index = -1
            if on_conflict:
                cols = [c.strip() for c in on_conflict.split(",")]
                for idx, existing in enumerate(rows):
                    if all(str(existing.get(c)) == str(r.get(c)) for c in cols if c in r):
                        match_index = idx
                        break
            else:
                for idx, existing in enumerate(rows):
                    if existing.get("id") == r.get("id"):
                        match_index = idx
                        break

            if match_index >= 0:
                rows[match_index].update(r)
            else:
                rows.append(r)

        db[self.table_name] = rows
        _save_db(db)
        return LocalResponse(records)


class LocalTableQueryInsertWrapper:
    def __init__(self, records: List[Dict[str, Any]]):
        self.records = records

    def execute(self) -> LocalResponse:
        return LocalResponse(self.records)


class LocalTableQueryUpdateExecuter:
    def __init__(self, query: LocalTableQuery):
        self.query = query

    def eq(self, column: str, value: Any):
        self.query.eq(column, value)
        return self

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


class LocalStorageBucket:
    def __init__(self, bucket_name: str):
        self.bucket_name = bucket_name
        self.bucket_dir = os.path.join(STORAGE_DIR, bucket_name)
        os.makedirs(self.bucket_dir, exist_ok=True)

    def upload(self, path: str, file: bytes, file_options: Optional[Dict] = None):
        full_path = os.path.join(self.bucket_dir, path.replace("/", os.sep))
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(file)
        return {"path": path}

    def get_public_url(self, path: str) -> str:
        return f"http://localhost:8000/static/storage/{self.bucket_name}/{path}"


class LocalStorageClient:
    def create_bucket(self, name: str, options: Optional[Dict] = None):
        os.makedirs(os.path.join(STORAGE_DIR, name), exist_ok=True)

    def from_(self, bucket_name: str) -> LocalStorageBucket:
        return LocalStorageBucket(bucket_name)


class LocalStoreClient:
    """Mock Client thay thế Supabase Client khi offline."""
    def __init__(self):
        self.storage = LocalStorageClient()

    def table(self, table_name: str) -> LocalTableQuery:
        return LocalTableQuery(table_name)

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
            return LocalTableQueryInsertWrapper(scored[:top_k])

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
            return LocalTableQueryInsertWrapper(due[:limit])

        return LocalTableQueryInsertWrapper([])
