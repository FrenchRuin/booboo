-- =============================================
-- 004_profiles_fix.sql
-- profiles INSERT 정책 추가 + 누락된 프로필 행 생성
-- =============================================

-- upsert 허용을 위한 INSERT 정책 추가
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 기존 유저 중 profiles 행이 없는 경우 생성
INSERT INTO public.profiles (id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'display_name', '사용자')
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
