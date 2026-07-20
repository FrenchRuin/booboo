'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Heart, MailCheck } from 'lucide-react'

type Mode = 'password' | 'magic'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('이메일 또는 비밀번호가 올바르지 않아요.')
    } else {
      router.push('/expenses')
    }
    setLoading(false)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError('이메일 전송에 실패했어요. 잠시 후 다시 시도해주세요.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] dark:bg-[#0A0E14] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
            <Heart className="w-7 h-7 text-blue-500 dark:text-blue-400" fill="currentColor" strokeWidth={0} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">우리 가계부</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">둘이서 함께 쓰는 가계부</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
          {/* 모드 탭 */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5">
            <button
              type="button"
              onClick={() => { setMode('password'); setError(null); setSent(false) }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'password' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              비밀번호
            </button>
            <button
              type="button"
              onClick={() => { setMode('magic'); setError(null); setSent(false) }}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === 'magic' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              매직링크
            </button>
          </div>

          {/* 비밀번호 로그인 */}
          {mode === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 입력"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                />
              </div>
              {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>
          )}

          {/* 매직링크 로그인 */}
          {mode === 'magic' && (
            sent ? (
              <div className="text-center py-4">
                <MailCheck className="w-9 h-9 mx-auto mb-3 text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
                <p className="font-medium text-gray-900 dark:text-gray-50">이메일을 확인해주세요</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span className="font-medium text-gray-700 dark:text-gray-200">{email}</span>으로<br />
                  로그인 링크를 보냈어요.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="mt-4 text-sm text-gray-400 dark:text-gray-500 underline"
                >
                  다시 보내기
                </button>
              </div>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">이메일</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-400 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 text-sm"
                  />
                </div>
                {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-xl font-medium hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:opacity-50 text-sm"
                >
                  {loading ? '전송 중...' : '매직링크 받기'}
                </button>
              </form>
            )
          )}
        </div>
      </div>
    </div>
  )
}
