-- =============================================
-- 005_recurring_expenses.sql
-- 고정비 템플릿 테이블
-- =============================================

CREATE TABLE public.recurring_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  amount        integer NOT NULL CHECK (amount > 0),
  category_id   uuid,                           -- expenses.categories 또는 income_categories 참조 (type으로 구분)
  type          text NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
  period        text NOT NULL DEFAULT 'monthly' CHECK (period IN ('monthly', 'yearly')),
  apply_month   integer CHECK (apply_month BETWEEN 1 AND 12),  -- yearly일 때만 사용
  day_of_month  integer NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 31),
  paid_by       uuid NOT NULL REFERENCES auth.users(id),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

-- 부부 모두 조회 가능
CREATE POLICY "recurring_select" ON public.recurring_expenses
  FOR SELECT USING (auth.role() = 'authenticated');

-- 본인 항목만 등록
CREATE POLICY "recurring_insert" ON public.recurring_expenses
  FOR INSERT WITH CHECK (auth.uid() = paid_by);

-- 본인 항목만 수정
CREATE POLICY "recurring_update" ON public.recurring_expenses
  FOR UPDATE USING (auth.uid() = paid_by) WITH CHECK (auth.uid() = paid_by);

-- 본인 항목만 삭제
CREATE POLICY "recurring_delete" ON public.recurring_expenses
  FOR DELETE USING (auth.uid() = paid_by);
