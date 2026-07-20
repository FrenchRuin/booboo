import BottomNav from '@/components/BottomNav'
import { Skeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 px-5 pt-[calc(3rem+env(safe-area-inset-top))] pb-5 shadow-[0_1px_0_0_#F0F0F0]">
          <div className="max-w-lg mx-auto">
            <Skeleton className="w-16 h-5" />
          </div>
        </header>
        <div className="px-4 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6 flex flex-col items-center gap-3">
            <Skeleton className="w-24 h-24 rounded-full" />
            <Skeleton className="w-28 h-4" />
            <Skeleton className="w-36 h-3" />
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
            <Skeleton className="w-14 h-3 mb-2" />
            <Skeleton className="h-11 rounded-xl" />
          </div>
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
