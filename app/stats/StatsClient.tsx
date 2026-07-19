'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import type { Category, IncomeCategory, Profile, Expense, Income } from '@/types'

type Props = { currentUserId: string }
type ViewMode = 'monthly' | 'yearly'

type CategoryStat = { category: Category; total: number; count: number }
type IncomeCategoryStat = { category: IncomeCategory; total: number; count: number }
type PersonStat = { profile: Profile; expenseTotal: number; incomeTotal: number }

type MonthRow = {
  month: number
  income: number
  expense: number
  balance: number
}

export default function StatsClient({ currentUserId }: Props) {
  const now = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // 월별 상태
  const [grandExpense, setGrandExpense] = useState(0)
  const [grandIncome, setGrandIncome] = useState(0)
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [incomeCategoryStats, setIncomeCategoryStats] = useState<IncomeCategoryStat[]>([])
  const [personStats, setPersonStats] = useState<PersonStat[]>([])

  // 연별 상태
  const [monthRows, setMonthRows] = useState<MonthRow[]>([])
  const [yearlyIncome, setYearlyIncome] = useState(0)
  const [yearlyExpense, setYearlyExpense] = useState(0)

  const [loading, setLoading] = useState(true)

  // ── 월별 통계 ──────────────────────────────────────────
  const fetchMonthly = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: expData }, { data: incData }, { data: profilesData }] = await Promise.all([
      supabase.from('expenses').select('*, categories(*)').gte('date', from).lte('date', to).is('deleted_at', null),
      supabase.from('incomes').select('*, income_categories(*)').gte('date', from).lte('date', to).is('deleted_at', null),
      supabase.from('profiles').select('*'),
    ])

    const expenses = (expData as Expense[]) ?? []
    const incomes = (incData as Income[]) ?? []
    const profiles = (profilesData as Profile[]) ?? []
    const profileMap = new Map(profiles.map((p) => [p.id, p]))

    setGrandExpense(expenses.reduce((s, e) => s + e.amount, 0))
    setGrandIncome(incomes.reduce((s, e) => s + e.amount, 0))

    // 지출 카테고리별
    const catMap = new Map<string, CategoryStat>()
    expenses.forEach((e) => {
      if (!e.categories) return
      const ex = catMap.get(e.category_id)
      if (ex) { ex.total += e.amount; ex.count++ }
      else catMap.set(e.category_id, { category: e.categories, total: e.amount, count: 1 })
    })
    setCategoryStats(Array.from(catMap.values()).sort((a, b) => b.total - a.total))

    // 소득 카테고리별
    const incCatMap = new Map<string, IncomeCategoryStat>()
    incomes.forEach((e) => {
      if (!e.income_categories || !e.category_id) return
      const ex = incCatMap.get(e.category_id)
      if (ex) { ex.total += e.amount; ex.count++ }
      else incCatMap.set(e.category_id, { category: e.income_categories, total: e.amount, count: 1 })
    })
    setIncomeCategoryStats(Array.from(incCatMap.values()).sort((a, b) => b.total - a.total))

    // 결제자/수취인별
    const personMap = new Map<string, PersonStat>()
    const ensurePerson = (id: string) => {
      if (!personMap.has(id)) {
        const profile = profileMap.get(id)
        if (!profile) return
        personMap.set(id, { profile, expenseTotal: 0, incomeTotal: 0 })
      }
    }
    expenses.forEach((e) => { ensurePerson(e.paid_by); const p = personMap.get(e.paid_by); if (p) p.expenseTotal += e.amount })
    incomes.forEach((e) => { ensurePerson(e.received_by); const p = personMap.get(e.received_by); if (p) p.incomeTotal += e.amount })
    setPersonStats(Array.from(personMap.values()))

    setLoading(false)
  }, [year, month])

  // ── 연별 통계 ──────────────────────────────────────────
  const fetchYearly = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const from = `${year}-01-01`
    const to = `${year}-12-31`

    const [{ data: expData }, { data: incData }] = await Promise.all([
      supabase.from('expenses').select('amount, date').gte('date', from).lte('date', to).is('deleted_at', null),
      supabase.from('incomes').select('amount, date').gte('date', from).lte('date', to).is('deleted_at', null),
    ])

    const expByMonth = new Array(12).fill(0)
    const incByMonth = new Array(12).fill(0)
    ;(expData ?? []).forEach((e) => { expByMonth[new Date(e.date).getMonth()] += e.amount })
    ;(incData ?? []).forEach((e) => { incByMonth[new Date(e.date).getMonth()] += e.amount })

    const rows: MonthRow[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: incByMonth[i],
      expense: expByMonth[i],
      balance: incByMonth[i] - expByMonth[i],
    }))

    setMonthRows(rows)
    setYearlyIncome(incByMonth.reduce((s, v) => s + v, 0))
    setYearlyExpense(expByMonth.reduce((s, v) => s + v, 0))
    setLoading(false)
  }, [year])

  useEffect(() => {
    if (viewMode === 'monthly') fetchMonthly()
    else fetchYearly()
  }, [viewMode, fetchMonthly, fetchYearly])

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const isCurrentYear = year === now.getFullYear()

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white border-b border-gray-100 px-5 pt-12 pb-4">
        <div className="max-w-lg mx-auto">
          {/* 월별 / 연별 탭 */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => setViewMode('monthly')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              월별
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${viewMode === 'yearly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              연별
            </button>
          </div>

          {/* 네비게이션 */}
          {viewMode === 'monthly' ? (
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => { if (month === 1) { setYear(y => y-1); setMonth(12) } else setMonth(m => m-1) }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">‹</button>
              <span className="font-semibold text-gray-900">{year}년 {month}월</span>
              <button onClick={() => { const n = new Date(year, month); if (n > new Date()) return; if (month===12){setYear(y=>y+1);setMonth(1)}else setMonth(m=>m+1) }}
                disabled={isCurrentMonth}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-30">›</button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setYear(y => y-1)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600">‹</button>
              <span className="font-semibold text-gray-900">{year}년</span>
              <button onClick={() => setYear(y => y+1)} disabled={isCurrentYear}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 disabled:opacity-30">›</button>
            </div>
          )}

          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-green-50 rounded-xl px-3 py-2">
              <p className="text-xs text-green-600 font-medium mb-0.5">소득</p>
              <p className="text-sm font-bold text-green-700 truncate">
                {(viewMode === 'monthly' ? grandIncome : yearlyIncome).toLocaleString('ko-KR')}원
              </p>
            </div>
            <div className="bg-red-50 rounded-xl px-3 py-2">
              <p className="text-xs text-red-500 font-medium mb-0.5">지출</p>
              <p className="text-sm font-bold text-red-600 truncate">
                {(viewMode === 'monthly' ? grandExpense : yearlyExpense).toLocaleString('ko-KR')}원
              </p>
            </div>
            <div className={`rounded-xl px-3 py-2 ${(viewMode === 'monthly' ? grandIncome - grandExpense : yearlyIncome - yearlyExpense) >= 0 ? 'bg-gray-50' : 'bg-orange-50'}`}>
              <p className="text-xs text-gray-500 font-medium mb-0.5">잔액</p>
              <p className={`text-sm font-bold truncate ${(viewMode === 'monthly' ? grandIncome - grandExpense : yearlyIncome - yearlyExpense) >= 0 ? 'text-gray-900' : 'text-orange-600'}`}>
                {(viewMode === 'monthly' ? grandIncome - grandExpense : yearlyIncome - yearlyExpense).toLocaleString('ko-KR')}원
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4 max-w-lg mx-auto w-full space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
          </div>
        ) : viewMode === 'monthly' ? (
          <MonthlyContent
            grandExpense={grandExpense}
            grandIncome={grandIncome}
            categoryStats={categoryStats}
            incomeCategoryStats={incomeCategoryStats}
            personStats={personStats}
            currentUserId={currentUserId}
          />
        ) : (
          <YearlyContent
            monthRows={monthRows}
            yearlyIncome={yearlyIncome}
            yearlyExpense={yearlyExpense}
            year={year}
          />
        )}
      </main>

      <BottomNav />
    </div>
  )
}

// ── 월별 콘텐츠 ────────────────────────────────────────────
function MonthlyContent({
  grandExpense, grandIncome, categoryStats, incomeCategoryStats, personStats, currentUserId
}: {
  grandExpense: number
  grandIncome: number
  categoryStats: CategoryStat[]
  incomeCategoryStats: IncomeCategoryStat[]
  personStats: PersonStat[]
  currentUserId: string
}) {
  if (grandExpense === 0 && grandIncome === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-sm">이번 달 내역이 없어요</p>
      </div>
    )
  }

  return (
    <>
      {/* 지출 카테고리별 */}
      {categoryStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">카테고리별 지출</h2>
          <div className="space-y-3">
            {categoryStats.map(({ category, total, count }) => {
              const pct = grandExpense > 0 ? (total / grandExpense) * 100 : 0
              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span className="text-sm text-gray-700">{category.name}</span>
                      <span className="text-xs text-gray-400">{count}건</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900">{total.toLocaleString('ko-KR')}원</span>
                      <span className="text-xs text-gray-400 ml-1.5">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: category.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 소득 카테고리별 */}
      {incomeCategoryStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">소득원별 내역</h2>
          <div className="space-y-3">
            {incomeCategoryStats.map(({ category, total, count }) => {
              const pct = grandIncome > 0 ? (total / grandIncome) * 100 : 0
              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{category.icon}</span>
                      <span className="text-sm text-gray-700">{category.name}</span>
                      <span className="text-xs text-gray-400">{count}건</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-green-700">{total.toLocaleString('ko-KR')}원</span>
                      <span className="text-xs text-gray-400 ml-1.5">{pct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: category.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 결제자/수취인별 */}
      {personStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">인물별 내역</h2>
          <div className="space-y-4">
            {personStats.map(({ profile, expenseTotal, incomeTotal }) => {
              const isMe = profile.id === currentUserId
              return (
                <div key={profile.id} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span>{isMe ? '😊' : '💑'}</span>
                    <span className="text-sm font-medium text-gray-800">{profile.display_name}</span>
                    {isMe && <span className="text-xs text-gray-400">(나)</span>}
                  </div>
                  <div className="flex gap-2 text-xs">
                    {incomeTotal > 0 && (
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        소득 +{incomeTotal.toLocaleString('ko-KR')}원
                      </span>
                    )}
                    {expenseTotal > 0 && (
                      <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                        지출 -{expenseTotal.toLocaleString('ko-KR')}원
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

// ── 연별 콘텐츠 ────────────────────────────────────────────
function YearlyContent({ monthRows, yearlyIncome, yearlyExpense, year }: {
  monthRows: MonthRow[]
  yearlyIncome: number
  yearlyExpense: number
  year: number
}) {
  const hasData = yearlyIncome > 0 || yearlyExpense > 0
  const nowMonth = new Date().getMonth() + 1
  const nowYear = new Date().getFullYear()

  if (!hasData) {
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-4xl mb-2">📅</div>
        <p className="text-sm">{year}년 내역이 없어요</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 헤더 */}
      <div className="grid grid-cols-4 bg-gray-50 border-b border-gray-100 px-4 py-2.5">
        <span className="text-xs font-medium text-gray-500">월</span>
        <span className="text-xs font-medium text-green-600 text-right">소득</span>
        <span className="text-xs font-medium text-red-500 text-right">지출</span>
        <span className="text-xs font-medium text-gray-700 text-right">잔액</span>
      </div>

      {/* 월별 행 */}
      {monthRows.map((row) => {
        const isFuture = year === nowYear && row.month > nowMonth
        const isEmpty = row.income === 0 && row.expense === 0
        if (isFuture) return null

        return (
          <div
            key={row.month}
            className={`grid grid-cols-4 px-4 py-3 border-b border-gray-50 last:border-0 ${isEmpty ? 'opacity-40' : ''}`}
          >
            <span className="text-sm text-gray-600 font-medium">{row.month}월</span>
            <span className="text-sm text-green-700 text-right">
              {row.income > 0 ? row.income.toLocaleString('ko-KR') : '-'}
            </span>
            <span className="text-sm text-red-600 text-right">
              {row.expense > 0 ? row.expense.toLocaleString('ko-KR') : '-'}
            </span>
            <span className={`text-sm font-semibold text-right ${row.balance > 0 ? 'text-gray-900' : row.balance < 0 ? 'text-orange-600' : 'text-gray-400'}`}>
              {isEmpty ? '-' : row.balance.toLocaleString('ko-KR')}
            </span>
          </div>
        )
      })}

      {/* 합계 행 */}
      <div className="grid grid-cols-4 px-4 py-3 bg-gray-50 border-t border-gray-200">
        <span className="text-sm font-bold text-gray-800">합계</span>
        <span className="text-sm font-bold text-green-700 text-right">{yearlyIncome.toLocaleString('ko-KR')}</span>
        <span className="text-sm font-bold text-red-600 text-right">{yearlyExpense.toLocaleString('ko-KR')}</span>
        <span className={`text-sm font-bold text-right ${yearlyIncome - yearlyExpense >= 0 ? 'text-gray-900' : 'text-orange-600'}`}>
          {(yearlyIncome - yearlyExpense).toLocaleString('ko-KR')}
        </span>
      </div>
    </div>
  )
}
