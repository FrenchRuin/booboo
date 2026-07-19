-- =============================================
-- 006_category_management.sql
-- 카테고리(지출/소득 유형)를 앱에서 직접 관리할 수 있도록 변경
-- =============================================

-- 1. is_active 컬럼 추가 (삭제 대신 비활성화 방식 소프트 삭제)
ALTER TABLE public.categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.income_categories ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- 2. 인증된 유저(부부 둘 다)는 카테고리 추가/수정 가능
CREATE POLICY "categories_insert" ON public.categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "categories_update" ON public.categories
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (true);

CREATE POLICY "income_categories_insert" ON public.income_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "income_categories_update" ON public.income_categories
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (true);
