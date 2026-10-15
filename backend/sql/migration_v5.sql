-- ============================================================
-- Studia Migration v5 — Ebook reader/editor + Notebook
-- 1. document_blocks: nội dung sách theo từng khối (tiêu đề / đoạn / danh sách / bảng), sửa được
-- 2. document_notes:  sổ ghi chú của người dùng cho từng cuốn sách
-- Chạy trong Supabase SQL Editor. Chưa chạy thì backend tự rơi về local_db.json cho 2 bảng này
-- (chậm và không bền) — nên chạy trước khi dùng thật.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.document_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    order_index DOUBLE PRECISION NOT NULL,      -- số thực để chèn khối vào giữa mà không đánh số lại
    page_number INT,                            -- trang trong PDF gốc (NULL với DOCX/text)
    block_type TEXT NOT NULL DEFAULT 'paragraph'
        CHECK (block_type IN ('heading', 'paragraph', 'list_item', 'table')),
    level INT CHECK (level BETWEEN 1 AND 3),    -- cấp tiêu đề
    text TEXT NOT NULL DEFAULT '',              -- **đậm** cho chữ in đậm
    original_text TEXT,                         -- bản gốc lúc tách từ tệp; NULL = khối do người dùng thêm
    is_edited BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_blocks_order
    ON public.document_blocks(document_id, order_index);
CREATE INDEX IF NOT EXISTS idx_document_blocks_headings
    ON public.document_blocks(document_id, order_index) WHERE block_type = 'heading';

CREATE TABLE IF NOT EXISTS public.document_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    block_id UUID REFERENCES public.document_blocks(id) ON DELETE SET NULL,
    quote TEXT,                                 -- đoạn trích được bôi đen khi tạo ghi chú
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_notes_doc
    ON public.document_notes(user_id, document_id, created_at DESC);

-- RLS: backend dùng service_role (bypass). Policy bảo vệ truy cập trực tiếp bằng anon key.
ALTER TABLE public.document_blocks ENABLE ROW LEVEL SECURITY;   -- nội dung phái sinh: chỉ backend truy cập

ALTER TABLE public.document_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access" ON public.document_notes;
CREATE POLICY "Owner access" ON public.document_notes FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));
