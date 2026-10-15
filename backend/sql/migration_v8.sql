-- ============================================================
-- Studia Migration v8 — Vai trò (học sinh / quản lý), lượt upload sách, thanh toán chuyển khoản
-- Chạy sau migration_v7.sql, trong Supabase SQL Editor.
--
-- Mô hình:
--   * user_accounts: vai trò + trạng thái khoá của từng tài khoản (backend tạo dòng ở request đầu tiên).
--   * credit_ledger: sổ lượt upload. Số lượt còn = free_book_limit (app_settings) + tổng delta.
--       purchase +N, upload -1, admin_adjust ±N. Quản lý không bị giới hạn.
--   * credit_packs: các gói lượt sách quản lý bán (giá VNĐ).
--   * payment_orders: đơn mua gói, mã nội dung chuyển khoản riêng (VD STD7K2QX).
--   * payment_transactions: mọi giao dịch ngân hàng webhook gửi tới (SePay), chống xử lý trùng theo provider_txn_id.
--   * documents.visibility: 'private' (sách riêng) | 'shared' (thư viện chung, mọi học sinh đọc được)
--       | 'shared_draft' (đã vào thư viện chung nhưng chưa hiện cho học sinh).
-- Mọi bảng dưới đây chỉ backend (service_role) ghi. Trình duyệt chỉ đọc dữ liệu của chính mình nếu cần.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_user_accounts_role ON public.user_accounts(role, status);
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON public.user_accounts(lower(email));

CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.credit_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    books INT NOT NULL CHECK (books > 0),
    price_vnd BIGINT NOT NULL DEFAULT 0 CHECK (price_vnd >= 0),
    description TEXT,
    highlight BOOLEAN NOT NULL DEFAULT false,
    active BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pack_id UUID REFERENCES public.credit_packs(id) ON DELETE SET NULL,
    pack_name TEXT NOT NULL,
    books INT NOT NULL,
    amount_vnd BIGINT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'review', 'expired', 'cancelled', 'rejected')),
    paid_method TEXT CHECK (paid_method IN ('webhook', 'manual')),
    paid_amount_vnd BIGINT,
    paid_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    note TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON public.payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON public.payment_orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    delta INT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('purchase', 'upload', 'admin_adjust', 'refund')),
    note TEXT,
    order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON public.credit_ledger(user_id, created_at DESC);
-- Một đơn chỉ được cộng lượt một lần
CREATE UNIQUE INDEX IF NOT EXISTS uq_credit_ledger_order_purchase
    ON public.credit_ledger(order_id) WHERE reason = 'purchase';

CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL DEFAULT 'sepay',
    provider_txn_id TEXT NOT NULL,
    amount_vnd BIGINT NOT NULL,
    content TEXT,
    code TEXT,
    match_status TEXT NOT NULL DEFAULT 'unmatched'
        CHECK (match_status IN ('matched', 'underpaid', 'unmatched', 'duplicate_order', 'assigned', 'ignored')),
    order_id UUID REFERENCES public.payment_orders(id) ON DELETE SET NULL,
    raw JSONB NOT NULL DEFAULT '{}'::jsonb,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_txn_id)
);
CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON public.payment_transactions(match_status, received_at DESC);

ALTER TABLE public.documents
    ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';
DO $$ BEGIN
    ALTER TABLE public.documents ADD CONSTRAINT documents_visibility_check
        CHECK (visibility IN ('private', 'shared', 'shared_draft'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_documents_visibility ON public.documents(visibility, created_at DESC);

-- ---------- RLS ----------
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own account" ON public.user_accounts;
CREATE POLICY "Read own account" ON public.user_accounts FOR SELECT TO authenticated USING (id = (SELECT auth.uid()));

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own ledger" ON public.credit_ledger;
CREATE POLICY "Read own ledger" ON public.credit_ledger FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

ALTER TABLE public.payment_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read own orders" ON public.payment_orders;
CREATE POLICY "Read own orders" ON public.payment_orders FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read active packs" ON public.credit_packs;
CREATE POLICY "Read active packs" ON public.credit_packs FOR SELECT TO authenticated USING (active);

-- Giao dịch ngân hàng và cài đặt: không mở cho trình duyệt.
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Sách trong thư viện chung: mọi tài khoản đăng nhập đều đọc được.
DROP POLICY IF EXISTS "Read shared documents" ON public.documents;
CREATE POLICY "Read shared documents" ON public.documents FOR SELECT TO authenticated USING (visibility = 'shared');

-- ---------- Dữ liệu mặc định ----------
INSERT INTO public.app_settings (key, value) VALUES
    ('free_book_limit', '1'::jsonb),
    ('order_ttl_minutes', '15'::jsonb),
    ('bank', '{"bank_id": "", "account_no": "", "account_name": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Gói mẫu: giá 0 và chưa mở bán. Quản lý đặt giá rồi bật "Đang bán" trong trang Quản trị › Gói & cài đặt.
INSERT INTO public.credit_packs (name, books, price_vnd, description, highlight, active, sort_order)
SELECT * FROM (VALUES
    ('Gói nhỏ', 3, 0::bigint, 'Cho một bộ đề và vài sách bổ trợ', false, false, 1),
    ('Gói vừa', 10, 0::bigint, 'Đủ cho cả lộ trình ôn thi', true, false, 2),
    ('Gói lớn', 30, 0::bigint, 'Cho người học lâu dài hoặc giáo viên', false, false, 3)
) AS v(name, books, price_vnd, description, highlight, active, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.credit_packs);

-- Chỉ định quản lý đầu tiên: đặt ADMIN_EMAILS trong backend/.env (khuyên dùng), hoặc chạy:
-- UPDATE public.user_accounts SET role = 'admin' WHERE lower(email) = 'ban@email.com';
