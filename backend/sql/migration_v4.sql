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
