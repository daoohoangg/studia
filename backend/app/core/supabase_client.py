from supabase import create_client, Client
from app.config import settings
from app.core.local_db import LocalStoreClient
import logging

logger = logging.getLogger("studia.supabase")

_supabase_client = None


class SafeExecuteWrapper:
    def __init__(self, real_obj, local_query):
        self.real_obj = real_obj
        self.local_query = local_query

    def execute(self):
        try:
            return self.real_obj.execute()
        except Exception as e:
            logger.warning(f"Supabase execute failed: {e}. Fallback to LocalStore.")
            if hasattr(self.local_query, 'execute'):
                return self.local_query.execute()
            return self.local_query

    def __getattr__(self, name):
        real_attr = getattr(self.real_obj, name, None)
        if callable(real_attr):
            def wrapper(*args, **kwargs):
                try:
                    next_real = real_attr(*args, **kwargs)
                    next_local = self.local_query
                    if hasattr(self.local_query, name):
                        try:
                            next_local = getattr(self.local_query, name)(*args, **kwargs)
                        except Exception:
                            pass
                    return SafeExecuteWrapper(next_real, next_local)
                except Exception as e:
                    logger.warning(f"Supabase query {name} failed: {e}. Fallback to LocalStore.")
                    if hasattr(self.local_query, name):
                        try:
                            next_local = getattr(self.local_query, name)(*args, **kwargs)
                            return SafeExecuteWrapper(next_local, next_local)
                        except Exception:
                            pass
                    return self
            return wrapper
        return real_attr


class SafeTableQuery:
    def __init__(self, real_query, local_query):
        self.real_query = real_query
        self.local_query = local_query

    def __getattr__(self, name):
        real_attr = getattr(self.real_query, name, None)
        local_attr = getattr(self.local_query, name, None)

        if callable(real_attr):
            def wrapper(*args, **kwargs):
                try:
                    res_real = real_attr(*args, **kwargs)
                    local_method = getattr(self.local_query, name, lambda *a, **k: self.local_query)
                    res_local = local_method(*args, **kwargs)
                    if hasattr(res_real, 'execute'):
                        return SafeExecuteWrapper(res_real, res_local)
                    return SafeTableQuery(res_real, res_local)
                except Exception as e:
                    logger.warning(f"Supabase query {name} failed: {e}. Fallback to LocalStore.")
                    local_method = getattr(self.local_query, name, None)
                    if local_method:
                        return local_method(*args, **kwargs)
                    return self.local_query
            return wrapper
        return real_attr or local_attr


class SafeBucketWrapper:
    def __init__(self, real_bucket, local_bucket):
        self.real_bucket = real_bucket
        self.local_bucket = local_bucket

    def upload(self, path: str, file: bytes, file_options: dict = None):
        try:
            return self.real_bucket.upload(path, file, file_options)
        except Exception as e:
            logger.warning(f"Supabase Storage upload failed: {e}. Fallback to Local Storage.")
            return self.local_bucket.upload(path, file, file_options)

    def get_public_url(self, path: str) -> str:
        try:
            return self.real_bucket.get_public_url(path)
        except Exception:
            return self.local_bucket.get_public_url(path)


class SafeStorageWrapper:
    def __init__(self, real_storage, local_storage):
        self.real_storage = real_storage
        self.local_storage = local_storage

    def from_(self, bucket_name: str):
        try:
            return SafeBucketWrapper(self.real_storage.from_(bucket_name), self.local_storage.from_(bucket_name))
        except Exception:
            return self.local_storage.from_(bucket_name)

    def create_bucket(self, name: str, options: dict = None):
        try:
            return self.real_storage.create_bucket(name, options)
        except Exception:
            return self.local_storage.create_bucket(name, options)


class SafeSupabaseWrapper:
    """Wrapper tự động chuyển hướng sang LocalStore nếu Supabase Cloud lỗi/mất mạng."""
    def __init__(self, real_client=None):
        self.real_client = real_client
        self.local_client = LocalStoreClient()

    def table(self, table_name: str):
        if self.real_client:
            try:
                return SafeTableQuery(self.real_client.table(table_name), self.local_client.table(table_name))
            except Exception:
                return self.local_client.table(table_name)
        return self.local_client.table(table_name)

    def rpc(self, fn_name: str, params: dict):
        if self.real_client:
            try:
                res = self.real_client.rpc(fn_name, params)
                return SafeExecuteWrapper(res, self.local_client.rpc(fn_name, params))
            except Exception as e:
                logger.warning(f"Supabase RPC {fn_name} failed: {e}. Fallback to LocalStore.")
                return self.local_client.rpc(fn_name, params)
        return self.local_client.rpc(fn_name, params)

    @property
    def storage(self):
        if self.real_client:
            return SafeStorageWrapper(self.real_client.storage, self.local_client.storage)
        return self.local_client.storage


def get_supabase_client():
    global _supabase_client
    if _supabase_client is None:
        try:
            real = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            _supabase_client = SafeSupabaseWrapper(real)
            logger.info("Initialized SafeSupabaseWrapper successfully.")
        except Exception as e:
            logger.warning(f"Could not connect to Supabase Cloud: {e}. Using LocalStore.")
            _supabase_client = SafeSupabaseWrapper(None)
    return _supabase_client
