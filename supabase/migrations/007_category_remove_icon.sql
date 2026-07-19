-- =============================================
-- 007_category_remove_icon.sql
-- 카테고리 아이콘 제거: 이름 + 색상만으로 뱃지 표시
-- =============================================

ALTER TABLE public.categories DROP COLUMN icon;
ALTER TABLE public.income_categories DROP COLUMN icon;
