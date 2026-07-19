-- =============================================
-- 003_profile_avatar.sql
-- profiles 테이블에 avatar_url 컬럼 추가
-- =============================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Storage 버킷 정책 (Supabase 대시보드 Storage에서 avatars 버킷 생성 후 실행)
CREATE POLICY "avatar upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "avatar public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
