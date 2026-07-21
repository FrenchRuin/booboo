'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import PersonAvatar from '@/components/PersonAvatar'
import CategoryBadge from '@/components/CategoryBadge'
import { Dialog, useConfirm } from '@/components/Dialog'
import { CardListSkeleton, Spinner } from '@/components/Skeleton'
import { formatAmount, formatKoreanAmount } from '@/lib/format'
import { Landmark, PiggyBank, TrendingUp, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import type { Asset, AssetType, Profile } from '@/types'

type Props = {
  currentUserId: string
}

type FormState = {
  name: string
  type: AssetType
  amount: string
  ownerId: string
  memo: string
}

const ASSET_TYPES: { value: AssetType; label: string; icon: LucideIcon; color: string }[] = [
  { value: 'bank', label: '통장', icon: Landmark, color: '#5B9BFF' },
  { value: 'savings', label: '적금', icon: PiggyBank, color: '#34D399' },
  { value: 'stock', label: '주식', icon: TrendingUp, color: '#C084FC' },
]

export default function AssetsClient({ currentUserId }: Props) {
  const { confirm, dialogProps } = useConfirm()

  const [assets, setAssets] = useState<Asset[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({ name: '', type: 'bank', amount: '', ownerId: currentUserId, memo: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const [{ data: assetData }, { data: profileData }] = await Promise.all([
      supabase.from('assets').select('*').order('created_at'),
      supabase.from('profiles').select('*'),
    ])
    setAssets((assetData as Asset[]) ?? [])
    if (profileData) setProfiles(profileData)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const me = profiles.find((p) => p.id === currentUserId)
  const partner = profiles.find((p) => p.id !== currentUserId)
  const ownerOf = (asset: Asset) => profiles.find((p) => p.id === asset.owner_id)
  const typeInfoOf = (type: AssetType) => ASSET_TYPES.find((t) => t.value === type)!

  const total = assets.reduce((sum, a) => sum + a.amount, 0)
  const subtotal = (type: AssetType) => assets.filter((a) => a.type === type).reduce((sum, a) => sum + a.amount, 0)
  const totalOf = (ownerId: string) => assets.filter((a) => a.owner_id === ownerId).reduce((sum, a) => sum + a.amount, 0)

  const orderedAssets = [...assets].sort((a, b) => {
    const ta = ASSET_TYPES.findIndex((t) => t.value === a.type)
    const tb = ASSET_TYPES.findIndex((t) => t.value === b.type)
    if (ta !== tb) return ta - tb
    return a.created_at.localeCompare(b.created_at)
  })

  const resetForm = () => {
    setShowAddForm(false)
    setEditingId(null)
    setForm({ name: '', type: 'bank', amount: '', ownerId: currentUserId, memo: '' })
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
      type: asset.type,
      amount: asset.amount.toLocaleString('ko-KR'),
      ownerId: asset.owner_id,
      memo: asset.memo ?? '',
    })
    setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('이름을 입력해주세요.'); return }
    const parsedAmount = parseInt(form.amount.replace(/,/g, ''), 10)
    if (isNaN(parsedAmount) || parsedAmount < 0) { setError('올바른 금액을 입력해주세요.'); return }

    setSaving(true)
    setError(null)
    const supabase = createClient()
    const payload = {
      name: form.name.trim(),
      type: form.type,
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
        <div className="flex bg-white dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
          {ASSET_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: t.value }))}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                form.type === t.value ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
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
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
          {form.type === 'stock' ? '평가금액' : '잔액'}
        </label>
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

  return (
    <div className="flex flex-col h-full">
      <Dialog {...dialogProps} />
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-4 shadow-[0_1px_0_0_#F0F0F0]">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-50">자산관리</h1>
            <button
              onClick={startAdd}
              className="text-sm text-blue-500 dark:text-blue-400 font-medium px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
            >
              {showAddForm ? '취소' : '+ 추가'}
            </button>
          </div>
        </header>

        <div className="px-4 pt-5 pb-[calc(8rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full space-y-4">
          {/* 총자산 요약 */}
          {!loading && assets.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">총자산</p>
              <p className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 mb-3">
                {total.toLocaleString('ko-KR')}<span className="text-lg font-semibold ml-1">원</span>
              </p>
              <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide">
                {ASSET_TYPES.map((t) => (
                  <div key={t.value} className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                    <span className="text-xs text-gray-400 dark:text-gray-500">{t.label}</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {subtotal(t.value).toLocaleString('ko-KR')}원
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-3 mt-3 border-t border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-hide">
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <PersonAvatar profile={me} size={16} />
                  <span className="text-xs text-gray-400 dark:text-gray-500">{me?.display_name ?? '나'}</span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {totalOf(currentUserId).toLocaleString('ko-KR')}원
                  </span>
                </div>
                {partner && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <PersonAvatar profile={partner} size={16} />
                    <span className="text-xs text-gray-400 dark:text-gray-500">{partner.display_name}</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {totalOf(partner.id).toLocaleString('ko-KR')}원
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 추가 폼 */}
          {showAddForm && renderForm('추가하기')}

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
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
              {orderedAssets.map((asset, idx) => {
                const isLast = idx === orderedAssets.length - 1
                const t = typeInfoOf(asset.type)
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
                        <CategoryBadge category={{ name: t.label, color: t.color }} size="sm" />
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
