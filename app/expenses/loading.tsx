import BottomNav from '@/components/BottomNav'
import { HeaderSkeleton, EntryListSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <main className="flex-1 min-h-0 overflow-y-auto overscroll-contain scrollbar-hide">
        <HeaderSkeleton />
        <div className="px-4 pt-4 pb-[calc(8rem+env(safe-area-inset-bottom))] max-w-lg mx-auto w-full">
          <EntryListSkeleton />
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
