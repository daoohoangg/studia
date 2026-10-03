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

CREATE POLICY "Service role bypass" ON public.vocabulary_items FOR ALL TO service_role USING (true) WITH CHECK (true);
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
