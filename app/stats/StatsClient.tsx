'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import PersonAvatar from '@/components/PersonAvatar'
import CategoryBadge from '@/components/CategoryBadge'
import ChevronIcon from '@/components/ChevronIcon'
import { StatsContentSkeleton } from '@/components/Skeleton'
import type { Category, IncomeCategory, Profile, Expense, Income } from '@/types'

type Props = { currentUserId: string }
type ViewMode = 'monthly' | 'daily' | 'yearly'

type CategoryStat = { category: Category; total: number; count: number }
type IncomeCategoryStat = { category: IncomeCategory; total: number; count: number }
type PersonStat = { profile: Profile; expenseTotal: number; incomeTotal: number }
type MonthRow = { month: number; income: number; expense: number; balance: number }
type DayStat = { income: number; expense: number }
type DayEntry =
  | { id: string; type: 'expense'; amount: number; note: string | null; category: Category | undefined }
  | { id: string; type: 'income'; amount: number; note: string | null; category: IncomeCategory | undefined }

const VIEW_MODE_LABEL: Record<ViewMode, string> = { monthly: '월별', daily: '일별', yearly: '연별' }

export default function StatsClient({ currentUserId }: Props) {
  const now = new Date()
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const [grandExpense, setGrandExpense] = useState(0)
  const [grandIncome, setGrandIncome] = useState(0)
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [incomeCategoryStats, setIncomeCategoryStats] = useState<IncomeCategoryStat[]>([])
  const [personStats, setPersonStats] = useState<PersonStat[]>([])

  const [monthRows, setMonthRows] = useState<MonthRow[]>([])
  const [yearlyIncome, setYearlyIncome] = useState(0)
  const [yearlyExpense, setYearlyExpense] = useState(0)

  const [dayStats, setDayStats] = useState<Record<string, DayStat>>({})
  const [dayEntries, setDayEntries] = useState<Record<string, DayEntry[]>>({})
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)

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

    const catMap = new Map<string, CategoryStat>()
    expenses.forEach((e) => {
      if (!e.categories) return
      const ex = catMap.get(e.category_id)
      if (ex) { ex.total += e.amount; ex.count++ }
      else catMap.set(e.category_id, { category: e.categories, total: e.amount, count: 1 })
    })
    setCategoryStats(Array.from(catMap.values()).sort((a, b) => b.total - a.total))

    const incCatMap = new Map<string, IncomeCategoryStat>()
    incomes.forEach((e) => {
      if (!e.income_categories || !e.category_id) return
      const ex = incCatMap.get(e.category_id)
      if (ex) { ex.total += e.amount; ex.count++ }
      else incCatMap.set(e.category_id, { category: e.income_categories, total: e.amount, count: 1 })
    })
    setIncomeCategoryStats(Array.from(incCatMap.values()).sort((a, b) => b.total - a.total))

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

    const dMap: Record<string, DayStat> = {}
    const eMap: Record<string, DayEntry[]> = {}
    const touchDay = (date: string) => {
      if (!dMap[date]) dMap[date] = { income: 0, expense: 0 }
      if (!eMap[date]) eMap[date] = []
      return dMap[date]
    }
    expenses.forEach((e) => {
      touchDay(e.date).expense += e.amount
      eMap[e.date].push({ id: e.id, type: 'expense', amount: e.amount, note: e.note, category: e.categories })
    })
    incomes.forEach((e) => {
      touchDay(e.date).income += e.amount
      eMap[e.date].push({ id: e.id, type: 'income', amount: e.amount, note: e.note, category: e.income_categories })
    })
    setDayStats(dMap)
    setDayEntries(eMap)

    setLoading(false)
  }, [year, month])

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
    if (viewMode === 'yearly') fetchYearly()
    else fetchMonthly()
  }, [viewMode, fetchMonthly, fetchYearly])

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const isCurrentYear = year === now.getFullYear()

  useEffect(() => {
    const todayStr = now.toISOString().split('T')[0]
    setSelectedDay(isCurrentMonth ? todayStr : null)
  }, [year, month, isCurrentMonth])

  const displayIncome = viewMode === 'yearly' ? yearlyIncome : grandIncome
  const displayExpense = viewMode === 'yearly' ? yearlyExpense : grandExpense
  const displayBalance = displayIncome - displayExpense

  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-5 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto">
          {/* 월별 / 일별 / 연별 탭 */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-5">
            {(['monthly', 'daily', 'yearly'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === mode ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {VIEW_MODE_LABEL[mode]}
              </button>
            ))}
          </div>

          {/* 기간 네비게이션 */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                if (viewMode === 'yearly') {
                  setYear(y => y - 1)
                } else {
                  if (month === 1) { setYear(y => y - 1); setMonth(12) } else setMonth(m => m - 1)
                }
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            >
              <ChevronIcon direction="left" />
            </button>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {viewMode === 'yearly' ? `${year}년` : `${year}년 ${month}월`}
            </span>
            <button
              onClick={() => {
                if (viewMode === 'yearly') {
                  setYear(y => y + 1)
                } else {
                  const n = new Date(year, month)
                  if (n > new Date()) return
                  if (month === 12) { setYear(y => y + 1); setMonth(1) } else setMonth(m => m + 1)
                }
              }}
              disabled={viewMode === 'yearly' ? isCurrentYear : isCurrentMonth}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 disabled:opacity-30"
            >
              <ChevronIcon direction="right" />
            </button>
          </div>

          {/* 잔액 요약 */}
          <div className="mb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">
              {viewMode === 'yearly' ? `${year}년 잔액` : '이번 달 잔액'}
            </p>
            <p className={`text-3xl font-bold tracking-tight ${displayBalance >= 0 ? 'text-gray-900 dark:text-gray-50' : 'text-red-500 dark:text-red-400'}`}>
              {displayBalance >= 0 ? '+' : ''}{displayBalance.toLocaleString('ko-KR')}
              <span className="text-lg font-semibold ml-1">원</span>
            </p>
          </div>

          {/* 소득 / 지출 인라인 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-xs text-gray-400 dark:text-gray-500">소득</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{displayIncome.toLocaleString('ko-KR')}원</span>
            </div>
            <div className="w-px h-3 bg-gray-200 dark:bg-gray-700" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-xs text-gray-400 dark:text-gray-500">지출</span>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{displayExpense.toLocaleString('ko-KR')}원</span>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full space-y-4">
        {loading ? (
          <StatsContentSkeleton />
        ) : viewMode === 'monthly' ? (
          <MonthlyContent
            grandExpense={grandExpense}
            grandIncome={grandIncome}
            categoryStats={categoryStats}
            incomeCategoryStats={incomeCategoryStats}
            personStats={personStats}
            currentUserId={currentUserId}
          />
        ) : viewMode === 'daily' ? (
          <DailyContent
            year={year}
            month={month}
            dayStats={dayStats}
            dayEntries={dayEntries}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
          />
        ) : (
          <YearlyContent
            monthRows={monthRows}
            yearlyIncome={yearlyIncome}
            yearlyExpense={yearlyExpense}
            year={year}
          />
        )}
      </div>
      </main>

      <BottomNav />
    </div>
  )
}

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
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <div className="text-4xl mb-3">📊</div>
        <p className="text-sm">이번 달 내역이 없어요</p>
      </div>
    )
  }

  return (
    <>
      {/* 지출 카테고리별 */}
      {categoryStats.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">카테고리별 지출</h2>
          <div className="space-y-4">
            {categoryStats.map(({ category, total, count }) => {
              const pct = grandExpense > 0 ? (total / grandExpense) * 100 : 0
              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-200">{category.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{count}건</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{pct.toFixed(0)}%</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">{total.toLocaleString('ko-KR')}원</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: category.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 소득 카테고리별 */}
      {incomeCategoryStats.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">소득원별 내역</h2>
          <div className="space-y-4">
            {incomeCategoryStats.map(({ category, total, count }) => {
              const pct = grandIncome > 0 ? (total / grandIncome) * 100 : 0
              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-200">{category.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{count}건</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{pct.toFixed(0)}%</span>
                      <span className="text-sm font-semibold text-green-700 dark:text-green-400">{total.toLocaleString('ko-KR')}원</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: category.color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 인물별 */}
      {personStats.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">인물별 내역</h2>
          <div className="space-y-3">
            {personStats.map(({ profile, expenseTotal, incomeTotal }) => {
              const isMe = profile.id === currentUserId
              return (
                <div key={profile.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <PersonAvatar profile={profile} size={32} />
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{profile.display_name}</p>
                      {isMe && <p className="text-xs text-gray-400 dark:text-gray-500">나</p>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    {incomeTotal > 0 && (
                      <span className="text-xs font-medium text-blue-500 dark:text-blue-400">+{incomeTotal.toLocaleString('ko-KR')}원</span>
                    )}
                    {expenseTotal > 0 && (
                      <span className="text-xs font-medium text-red-500 dark:text-red-400">-{expenseTotal.toLocaleString('ko-KR')}원</span>
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
      <div className="text-center py-20 text-gray-400 dark:text-gray-500">
        <div className="text-4xl mb-3">📅</div>
        <p className="text-sm">{year}년 내역이 없어요</p>
      </div>
    )
  }

  const maxExpense = Math.max(...monthRows.map((r) => r.expense))

  return (
    <div className="space-y-4">
      {/* 막대 차트 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">월별 지출 추이</h2>
        <div className="flex items-end gap-1.5 h-24">
          {monthRows.map((row) => {
            const isFuture = year === nowYear && row.month > nowMonth
            const heightPct = maxExpense > 0 ? (row.expense / maxExpense) * 100 : 0
            const isCurrentM = year === nowYear && row.month === nowMonth
            return (
              <div key={row.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end" style={{ height: '80px' }}>
                  <div
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      isFuture ? 'bg-gray-100 dark:bg-gray-800' : isCurrentM ? 'bg-blue-400' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    style={{ height: isFuture ? '4px' : `${Math.max(heightPct, row.expense > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className={`text-[10px] ${isCurrentM ? 'text-blue-500 dark:text-blue-400 font-semibold' : 'text-gray-400 dark:text-gray-500'}`}>
                  {row.month}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* 월별 테이블 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="grid grid-cols-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800 px-4 py-2.5">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">월</span>
          <span className="text-xs font-medium text-blue-400 dark:text-blue-300 text-right">소득</span>
          <span className="text-xs font-medium text-red-400 dark:text-red-300 text-right">지출</span>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 text-right">잔액</span>
        </div>

        {monthRows.map((row) => {
          const isFuture = year === nowYear && row.month > nowMonth
          const isEmpty = row.income === 0 && row.expense === 0
          const isCurrentM = year === nowYear && row.month === nowMonth
          if (isFuture) return null

          return (
            <div
              key={row.month}
              className={`grid grid-cols-4 px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 ${isEmpty ? 'opacity-40' : ''} ${isCurrentM ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''}`}
            >
              <span className={`text-sm font-medium ${isCurrentM ? 'text-blue-500 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                {row.month}월
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-200 text-right">
                {row.income > 0 ? row.income.toLocaleString('ko-KR') : '-'}
              </span>
              <span className="text-sm text-gray-700 dark:text-gray-200 text-right">
                {row.expense > 0 ? row.expense.toLocaleString('ko-KR') : '-'}
              </span>
              <span className={`text-sm font-semibold text-right ${
                isEmpty ? 'text-gray-400 dark:text-gray-500' : row.balance > 0 ? 'text-gray-900 dark:text-gray-50' : 'text-red-500 dark:text-red-400'
              }`}>
                {isEmpty ? '-' : row.balance.toLocaleString('ko-KR')}
              </span>
            </div>
          )
        })}

        <div className="grid grid-cols-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100">합계</span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100 text-right">{yearlyIncome.toLocaleString('ko-KR')}</span>
          <span className="text-sm font-bold text-gray-800 dark:text-gray-100 text-right">{yearlyExpense.toLocaleString('ko-KR')}</span>
          <span className={`text-sm font-bold text-right ${yearlyIncome - yearlyExpense >= 0 ? 'text-gray-900 dark:text-gray-50' : 'text-red-500 dark:text-red-400'}`}>
            {(yearlyIncome - yearlyExpense).toLocaleString('ko-KR')}
          </span>
        </div>
      </div>
    </div>
  )
}

function compactAmount(n: number) {
  if (n >= 100000000) {
    const eok = n / 100000000
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억`
  }
  if (n >= 10000) {
    const man = n / 10000
    return `${Number.isInteger(man) ? man : man.toFixed(1)}만`
  }
  return n.toLocaleString('ko-KR')
}

function DailyContent({
  year, month, dayStats, dayEntries, selectedDay, onSelectDay,
}: {
  year: number
  month: number
  dayStats: Record<string, DayStat>
  dayEntries: Record<string, DayEntry[]>
  selectedDay: string | null
  onSelectDay: (date: string) => void
}) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const todayStr = new Date().toISOString().split('T')[0]

  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const hasAnyData = Object.keys(dayStats).length > 0
  const selectedEntries = selectedDay ? (dayEntries[selectedDay] ?? []) : []
  const selectedStat = selectedDay ? dayStats[selectedDay] : undefined

  const formatDayLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
  }

  return (
    <div className="space-y-4">
      {/* 캘린더 */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
        <div className="grid grid-cols-7 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
            <div
              key={d}
              className={`text-center text-[11px] font-medium ${i === 0 ? 'text-red-400 dark:text-red-300' : i === 6 ? 'text-blue-400 dark:text-blue-300' : 'text-gray-400 dark:text-gray-500'}`}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={idx} />
            const dateStr = `${year}-${pad(month)}-${pad(day)}`
            const stat = dayStats[dateStr]
            const isToday = dateStr === todayStr
            const isSelected = selectedDay === dateStr
            const isFuture = dateStr > todayStr

            return (
              <button
                key={idx}
                onClick={() => onSelectDay(dateStr)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-px transition-colors ${
                  isSelected ? 'bg-blue-500' : isToday ? 'bg-blue-50 dark:bg-blue-500/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className={`text-[11px] font-medium ${
                  isSelected ? 'text-white' : isFuture ? 'text-gray-300 dark:text-gray-600' : 'text-gray-700 dark:text-gray-200'
                }`}>
                  {day}
                </span>
                {stat?.income ? (
                  <span className={`text-[8px] leading-none ${isSelected ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`}>
                    +{compactAmount(stat.income)}
                  </span>
                ) : null}
                {stat?.expense ? (
                  <span className={`text-[8px] leading-none ${isSelected ? 'text-white' : 'text-red-500 dark:text-red-400'}`}>
                    -{compactAmount(stat.expense)}
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {!hasAnyData && (
        <div className="text-center py-10 text-gray-400 dark:text-gray-500">
          <div className="text-4xl mb-2">📅</div>
          <p className="text-sm">이번 달 내역이 없어요</p>
        </div>
      )}

      {/* 선택한 날 상세 */}
      {selectedDay && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100">{formatDayLabel(selectedDay)}</h2>
            {selectedStat && (selectedStat.income > 0 || selectedStat.expense > 0) && (
              <div className="flex gap-2 text-xs">
                {selectedStat.income > 0 && (
                  <span className="text-blue-500 dark:text-blue-400 font-medium">+{selectedStat.income.toLocaleString('ko-KR')}원</span>
                )}
                {selectedStat.expense > 0 && (
                  <span className="text-red-500 dark:text-red-400 font-medium">-{selectedStat.expense.toLocaleString('ko-KR')}원</span>
                )}
              </div>
            )}
          </div>

          {selectedEntries.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">내역이 없어요</p>
          ) : (
            <div className="space-y-2">
              {selectedEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {entry.category ? (
                      <CategoryBadge category={entry.category} size="sm" />
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">기타</span>
                    )}
                    {entry.note && <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{entry.note}</span>}
                  </div>
                  <span className={`text-sm font-semibold flex-shrink-0 ${entry.type === 'income' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-50'}`}>
                    {entry.type === 'income' ? '+' : '-'}{entry.amount.toLocaleString('ko-KR')}원
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
