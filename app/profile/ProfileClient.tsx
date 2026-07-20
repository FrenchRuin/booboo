'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import ChevronIcon from '@/components/ChevronIcon'
import { Spinner } from '@/components/Skeleton'
import { type ThemeMode, getStoredTheme, setTheme } from '@/lib/theme'

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: '라이트', icon: '☀️' },
  { mode: 'dark', label: '다크', icon: '🌙' },
  { mode: 'system', label: '시스템', icon: '⚙️' },
]

type Props = {
  userId: string
  email: string
}

export default function ProfileClient({ userId, email }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [nameSaving, setNameSaving] = useState(false)
  const [nameSuccess, setNameSuccess] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')

  useEffect(() => {
    setThemeMode(getStoredTheme())
  }, [])

  const handleThemeChange = (mode: ThemeMode) => {
    setTheme(mode)
    setThemeMode(mode)
  }

  // DB에서 최신 프로필을 읽어와 state 갱신
  const fetchProfile = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      setError('프로필 불러오기 실패: ' + error.message)
      return
    }
    if (data) {
      setDisplayName(data.display_name ?? '')
      setAvatarUrl((data as Record<string, unknown>).avatar_url as string | null ?? null)
    }
  }, [userId])

  // 마운트 시 최신 데이터 로드
  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleNameSave = async () => {
    if (!displayName.trim()) return
    setNameSaving(true)
    setNameSuccess(false)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, display_name: displayName.trim() })
    if (error) {
      setError('닉네임 저장에 실패했어요: ' + error.message)
    } else {
      setNameSuccess(true)
      setTimeout(() => setNameSuccess(false), 2000)
    }
    setNameSaving(false)
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 미리보기 (업로드 완료 전 즉시 표시)
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)

    setAvatarUploading(true)
    setError(null)
    const supabase = createClient()

    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('사진 업로드에 실패했어요: ' + uploadError.message)
      setAvatarPreview(null)
      setAvatarUploading(false)
      return
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ id: userId, avatar_url: publicUrl })

    if (updateError) {
      setError('프로필 업데이트에 실패했어요: ' + updateError.message)
    } else {
      // 저장 후 DB에서 다시 읽어서 실제 반영된 값으로 state 갱신
      await fetchProfile()
    }
    setAvatarPreview(null)
    setAvatarUploading(false)
  }

  const handleLogout = async () => {
    setLogoutLoading(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const currentAvatar = avatarPreview ?? (avatarUrl ? avatarUrl + '?t=' + userId.slice(0, 8) : null)

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-5 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">설정</h1>
        </div>
      </header>

      <div className="px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full space-y-4">

        {/* 프로필 사진 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative group"
              disabled={avatarUploading}
            >
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {currentAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentAvatar} alt="프로필 사진" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">👤</span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-medium">변경</span>
              </div>
              {avatarUploading && (
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-gray-50">{displayName}</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{email}</p>
            </div>
          </div>
        </div>

        {/* 닉네임 수정 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">닉네임</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 text-gray-900 dark:text-gray-50"
            />
            <button
              onClick={handleNameSave}
              disabled={nameSaving}
              className="px-4 py-2.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl text-sm font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
            >
              {nameSaving && <Spinner />}
              {nameSaving ? '저장 중' : nameSuccess ? '✓ 저장됨' : '저장'}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 dark:text-red-400 px-1">{error}</p>
        )}

        {/* 카테고리 관리 */}
        <button
          onClick={() => router.push('/settings/categories')}
          className="w-full bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-50">카테고리 관리</span>
          <ChevronIcon direction="right" className="w-4 h-4 text-gray-400 dark:text-gray-500" />
        </button>

        {/* 화면 테마 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">화면 테마</p>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {THEME_OPTIONS.map(({ mode, label, icon }) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleThemeChange(mode)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  themeMode === mode
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {/* 로그아웃 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full py-3 rounded-xl border border-red-200 text-red-500 dark:text-red-400 font-medium text-sm hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {logoutLoading && <Spinner className="w-4 h-4 border-2 border-red-300 border-t-red-500" />}
            {logoutLoading ? '로그아웃 중...' : '로그아웃'}
          </button>
        </div>

      </div>
      </main>

      <BottomNav />
    </div>
  )
}
