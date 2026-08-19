from supabase import create_client, Client
from app.config import settings
import logging

logger = logging.getLogger("studia.supabase")

_supabase_client: Client = None

def get_supabase_client() -> Client:
    """
    Trả về Supabase Client kết nối đến Supabase Cloud DB.
    """
    global _supabase_client
    if _supabase_client is None:
        try:
            _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            logger.info("Supabase client initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not connect to Supabase Cloud: {e}. Using mock state if applicable.")
            _supabase_client = None
    return _supabase_client
