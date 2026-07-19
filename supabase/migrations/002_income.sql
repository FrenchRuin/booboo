-- =============================================
-- 002_income.sql
-- 소득 테이블 추가
-- =============================================

-- 1. income_categories 테이블
CREATE TABLE public.income_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  icon       text NOT NULL,
  color      text NOT NULL,
  sort_order integer DEFAULT 0
);

ALTER TABLE public.income_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "income_categories_select" ON public.income_categories
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO public.income_categories (name, icon, color, sort_order) VALUES
  ('급여',     '💰', '#4CAF50', 1),
  ('부수입',   '💵', '#2196F3', 2),
  ('이자/배당','🏦', '#009688', 3),
  ('용돈',     '🎁', '#E91E63', 4),
  ('기타',     '📦', '#9E9E9E', 5);


-- 2. incomes 테이블
CREATE TABLE public.incomes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount      integer NOT NULL CHECK (amount > 0),
  category_id uuid REFERENCES public.income_categories(id),
  note        text,
  received_by uuid NOT NULL REFERENCES auth.users(id),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now(),
  deleted_at  timestamptz
);

ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incomes_select" ON public.incomes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "incomes_insert" ON public.incomes
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 본인 소득만 소프트 삭제 가능
CREATE POLICY "incomes_update" ON public.incomes
  FOR UPDATE USING (auth.uid() = received_by) WITH CHECK (true);


-- 3. Realtime 활성화
ALTER publication supabase_realtime ADD TABLE public.incomes;
