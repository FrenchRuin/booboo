'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import ExpenseList from '@/components/ExpenseList'
import ChevronIcon from '@/components/ChevronIcon'

type Props = {
  currentUserId: string
}

export default function ExpensesClient({ currentUserId }: Props) {
  const router = useRouter()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState({ income: 0, expense: 0 })
  const [refreshKey, setRefreshKey] = useState(0)

  const fetchSummary = useCallback(async () => {
    const supabase = createClient()
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: expData }, { data: incData }] = await Promise.all([
      supabase.from('expenses').select('amount').gte('date', from).lte('date', to).is('deleted_at', null),
      supabase.from('incomes').select('amount').gte('date', from).lte('date', to).is('deleted_at', null),
    ])

    setSummary({
      expense: (expData ?? []).reduce((sum, e) => sum + e.amount, 0),
      income: (incData ?? []).reduce((sum, e) => sum + e.amount, 0),
    })
  }, [year, month])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary, refreshKey])

  const prevMonth = () => {
    if (month === 1) { setYear((y) => y - 1); setMonth(12) }
    else setMonth((m) => m - 1)
  }

  const nextMonth = () => {
    const next = new Date(year, month)
    if (next > new Date()) return
    if (month === 12) { setYear((y) => y + 1); setMonth(1) }
    else setMonth((m) => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const balance = summary.income - summary.expense

  const handleSaved = () => setRefreshKey((k) => k + 1)


  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-5 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto">
          {/* 월 선택 */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <ChevronIcon direction="left" />
            </button>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{year}년 {month}월</span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-30"
            >
              <ChevronIcon direction="right" />
            </button>
          </div>

          {/* 잔액 강조 */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">이번 달 잔액</p>
            <p className={`text-3xl font-bold tracking-tight ${balance >= 0 ? 'text-gray-900 dark:text-gray-50' : 'text-red-500 dark:text-red-400'}`}>
              {balance >= 0 ? '+' : ''}{balance.toLocaleString('ko-KR')}
              <span className="text-lg font-semibold ml-1">원</span>
            </p>
          </div>

          {/* 소득 / 지출 / 고정비 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-xs text-gray-400 dark:text-gray-500">소득</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {summary.income.toLocaleString('ko-KR')}원
                </span>
              </div>
              <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-xs text-gray-400 dark:text-gray-500">지출</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {summary.expense.toLocaleString('ko-KR')}원
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push(`/recurring/apply?year=${year}&month=${month}`)}
              className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 font-medium px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
            >
              🔁 고정비
            </button>
          </div>
        </div>
      </header>

      {/* 지출 목록 */}
      <div className="px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full">
        <ExpenseList
          key={`${year}-${month}-${refreshKey}`}
          currentUserId={currentUserId}
          year={year}
          month={month}
          onDeleted={handleSaved}
        />
      </div>
      </main>

      <BottomNav />
    </div>
  )
}
