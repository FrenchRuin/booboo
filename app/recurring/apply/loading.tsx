import BottomNav from '@/components/BottomNav'
import { Skeleton, CardListSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-4 shadow-[0_1px_0_0_#F0F0F0]">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-40 h-3" />
            </div>
          </div>
        </header>
        <div className="px-4 pt-5 pb-[calc(8rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full">
          <CardListSkeleton />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
