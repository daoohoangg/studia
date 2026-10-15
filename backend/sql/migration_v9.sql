-- ============================================================
-- Studia Migration v9 — Hồ sơ học tập, kết quả kiểm tra trình độ, tiến độ xử lý sách
-- Chạy sau migration_v8.sql, trong Supabase SQL Editor.
-- ============================================================

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS processing_step INT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS processing_detail TEXT;

CREATE TABLE IF NOT EXISTS public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.placement_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    band NUMERIC(2,1) NOT NULL CHECK (band BETWEEN 0 AND 9),
    per_section JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_placement_user ON public.placement_results(user_id, created_at DESC);

-- Chỉ backend (service_role) ghi; trình duyệt không truy cập trực tiếp.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_results ENABLE ROW LEVEL SECURITY;
