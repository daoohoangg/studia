-- ========================================================
-- STUDIA V2 MIGRATION — Learnova Feature Tables
-- Chạy script này trên Supabase SQL Editor
-- ========================================================

-- 12. Study Goals (Mục tiêu học tập của user)
CREATE TABLE IF NOT EXISTS public.study_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    goal_description TEXT,                    -- Ví dụ: "Chuẩn bị phỏng vấn Backend"
    daily_minutes INT DEFAULT 45,
    deadline_days INT DEFAULT 30,
    deadline_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Daily Learning Plans (Lịch học theo ngày — Adaptive)
CREATE TABLE IF NOT EXISTS public.daily_learning_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    study_goal_id UUID REFERENCES public.study_goals(id) ON DELETE SET NULL,
    plan_date DATE NOT NULL,
    tasks JSONB DEFAULT '[]'::jsonb,
    -- tasks format: [{type, topic_id, topic_name, duration_min, status, icon}]
    -- type: 'lesson' | 'quiz' | 'flashcard_review' | 'spaced_repetition'
    total_minutes INT DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    adapted_reason TEXT,                      -- Lý do plan bị thay đổi adaptive
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_date UNIQUE (user_id, plan_date)
);

-- 14. Flashcards (Thẻ ghi nhớ sinh từ RAG)
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    front TEXT NOT NULL,                      -- Câu hỏi / Khái niệm
    back TEXT NOT NULL,                       -- Đáp án / Giải thích
    source_chunk TEXT,                        -- Đoạn văn bản gốc dùng sinh flashcard
    card_type TEXT DEFAULT 'concept' CHECK (card_type IN ('concept', 'definition', 'question', 'fill_blank')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Flashcard States (FSRS state per user per card)
CREATE TABLE IF NOT EXISTS public.flashcard_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flashcard_id UUID NOT NULL REFERENCES public.flashcards(id) ON DELETE CASCADE,
    stability FLOAT DEFAULT 1.0,
    difficulty_rating FLOAT DEFAULT 5.0,
    mastery_score FLOAT DEFAULT 0.0,
    retention_score FLOAT DEFAULT 1.0,
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    review_count INT DEFAULT 0,
    last_rating INT DEFAULT 0,                -- 1=Again, 2=Hard, 3=Good, 4=Easy
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_flashcard UNIQUE (user_id, flashcard_id)
);

-- 16. AI Chat Sessions (AI Tutor conversation history)
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    messages JSONB DEFAULT '[]'::jsonb,
    -- messages format: [{role: 'user'|'assistant', content: str, timestamp: str, sources: [{chunk_index, similarity}]}]
    title TEXT,                               -- Auto-generated từ first message
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- Thêm cột metadata vào learning_paths (nếu chưa có)
-- ========================================================
ALTER TABLE public.learning_paths
    ADD COLUMN IF NOT EXISTS goal_description TEXT,
    ADD COLUMN IF NOT EXISTS daily_minutes INT DEFAULT 45,
    ADD COLUMN IF NOT EXISTS deadline_date DATE,
    ADD COLUMN IF NOT EXISTS total_days INT DEFAULT 30,
    ADD COLUMN IF NOT EXISTS current_day INT DEFAULT 1,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused'));

-- Thêm cột chunk_index_start, chunk_index_end vào document_chunks để trace về PDF pages
ALTER TABLE public.document_chunks
    ADD COLUMN IF NOT EXISTS page_number INT,
    ADD COLUMN IF NOT EXISTS section_title TEXT;

-- ========================================================
-- Indexes for performance
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_daily_plans_user_date ON public.daily_learning_plans (user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_flashcard_states_user ON public.flashcard_states (user_id, next_review_at);
CREATE INDEX IF NOT EXISTS idx_flashcards_topic ON public.flashcards (topic_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_user ON public.study_goals (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON public.ai_chat_sessions (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chunks_document ON public.document_chunks (document_id, chunk_index);

-- ========================================================
-- RLS (Row Level Security) Policies
-- ========================================================
ALTER TABLE public.study_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_learning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

-- Cho phép service role bypass RLS (backend dùng service key)
CREATE POLICY "Service role bypass" ON public.study_goals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON public.daily_learning_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON public.flashcards FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON public.flashcard_states FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role bypass" ON public.ai_chat_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ========================================================
-- Vector Search Function cập nhật — filter theo document_id
-- ========================================================
CREATE OR REPLACE FUNCTION match_document_chunks_by_doc(
    query_embedding vector(768),
    target_document_id UUID,
    match_threshold float DEFAULT 0.4,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    chunk_index INT,
    content TEXT,
    metadata JSONB,
    section_title TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.chunk_index,
        dc.content,
        dc.metadata,
        dc.section_title,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE dc.document_id = target_document_id
      AND dc.embedding IS NOT NULL
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function tìm kiếm flashcard đến hạn ôn tập
CREATE OR REPLACE FUNCTION get_due_flashcards(
    p_user_id UUID,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    flashcard_id UUID,
    front TEXT,
    back TEXT,
    topic_id UUID,
    stability FLOAT,
    difficulty_rating FLOAT,
    mastery_score FLOAT,
    next_review_at TIMESTAMPTZ,
    review_count INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id,
        f.front,
        f.back,
        f.topic_id,
        COALESCE(fs.stability, 1.0),
        COALESCE(fs.difficulty_rating, 5.0),
        COALESCE(fs.mastery_score, 0.0),
        COALESCE(fs.next_review_at, NOW()),
        COALESCE(fs.review_count, 0)
    FROM public.flashcards f
    LEFT JOIN public.flashcard_states fs ON fs.flashcard_id = f.id AND fs.user_id = p_user_id
    WHERE (fs.next_review_at IS NULL OR fs.next_review_at <= NOW())
    ORDER BY COALESCE(fs.next_review_at, '1970-01-01'::TIMESTAMPTZ) ASC
    LIMIT p_limit;
END;
$$;
