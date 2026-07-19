'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import type { Category, IncomeCategory, Profile, RecurringExpense } from '@/types'

type Props = {
  currentUserId: string
}

export default function RecurringClient({ currentUserId }: Props) {
  const [items, setItems] = useState<RecurringExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formType, setFormType] = useState<'expense' | 'income'>('expense')
  const [formCategoryId, setFormCategoryId] = useState<string | null>(null)
  const [formPeriod, setFormPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [formApplyMonth, setFormApplyMonth] = useState('1')
  const [formDay, setFormDay] = useState('1')
  const [formPaidBy, setFormPaidBy] = useState(currentUserId)
  const [formSaving, setFormSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: recurringData }, { data: catData }, { data: incCatData }, { data: profileData }] =
      await Promise.all([
        supabase.from('recurring_expenses').select('*').eq('is_active', true).order('created_at'),
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('income_categories').select('*').order('sort_order'),
        supabase.from('profiles').select('*'),
      ])
    setItems((recurringData as RecurringExpense[]) ?? [])
    if (catData) setCategories(catData)
    if (incCatData) setIncomeCategories(incCatData)
    if (profileData) setProfiles(profileData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const formatAmount = (val: string) => {
    const num = val.replace(/[^0-9]/g, '')
    return num ? parseInt(num, 10).toLocaleString('ko-KR') : ''
  }

  const getCategoryInfo = (item: RecurringExpense) =>
    item.type === 'expense'
      ? categories.find((c) => c.id === item.category_id)
      : incomeCategories.find((c) => c.id === item.category_id)

  const handleDelete = async (id: string) => {
    if (!confirm('이 고정비 항목을 삭제할까요?')) return
    const supabase = createClient()
    await supabase.from('recurring_expenses').delete().eq('id', id)
    fetchData()
  }

  const handleAddSave = async () => {
    if (!formTitle.trim()) { setError('항목명을 입력해주세요.'); return }
    const amount = parseInt(formAmount.replace(/,/g, ''), 10)
    if (!amount || amount <= 0) { setError('금액을 입력해주세요.'); return }
    if (!formCategoryId) { setError('카테고리를 선택해주세요.'); return }

    setFormSaving(true)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase.from('recurring_expenses').insert({
      title: formTitle.trim(),
      amount,
      category_id: formCategoryId,
      type: formType,
      period: formPeriod,
      apply_month: formPeriod === 'yearly' ? parseInt(formApplyMonth) : null,
      day_of_month: Math.min(Math.max(parseInt(formDay) || 1, 1), 31),
      paid_by: formPaidBy,
    })

    if (error) {
      setError('저장 실패: ' + error.message)
    } else {
      setFormTitle(''); setFormAmount(''); setFormType('expense')
      setFormCategoryId(null); setFormPeriod('monthly')
      setFormApplyMonth('1'); setFormDay('1')
      setFormPaidBy(currentUserId); setShowAddForm(false)
      fetchData()
    }
    setFormSaving(false)
  }

  const resetForm = () => {
    setShowAddForm(false); setFormTitle(''); setFormAmount('')
    setFormType('expense'); setFormCategoryId(null)
    setFormPeriod('monthly'); setFormApplyMonth('1')
    setFormDay('1'); setFormPaidBy(currentUserId); setError(null)
  }

  const me = profiles.find((p) => p.id === currentUserId)
  const partner = profiles.find((p) => p.id !== currentUserId)
  const formCategories = formType === 'expense' ? categories : incomeCategories

  return (
    <div className="flex flex-col h-full">
      <header className="bg-white px-5 pt-12 pb-5 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">고정비 관리</h1>
          <button
            onClick={() => showAddForm ? resetForm() : setShowAddForm(true)}
            className="text-sm text-blue-500 font-medium px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            {showAddForm ? '취소' : '+ 추가'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4 max-w-lg mx-auto w-full">

        {/* 추가 폼 */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 space-y-4">
            {/* 항목명 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">항목명</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="월세, 넷플릭스, 자동차보험..."
                maxLength={30}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>

            {/* 지출 / 소득 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">구분</label>
              <div className="flex bg-gray-100 rounded-xl p-0.5">
                {(['expense', 'income'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setFormType(t); setFormCategoryId(null) }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formType === t
                        ? t === 'expense' ? 'bg-gray-900 text-white' : 'bg-green-600 text-white'
                        : 'text-gray-500'
                    }`}
                  >
                    {t === 'expense' ? '💳 지출' : '💰 소득'}
                  </button>
                ))}
              </div>
            </div>

            {/* 카테고리 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">카테고리</label>
              <div className="grid grid-cols-4 gap-1.5">
                {formCategories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormCategoryId(cat.id)}
                    className={`flex flex-col items-center py-2 px-1 rounded-xl border transition-colors ${
                      formCategoryId === cat.id ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="text-xs text-gray-600 mt-0.5 leading-tight text-center">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 금액 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">기본 금액 (적용 시 수정 가능)</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={formAmount}
                  onChange={(e) => setFormAmount(formatAmount(e.target.value))}
                  placeholder="0"
                  className="w-full px-4 py-2.5 pr-8 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">원</span>
              </div>
            </div>

            {/* 주기 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">주기</label>
              <div className="flex gap-2">
                {(['monthly', 'yearly'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setFormPeriod(p)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      formPeriod === p ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 bg-white'
                    }`}
                  >
                    {p === 'monthly' ? '매월' : '매년'}
                  </button>
                ))}
              </div>
            </div>

            {/* 적용 월 (연간일 때) */}
            {formPeriod === 'yearly' && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">적용 월</label>
                <div className="grid grid-cols-6 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFormApplyMonth(String(m))}
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        String(m) === formApplyMonth ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 bg-white'
                      }`}
                    >
                      {m}월
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 며칠 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                {formPeriod === 'monthly' ? '매월 며칠' : '해당 월 며칠'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1} max={31}
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value)}
                  className="w-20 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-center"
                />
                <span className="text-sm text-gray-500">일</span>
              </div>
            </div>

            {/* 결제자 */}
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">
                {formType === 'expense' ? '결제자' : '수취인'}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormPaidBy(currentUserId)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                    formPaidBy === currentUserId ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 bg-white'
                  }`}
                >
                  {me?.display_name ?? '나'}
                </button>
                {partner && (
                  <button
                    type="button"
                    onClick={() => setFormPaidBy(partner.id)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                      formPaidBy === partner.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 bg-white'
                    }`}
                  >
                    {partner.display_name}
                  </button>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={handleAddSave}
              disabled={formSaving}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {formSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        )}

        {/* 목록 */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 && !showAddForm ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm text-gray-400 mb-4">등록된 고정비가 없어요</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-5 py-2.5 bg-blue-500 text-white text-sm rounded-xl font-medium"
            >
              첫 항목 추가하기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const cat = getCategoryInfo(item)
              const payer = profiles.find((p) => p.id === item.paid_by)
              const periodLabel = item.period === 'monthly'
                ? `매월 ${item.day_of_month}일`
                : `매년 ${item.apply_month}월 ${item.day_of_month}일`

              return (
                <div key={item.id} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl shadow-sm border border-gray-100">
                  <span className="text-xl flex-shrink-0">{cat?.icon ?? '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {periodLabel} · {item.amount.toLocaleString('ko-KR')}원 · {payer?.display_name ?? '나'}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    item.type === 'expense' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'
                  }`}>
                    {item.type === 'expense' ? '지출' : '소득'}
                  </span>
                  {item.paid_by === currentUserId && (
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
