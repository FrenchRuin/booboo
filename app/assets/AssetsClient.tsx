'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import PersonAvatar from '@/components/PersonAvatar'
import CategoryBadge from '@/components/CategoryBadge'
import { Dialog, useConfirm } from '@/components/Dialog'
import { CardListSkeleton, Spinner } from '@/components/Skeleton'
import { formatAmount, formatKoreanAmount } from '@/lib/format'
import { Landmark, Pencil, Trash2 } from 'lucide-react'
import type { Asset, AssetCategory, Profile } from '@/types'

type Props = {
  currentUserId: string
}

type FormState = {
  name: string
  categoryId: string
  amount: string
  ownerId: string
  memo: string
}

export default function AssetsClient({ currentUserId }: Props) {
  const { confirm, dialogProps } = useConfirm()

  const [assets, setAssets] = useState<Asset[]>([])
  const [categories, setCategories] = useState<AssetCategory[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', categoryId: '', amount: '', ownerId: currentUserId, memo: '' })
  const [saving, setSaving] = useState(false)

  const [personFilter, setPersonFilter] = useState<'all' | string>('all')
  const [categoryFilterId, setCategoryFilterId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: assetData }, { data: profileData }, { data: categoryData }] = await Promise.all([
      supabase.from('assets').select('*').order('created_at'),
      supabase.from('profiles').select('*'),
      supabase.from('asset_categories').select('*').order('sort_order'),
    ])
    setAssets((assetData as Asset[]) ?? [])
    if (profileData) setProfiles(profileData)
    if (categoryData) setCategories(categoryData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const me = profiles.find((p) => p.id === currentUserId)
  const partner = profiles.find((p) => p.id !== currentUserId)
  const ownerOf = (asset: Asset) => profiles.find((p) => p.id === asset.owner_id)
  const categoryOf = (categoryId: string) => categories.find((c) => c.id === categoryId)

  const total = assets.reduce((sum, a) => sum + a.amount, 0)
  const subtotal = (categoryId: string) => assets.filter((a) => a.category_id === categoryId).reduce((sum, a) => sum + a.amount, 0)
  const totalOf = (ownerId: string) => assets.filter((a) => a.owner_id === ownerId).reduce((sum, a) => sum + a.amount, 0)

  const orderedAssets = [...assets].sort((a, b) => {
    const sa = categoryOf(a.category_id)?.sort_order ?? 0
    const sb = categoryOf(b.category_id)?.sort_order ?? 0
    if (sa !== sb) return sa - sb
    return a.created_at.localeCompare(b.created_at)
  })

  const personTabs = [
    { id: 'all' as const, label: '전체' },
    { id: currentUserId, label: me?.display_name ?? '나' },
    ...(partner ? [{ id: partner.id, label: partner.display_name }] : []),
  ]

  const handlePersonFilter = (id: string) => {
    setPersonFilter(id)
    setCategoryFilterId(null)
  }

  // 사람 필터가 적용된 자산에 실제 등장하는 유형만 칩으로 노출
  const categoryChips = categories.filter((c) =>
    assets.some((a) => a.category_id === c.id && (personFilter === 'all' || a.owner_id === personFilter))
  )

  const filteredAssets = orderedAssets.filter((a) => {
    if (personFilter !== 'all' && a.owner_id !== personFilter) return false
    if (categoryFilterId && a.category_id !== categoryFilterId) return false
    return true
  })

  const resetForm = () => {
    setShowAddForm(false)
    setEditingId(null)
    setForm({ name: '', categoryId: categories.find((c) => c.is_active)?.id ?? '', amount: '', ownerId: currentUserId, memo: '' })
    setError(null)
  }

  const startAdd = () => {
    if (showAddForm) { resetForm(); return }
    resetForm()
    setShowAddForm(true)
  }

  const startEdit = (asset: Asset) => {
    setShowAddForm(false)
    setEditingId(asset.id)
    setForm({
      name: asset.name,
      categoryId: asset.category_id,
      amount: asset.amount.toLocaleString('ko-KR'),
      ownerId: asset.owner_id,
      memo: asset.memo ?? '',
    })
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return }
    if (!form.categoryId) { setError('유형을 선택해주세요.'); return }
    const parsedAmount = parseInt(form.amount.replace(/,/g, ''), 10)
    if (isNaN(parsedAmount) || parsedAmount < 0) { setError('올바른 금액을 입력해주세요.'); return }

    setSaving(true)
    setError(null)
    const supabase = createClient()
    const payload = {
      name: form.name.trim(),
      category_id: form.categoryId,
      amount: parsedAmount,
      owner_id: form.ownerId,
      memo: form.memo.trim() || null,
    }

    const { error: err } = editingId
      ? await supabase.from('assets').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId)
      : await supabase.from('assets').insert(payload)

    if (err) {
      setError('저장 실패: ' + err.message)
      setSaving(false)
      return
    }

    resetForm()
    fetchData()
    setSaving(false)
  }

  const handleDelete = async (asset: Asset) => {
    const ok = await confirm(`'${asset.name}'을(를) 삭제할까요?`, { confirmLabel: '삭제', danger: true })
    if (!ok) return
    const supabase = createClient()
    await supabase.from('assets').delete().eq('id', asset.id)
    fetchData()
  }

  const selectableCategories = categories.filter((c) => c.is_active || c.id === form.categoryId)

  const renderForm = (submitLabel: string) => (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-4">
      {/* 이름 */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">이름</label>
        <input
          type="text"
          autoFocus
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="예: 신한 통장"
          maxLength={30}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-900"
        />
      </div>

      {/* 유형 */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">유형</label>
        <div className="flex flex-wrap gap-2">
          {selectableCategories.map((c) => {
            const selected = form.categoryId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setForm((f) => ({ ...f, categoryId: c.id }))}
                style={{
                  backgroundColor: c.color + (selected ? '33' : '18'),
                  color: c.color,
                  borderColor: selected ? c.color : 'transparent',
                }}
                className="px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors"
              >
                {c.name}
              </button>
            )
          })}
          <Link
            href="/settings/categories?type=asset"
            className="px-3 py-1.5 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            + 유형 추가
          </Link>
        </div>
      </div>

      {/* 소유자 */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">소유자</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, ownerId: currentUserId }))}
            className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
              form.ownerId === currentUserId ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900'
            }`}
          >
            {me?.display_name ?? '나'}
          </button>
          {partner && (
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, ownerId: partner.id }))}
              className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
                form.ownerId === partner.id ? 'border-gray-900 dark:border-gray-100 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-900'
              }`}
            >
              {partner.display_name}
            </button>
          )}
        </div>
      </div>

      {/* 금액 */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">금액</label>
        <div className="relative">
          <input
            type="text"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: formatAmount(e.target.value) }))}
            placeholder="0"
            className="w-full px-4 py-2.5 pr-8 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-900"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 dark:text-gray-500">원</span>
        </div>
        {form.amount && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 px-1">
            {formatKoreanAmount(parseInt(form.amount.replace(/,/g, ''), 10) || 0)}
          </p>
        )}
      </div>

      {/* 메모 */}
      <div>
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">메모 (선택)</label>
        <input
          type="text"
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          placeholder="예: 10주, 만기 2027-03"
          maxLength={50}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-900 placeholder-gray-400 dark:placeholder-gray-500"
        />
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

  const categoriesWithAssets = categories.filter((c) => subtotal(c.id) > 0)

  return (
    <div className="flex flex-col h-full">
      <Dialog {...dialogProps} />
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-4 shadow-[0_1px_0_0_#F0F0F0]">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">자산관리</h1>
              <button
                onClick={startAdd}
                className="text-sm text-blue-500 dark:text-blue-400 font-medium px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
              >
                {showAddForm ? '취소' : '+ 추가'}
              </button>
            </div>

            {!loading && assets.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">총자산</p>
                <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
                  {total.toLocaleString('ko-KR')}<span className="text-lg font-semibold ml-1">원</span>
                </p>
                {total > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatKoreanAmount(total)}</p>
                )}
              </div>
            )}
          </div>
        </header>

        <div className="px-4 pt-5 pb-[calc(8rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full space-y-4">
          {/* 유형별 / 인물별 요약 */}
          {!loading && assets.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              {categoriesWithAssets.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {categoriesWithAssets.map((c) => (
                    <div key={c.id} className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{c.name}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                        {subtotal(c.id).toLocaleString('ko-KR')}원
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className={`grid ${partner ? 'grid-cols-2' : 'grid-cols-1'} gap-2 ${categoriesWithAssets.length > 0 ? 'pt-3 border-t border-gray-100 dark:border-gray-800' : ''}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PersonAvatar profile={me} size={16} />
                    <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{me?.display_name ?? '나'}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                    {totalOf(currentUserId).toLocaleString('ko-KR')}원
                  </p>
                </div>
                {partner && (
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <PersonAvatar profile={partner} size={16} />
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{partner.display_name}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">
                      {totalOf(partner.id).toLocaleString('ko-KR')}원
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 추가 폼 */}
          {showAddForm && renderForm('추가하기')}

          {/* 필터 */}
          {!loading && assets.length > 0 && (
            <div className="space-y-2">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                {personTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handlePersonFilter(t.id)}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      personFilter === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-50 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {categoryChips.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  <button
                    onClick={() => setCategoryFilterId(null)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      categoryFilterId === null
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    전체
                  </button>
                  {categoryChips.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategoryFilterId(categoryFilterId === c.id ? null : c.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        categoryFilterId === c.id
                          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                          : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 목록 */}
          {loading ? (
            <CardListSkeleton />
          ) : assets.length === 0 && !showAddForm ? (
            <div className="text-center py-20">
              <Landmark className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">등록된 자산이 없어요</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-5 py-2.5 bg-blue-500 text-white text-sm rounded-xl font-medium"
              >
                첫 자산 추가하기
              </button>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-16 text-gray-400 dark:text-gray-500">
              <Landmark className="w-10 h-10 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm">해당하는 자산이 없어요</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              {filteredAssets.map((asset, idx) => {
                const isLast = idx === filteredAssets.length - 1
                const category = categoryOf(asset.category_id)
                const owner = ownerOf(asset)
                const isMine = asset.owner_id === currentUserId
                const ownerName = owner?.display_name ?? (isMine ? '나' : '파트너')

                if (editingId === asset.id) {
                  return (
                    <div key={asset.id} className={`p-3.5 ${!isLast ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                      {renderForm('수정 완료')}
                    </div>
                  )
                }

                return (
                  <div key={asset.id} className={`flex items-center gap-3 px-4 py-3 ${!isLast ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <CategoryBadge category={{ name: category?.name ?? '기타', color: category?.color ?? '#B0B0B0' }} size="sm" />
                        <span className={`flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-full flex-shrink-0 ${isMine ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400'}`}>
                          <PersonAvatar profile={owner} size={14} />
                          <span className="text-xs">{ownerName}</span>
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate mt-1">{asset.name}</p>
                      {asset.memo && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{asset.memo}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                        {asset.amount.toLocaleString('ko-KR')}원
                      </span>
                      <button
                        onClick={() => startEdit(asset)}
                        aria-label="수정"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                      <button
                        onClick={() => handleDelete(asset)}
                        aria-label="삭제"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
