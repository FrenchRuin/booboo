-- =============================================
-- 010_asset_categories.sql
-- 자산 유형(통장/적금/주식)을 고정 CHECK 제약 대신
-- categories/income_categories와 동일한 방식으로 앱에서 직접 관리
-- =============================================

CREATE TABLE public.asset_categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  color      text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true
);

ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;

-- categories/income_categories와 동일: 인증된 유저(부부 둘 다)는 조회/추가/수정 가능
CREATE POLICY "asset_categories_select" ON public.asset_categories
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "asset_categories_insert" ON public.asset_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "asset_categories_update" ON public.asset_categories
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (true);

-- 기존 3종 고정 유형을 기본 카테고리로 시드
INSERT INTO public.asset_categories (name, color, sort_order) VALUES
  ('통장', '#5B9BFF', 1),
  ('적금', '#34D399', 2),
  ('주식', '#C084FC', 3);

-- assets.type(text, CHECK 제약) -> assets.category_id(asset_categories FK)로 전환
ALTER TABLE public.assets ADD COLUMN category_id uuid REFERENCES public.asset_categories(id);

UPDATE public.assets a
SET category_id = c.id
FROM public.asset_categories c
WHERE a.type = CASE c.name
  WHEN '통장' THEN 'bank'
  WHEN '적금' THEN 'savings'
  WHEN '주식' THEN 'stock'
END;

ALTER TABLE public.assets ALTER COLUMN category_id SET NOT NULL;
ALTER TABLE public.assets DROP COLUMN type;
