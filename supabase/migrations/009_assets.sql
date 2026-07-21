-- =============================================
-- 009_assets.sql
-- 자산관리(통장/적금/주식) 기능 — 현재 잔액만 수동 관리, 히스토리 없음
-- =============================================

CREATE TABLE public.assets (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  type       text NOT NULL CHECK (type IN ('bank', 'savings', 'stock')),
  amount     integer NOT NULL CHECK (amount >= 0),
  owner_id   uuid NOT NULL REFERENCES auth.users(id),
  memo       text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- 우리 둘만 쓰는 앱: 인증된 유저는 서로의 자산도 자유롭게 조회/등록/수정/삭제 가능
-- (expenses/incomes와 동일하게 소유자 본인으로 제한하지 않음 — 008_shared_edit_delete.sql 참고)
CREATE POLICY "assets_select" ON public.assets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "assets_insert" ON public.assets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "assets_update" ON public.assets
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (true);

CREATE POLICY "assets_delete" ON public.assets
  FOR DELETE USING (auth.role() = 'authenticated');

ALTER PUBLICATION supabase_realtime ADD TABLE public.assets;
