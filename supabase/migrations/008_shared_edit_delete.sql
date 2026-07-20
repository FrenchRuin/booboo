-- =============================================
-- 008_shared_edit_delete.sql
-- 지출/소득 수정·삭제를 등록자 본인이 아니어도 배우자가 가능하도록 완화
-- (부부 둘이서만 쓰는 앱이라 인증된 유저 = 우리 둘 고정 전제)
-- =============================================

DROP POLICY IF EXISTS "expenses_soft_delete" ON public.expenses;
CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (true);

DROP POLICY IF EXISTS "incomes_update" ON public.incomes;
CREATE POLICY "incomes_update" ON public.incomes
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (true);
