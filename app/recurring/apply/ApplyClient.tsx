'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import CategoryBadge from '@/components/CategoryBadge'
import ChevronIcon from '@/components/ChevronIcon'
import { CardListSkeleton, Spinner } from '@/components/Skeleton'
import type { Profile, RecurringExpense, Category, IncomeCategory } from '@/types'

type ApplyItem = RecurringExpense & {
  editAmount: string
  checked: boolean
}

type Props = {
  currentUserId: string
}

function ApplyForm({ currentUserId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const now = new Date()
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))

  const [applyItems, setApplyItems] = useState<ApplyItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const supabase = createClient()
      const [{ data: recurringData }, { data: catData }, { data: incCatData }, { data: profileData }] =
        await Promise.all([
          supabase.from('recurring_expenses').select('*').eq('is_active', true).order('created_at'),
          supabase.from('categories').select('*').order('sort_order'),
          supabase.from('income_categories').select('*').order('sort_order'),
          supabase.from('profiles').select('*'),
        ])

      if (catData) setCategories(catData)
      if (incCatData) setIncomeCategories(incCatData)
      if (profileData) setProfiles(profileData)

      const allItems = (recurringData as RecurringExpense[]) ?? []
      const applicable = allItems.filter((item) =>
        item.period === 'monthly' || (item.period === 'yearly' && item.apply_month === month)
      )
      setApplyItems(applicable.map((item) => ({
        ...item,
        editAmount: item.amount.toLocaleString('ko-KR'),
        checked: true,
      })))
      setLoading(false)
    }
    fetch()
  }, [month])

  const formatAmount = (val: string) => {
    const num = val.replace(/[^0-9]/g, '')
    return num ? parseInt(num, 10).toLocaleString('ko-KR') : ''
  }

  const getApplyDate = (day: number) => {
    const lastDay = new Date(year, month, 0).getDate()
    const d = Math.min(day, lastDay)
    return `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  const getCategoryInfo = (item: RecurringExpense) =>
    item.type === 'expense'
      ? categories.find((c) => c.id === item.category_id)
      : incomeCategories.find((c) => c.id === item.category_id)

  const handleApply = async () => {
    const selected = applyItems.filter((i) => i.checked)
    if (selected.length === 0) return
    setApplying(true)
    setError(null)
    const supabase = createClient()

    const expInserts = selected
      .filter((i) => i.type === 'expense')
      .map((i) => ({
        amount: parseInt(i.editAmount.replace(/,/g, ''), 10),
        category_id: i.category_id,
        note: i.title,
        paid_by: i.paid_by,
        date: getApplyDate(i.day_of_month),
      }))
      .filter((i) => i.amount > 0)

    const incInserts = selected
      .filter((i) => i.type === 'income')
      .map((i) => ({
        amount: parseInt(i.editAmount.replace(/,/g, ''), 10),
        category_id: i.category_id,
        note: i.title,
        received_by: i.paid_by,
        date: getApplyDate(i.day_of_month),
      }))
      .filter((i) => i.amount > 0)

    const errs: string[] = []
    if (expInserts.length > 0) {
      const { error } = await supabase.from('expenses').insert(expInserts)
      if (error) errs.push(error.message)
    }
    if (incInserts.length > 0) {
      const { error } = await supabase.from('incomes').insert(incInserts)
      if (error) errs.push(error.message)
    }

    if (errs.length > 0) {
      setError('적용 실패: ' + errs.join(', '))
      setApplying(false)
    } else {
      router.push('/expenses')
    }
  }

  const selectedCount = applyItems.filter((i) => i.checked).length

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white px-5 pt-12 pb-4 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors text-gray-600"
          >
            <ChevronIcon direction="left" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">고정비 적용</h1>
            <p className="text-xs text-gray-400">{year}년 {month}월 · 금액 수정 후 적용하세요</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-5 max-w-lg mx-auto w-full">
        {loading ? (
          <CardListSkeleton />
        ) : applyItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm text-gray-500 mb-1">{month}월에 해당하는 고정비가 없어요</p>
            <p className="text-xs text-gray-400">하단 고정비 탭에서 등록해주세요</p>
          </div>
        ) : (
          <div className="space-y-2">
            {applyItems.map((item) => {
              const cat = getCategoryInfo(item)
              const lastDay = new Date(year, month, 0).getDate()
              const day = Math.min(item.day_of_month, lastDay)
              const payer = profiles.find((p) => p.id === item.paid_by)

              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-colors ${
                    item.checked ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-white opacity-60'
                  }`}
                >
                  <button
                    onClick={() =>
                      setApplyItems((prev) =>
                        prev.map((i) => i.id === item.id ? { ...i, checked: !i.checked } : i)
                      )
                    }
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      item.checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {item.checked && <span className="text-white text-[10px] font-bold">✓</span>}
                  </button>

                  {cat ? (
                    <CategoryBadge category={cat} size="sm" />
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-gray-100 text-gray-500">기타</span>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {month}월 {day}일 · {payer?.display_name ?? '나'}
                      {item.period === 'yearly' && <span className="ml-1 text-orange-400">연간</span>}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.editAmount}
                      onChange={(e) =>
                        setApplyItems((prev) =>
                          prev.map((i) =>
                            i.id === item.id ? { ...i, editAmount: formatAmount(e.target.value) } : i
                          )
                        )
                      }
                      className="w-24 text-right text-sm font-bold text-gray-900 border-b-2 border-gray-200 focus:border-blue-500 focus:outline-none bg-transparent py-0.5"
                    />
                    <span className="text-xs text-gray-400">원</span>
                  </div>
                </div>
              )
            })}

            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

            <div className="pt-2">
              <button
                onClick={handleApply}
                disabled={applying || selectedCount === 0}
                className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl font-semibold text-base transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {applying && <Spinner />}
                {applying ? '적용 중...' : `${selectedCount}건 적용하기`}
              </button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default function ApplyClient(props: Props) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <ApplyForm {...props} />
    </Suspense>
  )
}
