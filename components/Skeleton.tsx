export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`} />
}

export function Spinner({ className = 'w-4 h-4 border-2 border-white/40 border-t-white' }: { className?: string }) {
  return <div className={`rounded-full animate-spin inline-block align-middle ${className}`} />
}

// 헤더 (월 네비 + 잔액 + 소득/지출) 스켈레톤 — expenses/stats 페이지 공용
export function HeaderSkeleton() {
  return (
    <header className="bg-white dark:bg-gray-900 px-5 pt-12 pb-5 shadow-[0_1px_0_0_#F0F0F0]">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-5">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-24 h-4" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
        <div className="mb-4">
          <Skeleton className="w-20 h-3 mb-2" />
          <Skeleton className="w-40 h-8" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="w-20 h-4" />
          <Skeleton className="w-20 h-4" />
        </div>
      </div>
    </header>
  )
}

// 지출/소득 내역 목록 스켈레톤
export function EntryListSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-9 rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="w-14 h-7 rounded-full flex-shrink-0" />
        <Skeleton className="w-14 h-7 rounded-full flex-shrink-0" />
        <Skeleton className="w-14 h-7 rounded-full flex-shrink-0" />
      </div>
      {[0, 1].map((g) => (
        <div key={g}>
          <Skeleton className="w-24 h-3 mb-2 ml-1" />
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`flex items-center gap-3 px-4 py-3 ${i !== 2 ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="w-32 h-4" />
                  <Skeleton className="w-20 h-3" />
                </div>
                <Skeleton className="w-16 h-4" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// 카테고리별 통계 카드 스켈레톤
export function StatsContentSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((card) => (
        <div key={card} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
          <Skeleton className="w-28 h-4 mb-4" />
          <div className="space-y-4">
            {[0, 1, 2].map((row) => (
              <div key={row}>
                <div className="flex items-center justify-between mb-1.5">
                  <Skeleton className="w-20 h-3.5" />
                  <Skeleton className="w-16 h-3.5" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// 리스트형 카드 스켈레톤 — 고정비/카테고리 관리 등
export function CardListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3.5 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <Skeleton className="w-12 h-6 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-1.5">
            <Skeleton className="w-2/3 h-4" />
            <Skeleton className="w-1/3 h-3" />
          </div>
          <Skeleton className="w-10 h-4 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}

// 입력 폼 스켈레톤 — 내역 추가/수정 페이지
export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 rounded-xl" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
          <Skeleton className="w-16 h-3 mb-2" />
          <Skeleton className="h-11 rounded-xl" />
        </div>
      ))}
    </div>
  )
}
