from supabase import create_client
from app.config import settings
from app.core.local_db import LocalStoreClient
import logging

logger = logging.getLogger("studia.supabase")

_supabase_client = None


def _is_supabase_configured() -> bool:
    url = (settings.SUPABASE_URL or "").strip()
    key = (settings.SUPABASE_SERVICE_ROLE_KEY or "").strip()
    if not url or not key:
        return False
    if "your-supabase" in url or "your-supabase" in key:
        return False
    return url.startswith(("http://", "https://"))


class SafeExecuteWrapper:
    """Bọc query builder của Supabase thật; không nuốt lỗi hay rơi về LocalStore khi Supabase đã cấu hình."""

    def __init__(self, real_obj, local_query=None):
        self.real_obj = real_obj
        self.local_query = local_query

    def execute(self):
        return self.real_obj.execute()

    def __getattr__(self, name):
        real_attr = getattr(self.real_obj, name)
        if callable(real_attr):
            def wrapper(*args, **kwargs):
                next_real = real_attr(*args, **kwargs)
                return SafeExecuteWrapper(next_real, None)
            return wrapper
        return real_attr


class SafeTableQuery:
    def __init__(self, real_query, local_query=None):
        self.real_query = real_query
        self.local_query = local_query

    def __getattr__(self, name):
        real_attr = getattr(self.real_query, name)
        if callable(real_attr):
            def wrapper(*args, **kwargs):
                res_real = real_attr(*args, **kwargs)
                if hasattr(res_real, "execute"):
                    return SafeExecuteWrapper(res_real, None)
                return SafeTableQuery(res_real, None)
            return wrapper
        return real_attr


class SafeBucketWrapper:
    def __init__(self, real_bucket, local_bucket=None):
        self.real_bucket = real_bucket
        self.local_bucket = local_bucket

    def upload(self, path: str, file: bytes, file_options: dict = None):
        return self.real_bucket.upload(path, file, file_options)

    def download(self, path: str) -> bytes:
        return self.real_bucket.download(path)

    def remove(self, paths: list):
        return self.real_bucket.remove(paths)

    def get_public_url(self, path: str) -> str:
        return self.real_bucket.get_public_url(path)

    def create_signed_url(self, path: str, expires_in: int):
        return self.real_bucket.create_signed_url(path, expires_in)


class SafeStorageWrapper:
    def __init__(self, real_storage, local_storage=None):
        self.real_storage = real_storage
        self.local_storage = local_storage

    def from_(self, bucket_name: str):
        return SafeBucketWrapper(self.real_storage.from_(bucket_name), None)

    def create_bucket(self, name: str, options: dict = None):
        return self.real_storage.create_bucket(name, options)

    def update_bucket(self, name: str, options: dict = None):
        return self.real_storage.update_bucket(name, options)


class SafeSupabaseWrapper:
    """Wrapper thống nhất giữa Supabase Cloud và LocalStore (chỉ dùng LocalStore khi real_client là None)."""

    def __init__(self, real_client=None):
        self.real_client = real_client
        self.local_client = LocalStoreClient()

    def table(self, table_name: str):
        if self.real_client is not None:
            return SafeTableQuery(self.real_client.table(table_name), None)
        return self.local_client.table(table_name)

    def rpc(self, fn_name: str, params: dict):
        if self.real_client is not None:
            res = self.real_client.rpc(fn_name, params)
            return SafeExecuteWrapper(res, None)
        return self.local_client.rpc(fn_name, params)

    @property
    def storage(self):
        if self.real_client is not None:
            return SafeStorageWrapper(self.real_client.storage, None)
        return self.local_client.storage


def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        if not _is_supabase_configured():
            logger.info("Supabase credentials not configured; using LocalStore.")
            _supabase_client = SafeSupabaseWrapper(None)
        else:
            try:
                real = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
                _supabase_client = SafeSupabaseWrapper(real)
                logger.info("Initialized Supabase client successfully.")
            except Exception as e:
                logger.error(f"Failed to initialize configured Supabase client: {e}")
                return None
    return _supabase_client
