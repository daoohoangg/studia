-- ============================================================
-- Studia Migration v7 — Bộ đề thi dựng từ sách + phiên thi theo đề
-- Chạy sau migration_v6.sql, trong Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exam_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    family TEXT NOT NULL DEFAULT 'ielts' CHECK (family IN ('ielts', 'generic')),
    mode TEXT NOT NULL DEFAULT 'academic',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,        -- ExamSet v1, KHÔNG chứa đáp án
    answer_key JSONB NOT NULL DEFAULT '{}'::jsonb,     -- chỉ backend đọc/ghi qua service_role
    validation JSONB NOT NULL DEFAULT '{}'::jsonb,     -- {errors, warnings, stats, build}
    listening_audio_path TEXT,                          -- đường dẫn trong bucket riêng tư exam-audio
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_sets_user ON public.exam_sets(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_sets_document ON public.exam_sets(source_document_id);

-- Người dùng chỉ thấy bộ đề của mình. Lưu ý: cột answer_key nằm trong cùng dòng nên người dùng đọc trực tiếp
-- bằng anon key vẫn thấy đáp án của CHÍNH đề của họ (họ là người tạo ra nó). Phòng thi không bao giờ đọc bảng này
-- từ trình duyệt: nó nhận dữ liệu đã loại đáp án từ backend.
ALTER TABLE public.exam_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access" ON public.exam_sets;
CREATE POLICY "Owner access" ON public.exam_sets FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- Phiên thi gắn với một đề, kèm bản chụp (snapshot) nội dung + đáp án lúc bắt đầu thi để đề bị sửa về sau
-- không làm sai lệch bài đã thi.
ALTER TABLE public.exam_sessions
    ADD COLUMN IF NOT EXISTS exam_set_id UUID REFERENCES public.exam_sets(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS exam_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS result_json JSONB;      -- kết quả đầy đủ (bảng xem lại từng câu, phân tích...)

-- Lưu ý: mỗi câu trả lời được ghi qua backend dưới khoá theo phiên (đọc-sửa-ghi cột answers_json),
-- nên hai câu trả lời đến gần nhau không ghi đè lên nhau khi chạy một tiến trình backend.
