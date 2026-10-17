-- ============================================================
-- Studia Migration v10 — Lịch học chi tiết: khung giờ, khoảnh khắc học, nhật ký email nhắc
-- Chạy sau migration_v9.sql, trong Supabase SQL Editor.
--
--   * study_slots:   khung giờ học trong ngày, kèm ghi chú chi tiết và cờ nhắc email 10 phút trước giờ bắt đầu.
--   * study_moments: ảnh "khoảnh khắc học" của từng ngày (file nằm trong bucket riêng tư `moments`,
--                    backend tự tạo bucket ở lần tải ảnh đầu tiên).
--   * reminder_log:  mỗi lần nhắc chỉ gửi một lần cho mỗi (khung giờ, ngày, giờ bắt đầu).
-- Streak được tính từ dữ liệu có sẵn, không cần bảng riêng.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.study_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    start_time TEXT NOT NULL CHECK (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    end_time TEXT NOT NULL CHECK (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    skill TEXT NOT NULL DEFAULT 'other',
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'done', 'skipped')),
    remind BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_slots_user_day ON public.study_slots(user_id, slot_date);
CREATE INDEX IF NOT EXISTS idx_study_slots_day ON public.study_slots(slot_date);

CREATE TABLE IF NOT EXISTS public.study_moments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    moment_date DATE NOT NULL,
    path TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    meta JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_study_moments_user_day ON public.study_moments(user_id, moment_date);

CREATE TABLE IF NOT EXISTS public.reminder_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL DEFAULT 'slot',
    ref TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'sending',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chỉ backend (service_role) ghi; trình duyệt không truy cập trực tiếp.
ALTER TABLE public.study_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

INSERT INTO storage.buckets (id, name, public)
VALUES ('moments', 'moments', false)
ON CONFLICT (id) DO UPDATE SET public = false;
