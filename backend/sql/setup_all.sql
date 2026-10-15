-- ============================================================
-- Studia - THIẾT LẬP CƠ SỞ DỮ LIỆU ĐẦY ĐỦ (an toàn khi chạy lại)
-- Gộp theo thứ tự: schema.sql, migration_v2 ... v7 (KHÔNG gồm seed.sql).
-- Mỗi CREATE POLICY được đặt sau DROP POLICY IF EXISTS để chạy lại không lỗi.
-- Cách dùng: Supabase Dashboard > SQL Editor > New query > dán toàn bộ > Run.
-- ============================================================


-- ===== schema.sql =====
-- ========================================================
-- STUDIA SUPABASE DATABASE SCHEMA (PostgreSQL + pgvector)
-- ========================================================

-- Kích hoạt extensions bắt buộc trên Supabase
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Liên kết auth.users)
CREATE TABLE IF NOT EXISTS public.learning_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    learning_goal TEXT,
    preferred_daily_minutes INT DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Documents (Tài liệu đầu vào)
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    source_type TEXT CHECK (source_type IN ('pdf', 'url', 'youtube', 'text')),
    file_path TEXT,
    raw_content TEXT,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Document Chunks & Vector Embeddings (1536 dims - OpenAI / Gemini)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768),  -- Gemini text-embedding-004 = 768 dims
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Topics (Knowledge Graph Nodes)
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    difficulty_level INT DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Topic Relationships (Knowledge Graph Edges)
CREATE TABLE IF NOT EXISTS public.topic_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    target_topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    relationship_type TEXT CHECK (relationship_type IN ('prerequisite', 'related', 'contains')),
    weight FLOAT DEFAULT 1.0,
    CONSTRAINT unique_relationship UNIQUE (source_topic_id, target_topic_id, relationship_type)
);

-- 6. Learning Paths & Steps
CREATE TABLE IF NOT EXISTS public.learning_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    estimated_hours FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.learning_path_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    learning_path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    step_order INT NOT NULL,
    status TEXT DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Lessons
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_markdown TEXT NOT NULL,
    key_takeaways JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Quizzes & Questions
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    quiz_type TEXT DEFAULT 'adaptive' CHECK (quiz_type IN ('adaptive', 'review', 'assessment')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
    options JSONB DEFAULT '[]'::jsonb,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty INT DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Knowledge States (User Learning Moat)
CREATE TABLE IF NOT EXISTS public.knowledge_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    mastery_score FLOAT DEFAULT 0.0 CHECK (mastery_score BETWEEN 0.0 AND 100.0),
    confidence_score FLOAT DEFAULT 0.5 CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    retention_score FLOAT DEFAULT 1.0 CHECK (retention_score BETWEEN 0.0 AND 1.0),
    stability FLOAT DEFAULT 1.0,
    difficulty_rating FLOAT DEFAULT 5.0,
    last_reviewed_at TIMESTAMPTZ DEFAULT NOW(),
    next_review_at TIMESTAMPTZ DEFAULT NOW(),
    attempt_count INT DEFAULT 0,
    correct_count INT DEFAULT 0,
    CONSTRAINT unique_user_topic_state UNIQUE (user_id, topic_id)
);

-- 10. Question Attempts
CREATE TABLE IF NOT EXISTS public.question_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    response_time_ms INT,
    confidence_rating INT CHECK (confidence_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Review Schedules (Spaced Repetition Queue)
CREATE TABLE IF NOT EXISTS public.review_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector Search Function for RAG in Supabase
CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(768),
    match_threshold float DEFAULT 0.4,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    chunk_index INT,
    content TEXT,
    metadata JSONB,
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
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ===== migration_v2.sql =====
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
DROP POLICY IF EXISTS "Service role bypass" ON public.study_goals;
CREATE POLICY "Service role bypass" ON public.study_goals FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role bypass" ON public.daily_learning_plans;
CREATE POLICY "Service role bypass" ON public.daily_learning_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role bypass" ON public.flashcards;
CREATE POLICY "Service role bypass" ON public.flashcards FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role bypass" ON public.flashcard_states;
CREATE POLICY "Service role bypass" ON public.flashcard_states FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role bypass" ON public.ai_chat_sessions;
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

-- ===== migration_v3.sql =====
-- ========================================================
-- STUDIA V3 MIGRATION — Learnova Language Learning Features
-- Chạy script này trên Supabase SQL Editor
-- ========================================================

-- 17. Vocabulary Items (Feature C: Contextual Vocabulary)
CREATE TABLE IF NOT EXISTS public.vocabulary_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    word TEXT NOT NULL,
    meaning_vi TEXT NOT NULL,
    source_sentence TEXT,                          -- Câu gốc chứa từ
    example_sentences JSONB DEFAULT '[]'::jsonb,   -- [{en: "...", vi: "..."}]
    collocations JSONB DEFAULT '[]'::jsonb,         -- ["common phrase 1", "verb + word"]
    pronunciation TEXT,                             -- IPA hoặc phonetic hint
    word_type TEXT,                                 -- noun, verb, adj, adv, phrase
    flashcard_id UUID REFERENCES public.flashcards(id) ON DELETE SET NULL,
    mastery_score FLOAT DEFAULT 0.0 CHECK (mastery_score BETWEEN 0.0 AND 100.0),
    source TEXT DEFAULT 'lesson' CHECK (source IN ('lesson', 'scenario', 'quiz', 'manual')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Error Logs (Feature F: Personalized Feedback)
CREATE TABLE IF NOT EXISTS public.error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    error_type TEXT CHECK (error_type IN ('vocabulary', 'grammar', 'comprehension', 'pronunciation', 'sentence_structure')),
    error_detail TEXT NOT NULL,                     -- Mô tả lỗi cụ thể
    user_input TEXT,                                -- Câu/từ user đã dùng sai
    correct_form TEXT,                              -- Dạng đúng
    context_sentence TEXT,                          -- Ngữ cảnh khi xảy ra lỗi
    source TEXT DEFAULT 'quiz' CHECK (source IN ('quiz', 'scenario', 'flashcard', 'speech')),
    occurrence_count INT DEFAULT 1,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Thêm exercise_type vào questions (Feature B: Multi-type exercise)
ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'multiple_choice'
        CHECK (exercise_type IN ('multiple_choice', 'true_false', 'fill_blank', 'sentence_construction', 'recall'));

-- Thêm ai_feedback vào question_attempts (để lưu Gemini grading cho open questions)
ALTER TABLE public.question_attempts
    ADD COLUMN IF NOT EXISTS ai_feedback TEXT,
    ADD COLUMN IF NOT EXISTS ai_score FLOAT,
    ADD COLUMN IF NOT EXISTS error_type TEXT;

-- Thêm interleave_config vào daily_learning_plans
ALTER TABLE public.daily_learning_plans
    ADD COLUMN IF NOT EXISTS due_flashcard_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS interleave_mode BOOLEAN DEFAULT FALSE;

-- ========================================================
-- Indexes for performance
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_vocabulary_user ON public.vocabulary_items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vocabulary_topic ON public.vocabulary_items (topic_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_word ON public.vocabulary_items (user_id, word);
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON public.error_logs (user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON public.error_logs (user_id, error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_topic ON public.error_logs (user_id, topic_id);

-- ========================================================
-- RLS Policies
-- ========================================================
ALTER TABLE public.vocabulary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass" ON public.vocabulary_items;

CREATE POLICY "Service role bypass" ON public.vocabulary_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role bypass" ON public.error_logs;
CREATE POLICY "Service role bypass" ON public.error_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ========================================================
-- Function: Get recurring errors for a user
-- ========================================================
CREATE OR REPLACE FUNCTION get_recurring_errors(
    p_user_id UUID,
    p_min_occurrences INT DEFAULT 2,
    p_limit INT DEFAULT 20
)
RETURNS TABLE (
    error_type TEXT,
    error_detail TEXT,
    correct_form TEXT,
    occurrence_count INT,
    last_seen_at TIMESTAMPTZ,
    topic_id UUID
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        el.error_type,
        el.error_detail,
        el.correct_form,
        el.occurrence_count,
        el.last_seen_at,
        el.topic_id
    FROM public.error_logs el
    WHERE el.user_id = p_user_id
      AND el.occurrence_count >= p_min_occurrences
    ORDER BY el.occurrence_count DESC, el.last_seen_at DESC
    LIMIT p_limit;
END;
$$;

-- ========================================================
-- Function: Get vocabulary stats for a user
-- ========================================================
CREATE OR REPLACE FUNCTION get_vocabulary_stats(p_user_id UUID)
RETURNS TABLE (
    total_words INT,
    avg_mastery FLOAT,
    words_mastered INT,
    words_learning INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::INT as total_words,
        COALESCE(AVG(mastery_score), 0)::FLOAT as avg_mastery,
        COUNT(*) FILTER (WHERE mastery_score >= 80)::INT as words_mastered,
        COUNT(*) FILTER (WHERE mastery_score < 80)::INT as words_learning
    FROM public.vocabulary_items
    WHERE user_id = p_user_id;
END;
$$;

-- ===== migration_v4.sql =====
-- ============================================================
-- Studia Migration v4 — Auth hardening
-- 1. Bảng exam_sessions (API /exam đang dùng nhưng chưa có trong schema)
-- 2. Bật RLS cho toàn bộ bảng + policy "chủ sở hữu" cho role authenticated
-- Backend dùng service_role (bypass RLS); các policy này bảo vệ truy cập trực tiếp
-- bằng anon/publishable key từ trình duyệt.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.exam_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exam_type TEXT NOT NULL DEFAULT 'full',
    exam_mode TEXT NOT NULL DEFAULT 'academic',
    sections TEXT,                 -- JSON string (backend json.dumps)
    status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    current_section TEXT,
    answers TEXT,                  -- JSON string
    started_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    overall_band NUMERIC(2,1),
    section_scores TEXT,           -- JSON string
    ai_analysis TEXT,              -- JSON string
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exam_sessions_user ON public.exam_sessions(user_id, created_at DESC);

-- ------------------------------------------------------------
-- Bảng có cột user_id: người dùng chỉ thấy/sửa dữ liệu của chính mình
-- ------------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'documents', 'learning_paths', 'knowledge_states', 'question_attempts',
        'review_schedules', 'study_goals', 'daily_learning_plans', 'flashcard_states',
        'ai_chat_sessions', 'vocabulary_items', 'error_logs', 'exam_sessions'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS "Owner access" ON public.%I', t);
        EXECUTE format(
            'CREATE POLICY "Owner access" ON public.%I FOR ALL TO authenticated
             USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()))', t);
    END LOOP;
END $$;

-- learning_profiles: khóa chính chính là auth.users.id
ALTER TABLE public.learning_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access" ON public.learning_profiles;
DROP POLICY IF EXISTS "Owner access" ON public.learning_profiles;
CREATE POLICY "Owner access" ON public.learning_profiles FOR ALL TO authenticated
    USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

-- ------------------------------------------------------------
-- Bảng nội dung phái sinh (không có user_id): chỉ backend (service_role) truy cập
-- ------------------------------------------------------------
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- ===== migration_v5.sql =====
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
DROP POLICY IF EXISTS "Owner access" ON public.document_notes;
CREATE POLICY "Owner access" ON public.document_notes FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- ===== migration_v6.sql =====
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
DROP POLICY IF EXISTS "Owner access" ON public.document_highlights;
CREATE POLICY "Owner access" ON public.document_highlights FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access" ON public.reading_progress;
DROP POLICY IF EXISTS "Owner access" ON public.reading_progress;
CREATE POLICY "Owner access" ON public.reading_progress FOR ALL TO authenticated
    USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

ALTER TABLE public.document_block_revisions ENABLE ROW LEVEL SECURITY;  -- chỉ backend truy cập

-- ===== migration_v7.sql =====
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

-- ===== Kho tệp riêng tư (bucket) =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false),
       ('exam-audio', 'exam-audio', false),
       ('exam-media', 'exam-media', false)
ON CONFLICT (id) DO UPDATE SET public = false;
