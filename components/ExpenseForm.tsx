'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import type { Category, IncomeCategory, Profile } from '@/types'

type EntryType = 'expense' | 'income'

export type EditTarget = {
  id: string
  type: EntryType
  amount: number
  categoryId: string | null
  note: string | null
  personId: string
  date: string
}

type Props = {
  currentUserId: string
  initialData?: EditTarget
  onClose: () => void
  onSaved: () => void
}

export default function ExpenseForm({ currentUserId, initialData, onClose, onSaved }: Props) {
  const isEdit = !!initialData

  const [entryType, setEntryType] = useState<EntryType>(initialData?.type ?? 'expense')
  const [amount, setAmount] = useState(initialData ? initialData.amount.toLocaleString('ko-KR') : '')
  const [categoryId, setCategoryId] = useState<string | null>(initialData?.categoryId ?? null)
  const [note, setNote] = useState(initialData?.note ?? '')
  const [date, setDate] = useState(initialData?.date ?? new Date().toISOString().split('T')[0])
  const [personId, setPersonId] = useState(initialData?.personId ?? currentUserId)
  const [categories, setCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const handleTypeChange = (type: EntryType) => {
    if (isEdit) return // 수정 모드에서는 타입 변경 불가
    setEntryType(type)
    setCategoryId(null)
    setPersonId(currentUserId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryId) { setError('카테고리를 선택해주세요.'); return }
    const parsedAmount = parseInt(amount.replace(/,/g, ''), 10)
    if (!parsedAmount || parsedAmount <= 0) { setError('올바른 금액을 입력해주세요.'); return }

    setLoading(true)
    setError(null)
    const supabase = createClient()

    const base = { amount: parsedAmount, category_id: categoryId, note: note.trim() || null, date }

    let error
    if (entryType === 'expense') {
      const payload = { ...base, paid_by: personId }
      ;({ error } = isEdit
        ? await supabase.from('expenses').update(payload).eq('id', initialData!.id)
        : await supabase.from('expenses').insert(payload))
    } else {
      const payload = { ...base, received_by: personId }
      ;({ error } = isEdit
        ? await supabase.from('incomes').update(payload).eq('id', initialData!.id)
        : await supabase.from('incomes').insert(payload))
    }

    if (error) {
      setError('저장에 실패했어요. 다시 시도해주세요.')
    } else {
      onSaved()
      onClose()
    }
    setLoading(false)
  }

  const formatAmount = (val: string) => {
    const num = val.replace(/[^0-9]/g, '')
    return num ? parseInt(num, 10).toLocaleString('ko-KR') : ''
  }

  const me = profiles.find((p) => p.id === currentUserId)
  const partner = profiles.find((p) => p.id !== currentUserId)
  const currentCategories = entryType === 'expense' ? categories : incomeCategories
  const personLabel = entryType === 'expense' ? '결제자' : '수취인'

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-5 pb-8 pt-3">
          {/* 지출 / 소득 탭 */}
          <div className={`flex bg-gray-100 rounded-xl p-1 mb-5 ${isEdit ? 'opacity-60 pointer-events-none' : ''}`}>
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${entryType === 'expense' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              💳 지출
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${entryType === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              💰 소득
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 금액 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">금액</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(formatAmount(e.target.value))}
                  placeholder="0"
                  className="w-full text-2xl font-bold px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">원</span>
              </div>
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
              <div className="grid grid-cols-4 gap-2">
                {currentCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-colors ${categoryId === cat.id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white'}`}
                  >
                    <span className="text-xl">{cat.icon}</span>
                    <span className="text-xs text-gray-600 mt-0.5 text-center leading-tight">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 결제자 / 수취인 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{personLabel}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPersonId(currentUserId)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${personId === currentUserId ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600'}`}
                >
                  {me?.display_name ?? '나'}
                </button>
                {partner && (
                  <button
                    type="button"
                    onClick={() => setPersonId(partner.id)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${personId === partner.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600'}`}
                  >
                    {partner.display_name}
                  </button>
                )}
              </div>
            </div>

            {/* 날짜 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900"
              />
            </div>

            {/* 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메모 (선택)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={entryType === 'expense' ? '어디서 뭘 샀는지...' : '어디서 받은 소득인지...'}
                maxLength={100}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-900 text-gray-900 placeholder-gray-400"
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-medium text-base transition-colors disabled:opacity-50 text-white ${entryType === 'expense' ? 'bg-gray-900 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {loading ? '저장 중...' : isEdit ? '수정 완료' : entryType === 'expense' ? '지출 저장' : '소득 저장'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
