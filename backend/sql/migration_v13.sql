-- ============================================================
-- Studia Migration v13 — Khoá bảng exam_sessions khỏi truy cập trực tiếp của trình duyệt/app (T24, P0 bảo mật)
-- Chạy sau migration_v12.sql, trong Supabase SQL Editor. Có thể chạy lại nhiều lần (idempotent).
--
-- Vấn đề: migration_v4 tạo policy "Owner access" FOR ALL cho role authenticated trên exam_sessions.
-- Học viên dùng anon key + JWT của mình gọi thẳng PostgREST có thể:
--   * đọc cột exam_snapshot (chứa đáp án đề thi);
--   * PATCH result_json / overall_band / section_scores / status để tự sửa điểm và trạng thái phiên thi.
--
-- Cách xử lý: web và app không truy cập bảng này trực tiếp (chỉ qua backend /api/v1/exam bằng service_role,
-- service_role bypass RLS). Vì vậy thu hồi toàn bộ quyền của anon/authenticated, bỏ mọi policy, giữ RLS bật.
-- Không có policy nào + không có GRANT => client nhận 401/403 (hoặc mảng rỗng), backend không bị ảnh hưởng.
-- ============================================================

-- 1. Giữ RLS bật (phòng trường hợp ai đó tắt) và ép áp dụng cả với chủ bảng thông thường.
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Bỏ policy cũ (tên đã biết) và mọi policy khác còn sót trên bảng này.
DROP POLICY IF EXISTS "Owner access" ON public.exam_sessions;
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'exam_sessions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.exam_sessions', p.policyname);
    END LOOP;
END $$;

-- 3. Thu hồi quyền của client ở cấp bảng và cấp cột (REVOKE ALL trên bảng đã bao gồm cột).
REVOKE ALL ON TABLE public.exam_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.exam_sessions FROM PUBLIC;

-- 4. Bảo đảm backend (service_role) vẫn đủ quyền; role này cũng bypass RLS.
GRANT ALL ON TABLE public.exam_sessions TO service_role;

-- Ghi chú: nếu sau này cần cho app đọc lịch sử trực tiếp, chỉ GRANT SELECT trên các cột an toàn
-- (id, exam_type, exam_mode, status, submitted_at, overall_band, created_at — KHÔNG gồm exam_snapshot,
-- answers_json, result_json) kèm policy SELECT USING (user_id = (SELECT auth.uid())). KHÔNG cấp INSERT/UPDATE/DELETE.
