'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import CategoryBadge from '@/components/CategoryBadge'
import { Dialog, useConfirm } from '@/components/Dialog'
import type { Expense, Income, Profile } from '@/types'

type EntryType = 'expense' | 'income'
type TypeFilter = 'all' | 'expense' | 'income'
type Entry = (Expense & { _type: 'expense' }) | (Income & { _type: 'income' })

type Props = {
  currentUserId: string
  year: number
  month: number
  onDeleted?: () => void
}

export default function ExpenseList({ currentUserId, year, month, onDeleted }: Props) {
  const router = useRouter()
  const { confirm, alert, dialogProps } = useConfirm()
  const [entries, setEntries] = useState<Entry[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    const supabase = createClient()
    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const to = new Date(year, month, 0).toISOString().split('T')[0]

    const [{ data: expData }, { data: incData }, { data: profileData }] = await Promise.all([
      supabase.from('expenses').select('*, categories(*)').gte('date', from).lte('date', to).is('deleted_at', null),
      supabase.from('incomes').select('*, income_categories(*)').gte('date', from).lte('date', to).is('deleted_at', null),
      supabase.from('profiles').select('*'),
    ])

    if (profileData) setProfiles(profileData)

    const expenses: Entry[] = ((expData as Expense[]) ?? []).map((e) => ({ ...e, _type: 'expense' as const }))
    const incomes: Entry[] = ((incData as Income[]) ?? []).map((e) => ({ ...e, _type: 'income' as const }))

    const merged = [...expenses, ...incomes].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date)
      return b.created_at.localeCompare(a.created_at)
    })

    setEntries(merged)
    setLoading(false)
  }, [year, month])

  useEffect(() => {
    setLoading(true)
    // 월이 바뀌면 필터 초기화
    setTypeFilter('all')
    setCategoryFilter(null)
    fetchEntries()
  }, [fetchEntries])

  // Realtime 구독 (expenses + incomes)
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('ledger-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchEntries())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => fetchEntries())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchEntries])

  const handleDelete = async (id: string, type: EntryType) => {
    const label = type === 'expense' ? '지출' : '소득'
    const ok = await confirm(`이 ${label} 내역을 삭제할까요?`, { confirmLabel: '삭제', danger: true })
    if (!ok) return
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase
      .from(type === 'expense' ? 'expenses' : 'incomes')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      await alert('삭제에 실패했어요: ' + error.message)
    } else {
      onDeleted?.()
    }
    setDeletingId(null)
    fetchEntries()
  }

  // 타입 필터 적용 후 카테고리 칩 목록 도출 (현재 달에 실제 존재하는 카테고리만)
  const categoryChips = useMemo(() => {
    const filtered = typeFilter === 'all' ? entries : entries.filter((e) => e._type === typeFilter)
    const seen = new Map<string, { id: string; name: string; icon: string }>()
    for (const e of filtered) {
      if (e._type === 'expense') {
        const cat = (e as Expense).categories
        if (cat && !seen.has(cat.id)) seen.set(cat.id, { id: cat.id, name: cat.name, icon: cat.icon })
      } else {
        const cat = (e as Income).income_categories
        if (cat && !seen.has(cat.id)) seen.set(cat.id, { id: cat.id, name: cat.name, icon: cat.icon })
      }
    }
    return Array.from(seen.values())
  }, [entries, typeFilter])

  // 타입 필터 변경 시 카테고리 필터 초기화
  const handleTypeFilter = (type: TypeFilter) => {
    setTypeFilter(type)
    setCategoryFilter(null)
  }

  // 최종 필터링된 항목
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== 'all' && e._type !== typeFilter) return false
      if (categoryFilter) {
        const catId = e._type === 'expense'
          ? (e as Expense).categories?.id
          : (e as Income).income_categories?.id
        if (catId !== categoryFilter) return false
      }
      return true
    })
  }, [entries, typeFilter, categoryFilter])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
      </div>
    )
  }

  // 날짜별 그룹핑
  const grouped = filteredEntries.reduce<Record<string, Entry[]>>((acc, entry) => {
    if (!acc[entry.date]) acc[entry.date] = []
    acc[entry.date].push(entry)
    return acc
  }, {})

  return (
    <div className="space-y-3">
      <Dialog {...dialogProps} />
      {/* 타입 필터 탭 */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {(['all', 'expense', 'income'] as TypeFilter[]).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeFilter(type)}
            className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              typeFilter === type ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {type === 'all' ? '전체' : type === 'expense' ? '💳 지출' : '💰 소득'}
          </button>
        ))}
      </div>

      {/* 카테고리 필터 칩 */}
      {categoryChips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              categoryFilter === null
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-500'
            }`}
          >
            전체
          </button>
          {categoryChips.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
              className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-gray-900 text-white'
                  : 'bg-white border border-gray-200 text-gray-600'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* 리스트 */}
      {Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-2">🧾</div>
          <p className="text-sm">해당하는 내역이 없어요</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, items]) => {
          const dayExpense = items.filter((e) => e._type === 'expense').reduce((s, e) => s + e.amount, 0)
          const dayIncome = items.filter((e) => e._type === 'income').reduce((s, e) => s + e.amount, 0)
          const d = new Date(date + 'T00:00:00')
          const dayLabel = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

          return (
            <div key={date}>
              <div className="flex justify-between items-center mb-1 px-1">
                <span className="text-xs font-medium text-gray-500">{dayLabel}</span>
                <div className="flex gap-2 text-xs">
                  {dayIncome > 0 && <span className="text-green-600">+{dayIncome.toLocaleString('ko-KR')}</span>}
                  {dayExpense > 0 && <span className="text-gray-400">-{dayExpense.toLocaleString('ko-KR')}</span>}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {items.map((entry, idx) => {
                  const isIncome = entry._type === 'income'
                  const personId = isIncome
                    ? (entry as Income).received_by
                    : (entry as Expense).paid_by
                  const isMine = personId === currentUserId
                  const personName = profiles.find((p) => p.id === personId)?.display_name ?? (isMine ? '나' : '파트너')

                  const categoryName = isIncome
                    ? (entry as Income).income_categories?.name ?? '기타'
                    : (entry as Expense).categories?.name ?? '기타'

                  const categoryIcon = isIncome
                    ? (entry as Income).income_categories?.icon ?? '📦'
                    : null

                  const expenseCategory = !isIncome ? (entry as Expense).categories : null

                  const handleRowClick = () => {
                    router.push(`/expenses/add?id=${entry.id}&type=${entry._type}`)
                  }

                  return (
                    <div
                      key={entry.id}
                      onClick={handleRowClick}
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer active:bg-gray-50 ${idx !== items.length - 1 ? 'border-b border-gray-50' : ''} ${deletingId === entry.id ? 'opacity-50' : ''}`}
                    >
                      {expenseCategory ? (
                        <CategoryBadge category={expenseCategory} size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 text-base">
                          {categoryIcon}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-800 truncate">{categoryName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${isMine ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-500'}`}>
                            {personName}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${isIncome ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                            {isIncome ? '소득' : '지출'}
                          </span>
                        </div>
                        {entry.note && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{entry.note}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${isIncome ? 'text-green-600' : 'text-gray-900'}`}>
                          {isIncome ? '+' : '-'}{entry.amount.toLocaleString('ko-KR')}원
                        </span>
                        {isMine && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id, entry._type) }}
                            className="text-gray-300 hover:text-red-400 transition-colors text-xs p-1"
                            aria-label="삭제"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
