'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import ExpenseList from '@/components/ExpenseList'
import ExpenseForm, { type EditTarget } from '@/components/ExpenseForm'

type Props = {
  currentUserId: string
}

export default function ExpensesClient({ currentUserId }: Props) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null)
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
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-100 px-5 pt-12 pb-5">
        <div className="max-w-lg mx-auto">
          {/* 월 선택 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600"
            >
              ‹
            </button>
            <span className="font-semibold text-gray-900">{year}년 {month}월</span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-600 disabled:opacity-30"
            >
              ›
            </button>
          </div>

          {/* 소득 / 지출 / 잔액 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-green-600 font-medium mb-0.5">소득</p>
              <p className="text-base font-bold text-green-700 truncate">
                {summary.income.toLocaleString('ko-KR')}
                <span className="text-xs font-normal ml-0.5">원</span>
              </p>
            </div>
            <div className="bg-red-50 rounded-xl px-3 py-2.5">
              <p className="text-xs text-red-500 font-medium mb-0.5">지출</p>
              <p className="text-base font-bold text-red-600 truncate">
                {summary.expense.toLocaleString('ko-KR')}
                <span className="text-xs font-normal ml-0.5">원</span>
              </p>
            </div>
            <div className={`rounded-xl px-3 py-2.5 ${balance >= 0 ? 'bg-gray-50' : 'bg-orange-50'}`}>
              <p className="text-xs text-gray-500 font-medium mb-0.5">잔액</p>
              <p className={`text-base font-bold truncate ${balance >= 0 ? 'text-gray-900' : 'text-orange-600'}`}>
                {balance.toLocaleString('ko-KR')}
                <span className="text-xs font-normal ml-0.5">원</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* 지출 목록 */}
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4 max-w-lg mx-auto w-full">
        <ExpenseList
          key={`${year}-${month}-${refreshKey}`}
          currentUserId={currentUserId}
          year={year}
          month={month}
          onDeleted={handleSaved}
          onEdit={(target) => { setEditTarget(target); setShowForm(true) }}
        />
      </main>

      {/* + 버튼 */}
      <button
        onClick={() => { setEditTarget(null); setShowForm(true) }}
        className="fixed bottom-20 right-5 w-14 h-14 bg-gray-900 text-white text-2xl rounded-full shadow-lg flex items-center justify-center hover:bg-gray-700 transition-colors active:scale-95"
        aria-label="내역 추가"
      >
        +
      </button>

      <BottomNav />

      {showForm && (
        <ExpenseForm
          currentUserId={currentUserId}
          initialData={editTarget ?? undefined}
          onClose={() => { setShowForm(false); setEditTarget(null) }}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
