import BottomNav from '@/components/BottomNav'
import { Skeleton, CardListSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-5 shadow-[0_1px_0_0_#F0F0F0]">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <Skeleton className="w-24 h-5" />
            <Skeleton className="w-16 h-7 rounded-xl" />
          </div>
        </header>
        <div className="px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full">
          <CardListSkeleton />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
