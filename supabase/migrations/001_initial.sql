-- =============================================
-- 001_initial.sql
-- 신혼부부 가계부 초기 스키마
-- =============================================

-- 1. profiles 테이블 (auth.users 확장)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '사용자',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 인증된 유저는 모든 프로필 읽기 가능 (파트너 이름 표시용)
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- 본인 프로필만 수정 가능
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 회원가입 시 자동으로 profiles 행 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', '사용자'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. categories 테이블
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  sort_order integer DEFAULT 0
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- 인증된 유저는 카테고리 읽기만 가능 (관리는 대시보드에서)
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (auth.role() = 'authenticated');

-- 기본 카테고리 시드
INSERT INTO public.categories (name, icon, color, sort_order) VALUES
  ('식비',   '🍔', '#FF6B6B', 1),
  ('외식',   '🍽️', '#FF8E53', 2),
  ('교통',   '🚌', '#4ECDC4', 3),
  ('마트',   '🛒', '#45B7D1', 4),
  ('문화',   '🎬', '#96CEB4', 5),
  ('의료',   '💊', '#DDA0DD', 6),
  ('기타',   '📦', '#B0B0B0', 7);


-- 3. expenses 테이블
CREATE TABLE public.expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount      integer NOT NULL CHECK (amount > 0),
  category_id uuid REFERENCES public.categories(id),
  note        text,
  paid_by     uuid NOT NULL REFERENCES auth.users(id),
  date        date NOT NULL DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now(),
  deleted_at  timestamptz          -- 소프트 삭제
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- 인증된 유저는 삭제되지 않은 모든 지출 읽기 가능 (부부 공유)
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
  );

-- 인증된 유저는 지출 등록 가능
CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 본인이 등록한 지출만 소프트 삭제 가능 (deleted_at 업데이트)
CREATE POLICY "expenses_soft_delete" ON public.expenses
  FOR UPDATE USING (auth.uid() = paid_by);


-- 4. Realtime 활성화 (expenses 테이블)
ALTER publication supabase_realtime ADD TABLE public.expenses;
