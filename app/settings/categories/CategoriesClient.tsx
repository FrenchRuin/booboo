'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Dialog, useConfirm } from '@/components/Dialog'
import CategoryBadge from '@/components/CategoryBadge'
import { CardListSkeleton, Spinner } from '@/components/Skeleton'
import type { Category, IncomeCategory } from '@/types'

type CategoryType = 'expense' | 'income'
type AnyCategory = Category | IncomeCategory

const DEFAULT_COLOR = '#4ECDC4'

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
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState(DEFAULT_COLOR)
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
    setFormName('')
    setFormColor(DEFAULT_COLOR)
    setError(null)
  }

  const startEdit = (item: AnyCategory) => {
    setEditingId(item.id)
    setShowAddForm(false)
    setFormName(item.name)
    setFormColor(item.color)
    setError(null)
  }

  const handleSave = async () => {
    if (!formName.trim()) { setError('이름을 입력해주세요.'); return }

    setSaving(true)
    setError(null)
    const supabase = createClient()

    if (editingId) {
      const { error: err } = await supabase
        .from(table)
        .update({ name: formName.trim(), color: formColor })
        .eq('id', editingId)
      if (err) { setError('저장 실패: ' + err.message); setSaving(false); return }
    } else {
      const maxSortOrder = list.reduce((max, c) => Math.max(max, c.sort_order), 0)
      const { error: err } = await supabase
        .from(table)
        .insert({ name: formName.trim(), color: formColor, sort_order: maxSortOrder + 1 })
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

  return (
    <div className="flex flex-col h-full">
      <Dialog {...dialogProps} />

      <header className="bg-white px-5 pt-12 pb-4 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 text-xl"
          >
            ‹
          </button>
          <h1 className="text-lg font-bold text-gray-900">카테고리 관리</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-5 max-w-lg mx-auto w-full space-y-4">
        {/* 지출 / 소득 탭 */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setType(t); resetForm() }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {t === 'expense' ? '💳 지출 유형' : '💰 소득 유형'}
            </button>
          ))}
        </div>

        {/* 추가 버튼 */}
        <button
          onClick={() => {
            if (showAddForm) { resetForm() } else { resetForm(); setShowAddForm(true) }
          }}
          className="w-full py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {showAddForm ? '취소' : '+ 새 유형 추가'}
        </button>

        {/* 추가/수정 폼 */}
        {(showAddForm || editingId) && (
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">이름</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 반려동물"
                maxLength={20}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">색상</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formColor}
                  onChange={(e) => setFormColor(e.target.value)}
                  className="w-12 h-[42px] rounded-xl border border-gray-200 bg-white cursor-pointer"
                />
                {formName.trim() && (
                  <CategoryBadge category={{ name: formName.trim(), color: formColor }} />
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Spinner />}
              {saving ? '저장 중...' : editingId ? '수정 완료' : '추가하기'}
            </button>
          </div>
        )}

        {/* 목록 */}
        {loading ? (
          <CardListSkeleton />
        ) : (
          <div className="space-y-2">
            {activeList.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-gray-100">
                <div className="flex-1 min-w-0">
                  <CategoryBadge category={cat} />
                </div>
                <button
                  onClick={() => startEdit(cat)}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                >
                  수정
                </button>
                <button
                  onClick={() => handleToggleActive(cat)}
                  className="text-xs text-red-400 hover:text-red-500 px-2 py-1"
                >
                  비활성화
                </button>
              </div>
            ))}

            {inactiveList.length > 0 && (
              <>
                <p className="text-xs text-gray-400 pt-3 pb-1 px-1">사용 안 함</p>
                {inactiveList.map((cat) => (
                  <div key={cat.id} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl opacity-60">
                    <div className="flex-1 min-w-0">
                      <CategoryBadge category={cat} />
                    </div>
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className="text-xs text-blue-500 hover:text-blue-600 px-2 py-1"
                    >
                      다시 사용
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
