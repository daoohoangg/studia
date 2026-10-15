-- ============================================================
-- Studia Migration v6 — Ebook: highlight, lịch sử sửa, vị trí đang đọc
-- Chạy sau migration_v5.sql, trong Supabase SQL Editor.
-- ============================================================

-- Highlight nhiều màu, lưu lâu dài theo người dùng
CREATE TABLE IF NOT EXISTS public.document_highlights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    block_id UUID NOT NULL REFERENCES public.document_blocks(id) ON DELETE CASCADE,
    start_offset INT NOT NULL,                 -- vị trí trong chữ hiển thị của khối (đã bỏ dấu **)
    end_offset INT NOT NULL,
    color TEXT NOT NULL DEFAULT 'yellow'
        CHECK (color IN ('yellow', 'green', 'cyan', 'pink', 'purple')),
    quote TEXT,                                -- chữ được tô, để định vị lại khi khối bị sửa
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_offset > start_offset)
);
CREATE INDEX IF NOT EXISTS idx_document_highlights_doc
    ON public.document_highlights(user_id, document_id, created_at);
CREATE INDEX IF NOT EXISTS idx_document_highlights_block
    ON public.document_highlights(block_id);

-- Lịch sử sửa từng khối (backend giữ tối đa 30 bản gần nhất mỗi khối)
CREATE TABLE IF NOT EXISTS public.document_block_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    block_id UUID NOT NULL REFERENCES public.document_blocks(id) ON DELETE CASCADE,
    text TEXT NOT NULL DEFAULT '',
    block_type TEXT,
    level INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_block_revisions_block
    ON public.document_block_revisions(block_id, created_at DESC);

-- Vị trí đang đọc (mỗi người dùng một dòng cho mỗi sách)
CREATE TABLE IF NOT EXISTS public.reading_progress (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    block_id UUID REFERENCES public.document_blocks(id) ON DELETE SET NULL,
    percent NUMERIC(5,1) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, document_id)
);

-- RLS: backend dùng service_role (bypass); policy bảo vệ truy cập trực tiếp bằng anon key
ALTER TABLE public.document_highlights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access" ON public.document_highlights;
CREATE POLICY "Owner access" ON public.document_highlights FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access" ON public.reading_progress;
CREATE POLICY "Owner access" ON public.reading_progress FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

ALTER TABLE public.document_block_revisions ENABLE ROW LEVEL SECURITY;  -- chỉ backend truy cập
