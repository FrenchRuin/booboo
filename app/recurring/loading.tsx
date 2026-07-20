import BottomNav from '@/components/BottomNav'
import { Skeleton, CardListSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <header className="bg-white px-5 pt-12 pb-5 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Skeleton className="w-24 h-5" />
          <Skeleton className="w-16 h-7 rounded-xl" />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4 max-w-lg mx-auto w-full">
        <CardListSkeleton />
      </main>
      <BottomNav />
    </div>
  )
}
