'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import ExpenseList from '@/components/ExpenseList'
import { Spinner } from '@/components/Skeleton'
import { Dialog, useConfirm } from '@/components/Dialog'
import { ChevronLeft, ChevronRight, Repeat, Download, FileSpreadsheet } from 'lucide-react'
import type { Expense, Income } from '@/types'

type Props = {
  currentUserId: string
}

export default function ExpensesClient({ currentUserId }: Props) {
  const router = useRouter()
  const { alert, dialogProps } = useConfirm()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState({ income: 0, expense: 0 })
  const [refreshKey, setRefreshKey] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [sheetExporting, setSheetExporting] = useState(false)

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
  const hasData = summary.income > 0 || summary.expense > 0

  const handleSaved = () => setRefreshKey((k) => k + 1)

  const handleExport = async () => {
    if (!hasData) {
      await alert('내보낼 내역이 없어요.')
      return
    }
    setExporting(true)
    const supabase = createClient()
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: expData }, { data: incData }, { data: profileData }] = await Promise.all([
      supabase.from('expenses').select('*, categories(*)').gte('date', from).lte('date', to).is('deleted_at', null).order('date'),
      supabase.from('incomes').select('*, income_categories(*)').gte('date', from).lte('date', to).is('deleted_at', null).order('date'),
      supabase.from('profiles').select('*'),
    ])

    const profileMap = new Map((profileData ?? []).map((p) => [p.id, p.display_name as string]))

    const entries = [
      ...((expData as Expense[]) ?? []).map((e) => ({
        date: e.date,
        type: 'expense' as const,
        category: e.categories?.name ?? '기타',
        note: e.note,
        person: profileMap.get(e.paid_by) ?? '',
        amount: e.amount,
      })),
      ...((incData as Income[]) ?? []).map((e) => ({
        date: e.date,
        type: 'income' as const,
        category: e.income_categories?.name ?? '기타',
        note: e.note,
        person: profileMap.get(e.received_by) ?? '',
        amount: e.amount,
      })),
    ].sort((a, b) => a.date.localeCompare(b.date))

    const { exportMonthToExcel } = await import('@/lib/exportExcel')
    await exportMonthToExcel(year, month, entries)
    setExporting(false)
  }

  const handleGoogleExport = async () => {
    if (!hasData) {
      await alert('내보낼 내역이 없어요.')
      return
    }
    setSheetExporting(true)
    try {
      const res = await fetch('/api/export-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month }),
      })
      const data = await res.json()
      if (!res.ok) {
        await alert(data.error ?? '구글시트 내보내기에 실패했어요.')
      } else {
        window.open(data.url, '_blank')
      }
    } catch {
      await alert('구글시트 내보내기에 실패했어요.')
    }
    setSheetExporting(false)
  }


  return (
    <div className="flex flex-col h-full">
      <Dialog {...dialogProps} />
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
              <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
            </button>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{year}년 {month}월</span>
            <button
              onClick={nextMonth}
              disabled={isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
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

          {/* 소득 / 지출 */}
          <div className="flex items-center gap-4 mb-3 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 dark:text-gray-500">소득</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {summary.income.toLocaleString('ko-KR')}원
              </span>
            </div>
            <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
              <span className="text-xs text-gray-400 dark:text-gray-500">지출</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {summary.expense.toLocaleString('ko-KR')}원
              </span>
            </div>
          </div>

          {/* 내보내기 / 고정비 */}
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleExport}
              disabled={exporting || !hasData}
              aria-label="엑셀로 내보내기"
              className="flex items-center justify-center w-7 h-7 flex-shrink-0 text-gray-500 dark:text-gray-400 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {exporting ? (
                <Spinner className="w-3.5 h-3.5 border-2 border-gray-400 dark:border-gray-500 border-t-gray-600 dark:border-t-gray-300" />
              ) : (
                <Download className="w-3.5 h-3.5" strokeWidth={2.5} />
              )}
            </button>
            <button
              onClick={handleGoogleExport}
              disabled={sheetExporting || !hasData}
              aria-label="구글시트로 내보내기"
              className="flex items-center justify-center w-7 h-7 flex-shrink-0 text-gray-500 dark:text-gray-400 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
            >
              {sheetExporting ? (
                <Spinner className="w-3.5 h-3.5 border-2 border-gray-400 dark:border-gray-500 border-t-gray-600 dark:border-t-gray-300" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={2.5} />
              )}
            </button>
            <button
              onClick={() => router.push(`/recurring/apply?year=${year}&month=${month}`)}
              className="flex items-center gap-1 flex-shrink-0 text-xs text-blue-500 dark:text-blue-400 font-medium px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors whitespace-nowrap"
            >
              <Repeat className="w-3.5 h-3.5" strokeWidth={2.5} /> 고정비
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
