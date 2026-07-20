'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Dialog, useConfirm } from '@/components/Dialog'
import CategoryBadge from '@/components/CategoryBadge'
import ChevronIcon from '@/components/ChevronIcon'
import { CardListSkeleton, Spinner } from '@/components/Skeleton'
import type { Category, IncomeCategory } from '@/types'

type CategoryType = 'expense' | 'income'
type AnyCategory = Category | IncomeCategory

const DEFAULT_COLOR = '#4ECDC4'
const PRESET_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFC542', '#4ECDC4', '#45B7D1',
  '#5B7FFF', '#9B7EDE', '#96CEB4', '#4CAF50', '#E91E63', '#B0B0B0',
]

type FormState = { name: string; color: string }

export default function CategoriesClient() {
  const router = useRouter()
  const { confirm, dialogProps } = useConfirm()

  const [type, setType] = useState<CategoryType>('expense')
  const [categories, setCategories] = useState<Category[]>([])
  const [incomeCategories, setIncomeCategories] = useState<IncomeCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', color: DEFAULT_COLOR })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: catData }, { data: incCatData }] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('income_categories').select('*').order('sort_order'),
    ])
    if (catData) setCategories(catData)
    if (incCatData) setIncomeCategories(incCatData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const table = type === 'expense' ? 'categories' : 'income_categories'
  const list = type === 'expense' ? categories : incomeCategories

  const resetForm = () => {
    setShowAddForm(false)
    setEditingId(null)
    setForm({ name: '', color: DEFAULT_COLOR })
    setError(null)
  }

  const startAdd = () => {
    if (showAddForm) { resetForm(); return }
    resetForm()
    setShowAddForm(true)
  }

  const startEdit = (item: AnyCategory) => {
    setShowAddForm(false)
    setEditingId(item.id)
    setForm({ name: item.name, color: item.color })
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    if (editingId) {
      const { error: err } = await supabase
        .from(table)
        .update({ name: form.name.trim(), color: form.color })
        .eq('id', editingId)
      if (err) { setError('저장 실패: ' + err.message); setSaving(false); return }
    } else {
      const maxSortOrder = list.reduce((max, c) => Math.max(max, c.sort_order), 0)
      const { error: err } = await supabase
        .from(table)
        .insert({ name: form.name.trim(), color: form.color, sort_order: maxSortOrder + 1 })
      if (err) { setError('저장 실패: ' + err.message); setSaving(false); return }
    }

    resetForm()
    fetchData()
    setSaving(false)
  }

  const handleToggleActive = async (item: AnyCategory) => {
    if (item.is_active) {
      const ok = await confirm(
        `'${item.name}' 유형을 비활성화할까요?\n등록된 내역은 그대로 남고, 새 등록 시 목록에서만 안 보여요.`,
        { confirmLabel: '비활성화', danger: true }
      )
      if (!ok) return
    }
    const supabase = createClient()
    await supabase.from(table).update({ is_active: !item.is_active }).eq('id', item.id)
    fetchData()
  }

  const activeList = list.filter((c) => c.is_active)
  const inactiveList = list.filter((c) => !c.is_active)

  const renderForm = (submitLabel: string) => (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">이름</label>
        <input
          type="text"
          autoFocus
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="예: 반려동물"
          maxLength={20}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-900"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">색상</label>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: c }))}
              style={{ backgroundColor: c }}
              className={`w-7 h-7 rounded-full flex-shrink-0 transition-transform ${
                form.color.toLowerCase() === c.toLowerCase() ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-gray-400 scale-105' : ''
              }`}
              aria-label={c}
            />
          ))}
          <label className="w-7 h-7 rounded-full flex-shrink-0 border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 cursor-pointer relative overflow-hidden text-xs">
            🎨
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
          </label>
        </div>
        {form.name.trim() && (
          <CategoryBadge category={{ name: form.name.trim(), color: form.color }} />
        )}
      </div>

      {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={resetForm}
          className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-[2] py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving && <Spinner />}
          {saving ? '저장 중...' : submitLabel}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <Dialog {...dialogProps} />

      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-4 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
          >
            <ChevronIcon direction="left" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">카테고리 관리</h1>
        </div>
      </header>

      <div className="px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full space-y-4">
        {/* 지출 / 소득 탭 */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); resetForm() }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {t === 'expense' ? '💳 지출 유형' : '💰 소득 유형'}
            </button>
          ))}
        </div>

        {/* 추가 버튼 */}
        <button
          onClick={startAdd}
          className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {showAddForm ? '취소' : '+ 새 유형 추가'}
        </button>

        {/* 추가 폼 (새 항목) */}
        {showAddForm && renderForm('추가하기')}

        {/* 목록 */}
        {loading ? (
          <CardListSkeleton />
        ) : (
          <div className="space-y-2">
            {activeList.map((cat) =>
              editingId === cat.id ? (
                <div key={cat.id}>{renderForm('수정 완료')}</div>
              ) : (
                <div key={cat.id} className="flex items-center gap-3 p-3.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex-1 min-w-0">
                    <CategoryBadge category={cat} />
                  </div>
                  <button
                    onClick={() => startEdit(cat)}
                    className="text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleToggleActive(cat)}
                    className="text-xs font-medium text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                  >
                    비활성화
                  </button>
                </div>
              )
            )}

            {inactiveList.length > 0 && (
              <>
                <div className="flex items-center gap-2 pt-4 pb-1.5 px-1">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">사용 안 함</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{inactiveList.length}개</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>
                {inactiveList.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex-1 min-w-0 grayscale opacity-70">
                      <CategoryBadge category={cat} />
                    </div>
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                    >
                      다시 사용
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      </main>
    </div>
  )
}
