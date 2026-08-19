-- ========================================================
-- STUDIA SAMPLE DATA (Dữ liệu mẫu)
-- ========================================================

-- 1. Tạo một user mẫu (nếu chưa có)
-- Sẽ dùng email: demo@studia.com | mật khẩu: password123
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'demo@studia.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Demo User"}',
    now(),
    now()
) ON CONFLICT (id) DO NOTHING;

-- 2. Tạo Profile cho user demo
INSERT INTO public.learning_profiles (id, full_name, learning_goal, preferred_daily_minutes)
VALUES ('11111111-1111-1111-1111-111111111111', 'Người dùng Demo', 'Học về AI và Machine Learning', 60)
ON CONFLICT (id) DO NOTHING;

-- 3. Tạo Document mẫu
INSERT INTO public.documents (id, user_id, title, source_type, processing_status)
VALUES ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Giới thiệu về Attention Mechanism', 'text', 'completed')
ON CONFLICT (id) DO NOTHING;

-- 4. Tạo Topics (Knowledge Graph Nodes)
INSERT INTO public.topics (id, document_id, name, slug, description, difficulty_level)
VALUES 
('33333333-3333-3333-3333-333333333331', '22222222-2222-2222-2222-222222222222', 'Attention Mechanism', 'attention-mechanism', 'Cơ chế chú ý trong deep learning', 3),
('33333333-3333-3333-3333-333333333332', '22222222-2222-2222-2222-222222222222', 'Self-Attention', 'self-attention', 'Cơ chế tự chú ý (Query, Key, Value)', 4),
('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Transformer Architecture', 'transformer-architecture', 'Kiến trúc mạng nơ-ron Transformer', 5)
ON CONFLICT (id) DO NOTHING;

-- 5. Tạo Topic Relationships
INSERT INTO public.topic_relationships (source_topic_id, target_topic_id, relationship_type, weight)
VALUES 
('33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333331', 'prerequisite', 1.0),
('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333331', 'contains', 1.0)
ON CONFLICT DO NOTHING;

-- 6. Tạo Learning Path & Steps
INSERT INTO public.learning_paths (id, user_id, document_id, title, description, estimated_hours)
VALUES ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Mastering Transformers', 'Lộ trình học cơ bản về mô hình Transformer', 5.0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.learning_path_steps (id, learning_path_id, topic_id, step_order, status)
VALUES 
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333331', 1, 'in_progress'),
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333332', 2, 'locked'),
(gen_random_uuid(), '44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 3, 'locked')
ON CONFLICT DO NOTHING;

-- 7. Tạo Lessons
INSERT INTO public.lessons (id, topic_id, title, content_markdown, key_takeaways)
VALUES (
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333331', 
    'Khám Phá: Attention Mechanism', 
    'Attention Mechanism (Cơ chế chú ý) là một đột phá quan trọng trong Học Sâu (Deep Learning), cho phép mô hình tập trung vào các thành phần quan trọng nhất của dữ liệu đầu vào.', 
    '["Giải quyết triệt để nút thắt cổ chai của RNN/LSTM", "Tính toán song song hiệu quả", "Nền tảng của mô hình Transformer"]'::jsonb
) ON CONFLICT DO NOTHING;

-- 8. Tạo Quizzes & Questions
INSERT INTO public.quizzes (id, topic_id, title, quiz_type)
VALUES ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333331', 'Quiz: Attention Cơ Bản', 'adaptive')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.questions (id, quiz_id, question_text, question_type, options, correct_answer, explanation, difficulty)
VALUES 
(
    gen_random_uuid(),
    '55555555-5555-5555-5555-555555555555', 
    'Mục đích chính của Attention Mechanism là gì?', 
    'multiple_choice', 
    '["Tăng tốc độ training", "Giúp mô hình tập trung vào phần thông tin quan trọng nhất", "Giảm dung lượng mô hình"]'::jsonb, 
    'Giúp mô hình tập trung vào phần thông tin quan trọng nhất', 
    'Attention sinh ra trọng số cho từng thành phần của đầu vào.', 
    2
)
ON CONFLICT DO NOTHING;

-- 9. Tạo Knowledge State cho User Demo
INSERT INTO public.knowledge_states (id, user_id, topic_id, mastery_score, confidence_score, retention_score)
VALUES 
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333331', 45.0, 0.6, 0.8)
ON CONFLICT DO NOTHING;
