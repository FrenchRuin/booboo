import BottomNav from '@/components/BottomNav'
import { Skeleton, CardListSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <header className="bg-white dark:bg-gray-900 px-5 pt-12 pb-4 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-40 h-3" />
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-5 max-w-lg mx-auto w-full">
        <CardListSkeleton />
      </main>
      <BottomNav />
    </div>
  )
}
