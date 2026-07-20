'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import ChevronIcon from '@/components/ChevronIcon'
import { FormSkeleton, Spinner } from '@/components/Skeleton'
import type { Category, IncomeCategory, Profile } from '@/types'

type EntryType = 'expense' | 'income'

type Props = {
  currentUserId: string
}

function AddExpenseForm({ currentUserId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const editId = searchParams.get('id')
  const editType = (searchParams.get('type') as EntryType) ?? 'expense'
  const isEdit = !!editId

  const [entryType, setEntryType] = useState<EntryType>(editType)
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [personId, setPersonId] = useState(currentUserId)

  const [categories, setCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)
  const [error, setError] = useState<string | null>(null)

  // 카테고리/프로필 로드
  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('income_categories').select('*').order('sort_order'),
      supabase.from('profiles').select('*'),
    ]).then(([catRes, incCatRes, profileRes]) => {
      if (catRes.data) setCategories(catRes.data)
      if (incCatRes.data) setIncomeCategories(incCatRes.data)
      if (profileRes.data) setProfiles(profileRes.data)
    })
  }, [])

  // 수정 모드: 기존 데이터 로드
  const fetchEdit = useCallback(async () => {
    if (!editId) return
    const supabase = createClient()
    const table = editType === 'expense' ? 'expenses' : 'incomes'
    const { data } = await supabase.from(table).select('*').eq('id', editId).single()
    if (data) {
      setAmount(data.amount.toLocaleString('ko-KR'))
      setCategoryId(data.category_id ?? null)
      setNote(data.note ?? '')
      setDate(data.date)
      setPersonId(editType === 'expense' ? data.paid_by : data.received_by)
    }
    setInitialLoading(false)
  }, [editId, editType])

  useEffect(() => { fetchEdit() }, [fetchEdit])

  const formatAmount = (val: string) => {
    const num = val.replace(/[^0-9]/g, '')
    return num ? parseInt(num, 10).toLocaleString('ko-KR') : ''
  }

  const handleTypeChange = (type: EntryType) => {
    if (isEdit) return
    setEntryType(type)
    setCategoryId(null)
    setPersonId(currentUserId)
  }

  const handleSubmit = async () => {
    if (!categoryId) { setError('카테고리를 선택해주세요.'); return }
    const parsedAmount = parseInt(amount.replace(/,/g, ''), 10)
    if (!parsedAmount || parsedAmount <= 0) { setError('올바른 금액을 입력해주세요.'); return }

    setLoading(true)
    setError(null)
    const supabase = createClient()

    const base = { amount: parsedAmount, category_id: categoryId, note: note.trim() || null, date }
    let err

    if (entryType === 'expense') {
      const payload = { ...base, paid_by: personId }
      ;({ error: err } = isEdit
        ? await supabase.from('expenses').update(payload).eq('id', editId!)
        : await supabase.from('expenses').insert(payload))
    } else {
      const payload = { ...base, received_by: personId }
      ;({ error: err } = isEdit
        ? await supabase.from('incomes').update(payload).eq('id', editId!)
        : await supabase.from('incomes').insert(payload))
    }

    if (err) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      setLoading(false)
    } else {
      router.push('/expenses')
    }
  }

  const me = profiles.find((p) => p.id === currentUserId)
  const partner = profiles.find((p) => p.id !== currentUserId)
  const currentCategories = (entryType === 'expense' ? categories : incomeCategories).filter(
    (c) => c.is_active || c.id === categoryId
  )
  const personLabel = entryType === 'expense' ? '결제자' : '수취인'

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-4 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          >
            <ChevronIcon direction="left" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">
            {isEdit ? '내역 수정' : '내역 추가'}
          </h1>
        </div>
      </header>

      <div className="px-4 pt-5 pb-[calc(8rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full">
        {initialLoading ? (
          <FormSkeleton />
        ) : (
          <div className="space-y-4">
            {/* 지출 / 소득 탭 */}
            <div className={`flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 ${isEdit ? 'opacity-60 pointer-events-none' : ''}`}>
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  entryType === 'expense' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                💳 지출
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  entryType === 'income' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                💰 소득
              </button>
            </div>

            {/* 금액 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">금액</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(formatAmount(e.target.value))}
                  placeholder="0"
                  className="w-full text-2xl font-bold px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 dark:text-gray-50 bg-gray-50 dark:bg-gray-800"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 font-medium">원</span>
              </div>
            </div>

            {/* 카테고리 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">카테고리</label>
              <div className="flex flex-wrap gap-2">
                {currentCategories.map((cat) => {
                  const selected = categoryId === cat.id
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      style={{
                        backgroundColor: cat.color + (selected ? '33' : '18'),
                        color: cat.color,
                        borderColor: selected ? cat.color : 'transparent',
                      }}
                      className="px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors"
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 결제자 / 수취인 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">{personLabel}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPersonId(currentUserId)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    personId === currentUserId ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900'
                  }`}
                >
                  {me?.display_name ?? '나'}
                </button>
                {partner && (
                  <button
                    type="button"
                    onClick={() => setPersonId(partner.id)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      personId === partner.id ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900'
                    }`}
                  >
                    {partner.display_name}
                  </button>
                )}
              </div>
            </div>

            {/* 날짜 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 dark:text-gray-50 bg-gray-50 dark:bg-gray-800"
              />
            </div>

            {/* 메모 */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">메모 (선택)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={entryType === 'expense' ? '어디서 뭘 샀는지...' : '어디서 받은 소득인지...'}
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 dark:text-gray-50 placeholder-gray-400 dark:placeholder-gray-500 bg-gray-50 dark:bg-gray-800"
              />
            </div>

            {error && <p className="text-sm text-red-500 dark:text-red-400 px-1">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-semibold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
                entryType === 'expense'
                  ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-300'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {loading && <Spinner />}
              {loading ? '저장 중...' : isEdit ? '수정 완료' : entryType === 'expense' ? '지출 저장' : '소득 저장'}
            </button>
          </div>
        )}
      </div>
      </main>

      <BottomNav />
    </div>
  )
}

export default function AddExpenseClient(props: Props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gray-200 dark:border-gray-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <AddExpenseForm {...props} />
    </Suspense>
  )
}
