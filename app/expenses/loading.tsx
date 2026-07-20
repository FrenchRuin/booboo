import BottomNav from '@/components/BottomNav'
import { HeaderSkeleton, EntryListSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <HeaderSkeleton />
      <main className="flex-1 overflow-y-auto pb-32 px-4 pt-4 max-w-lg mx-auto w-full">
        <EntryListSkeleton />
      </main>
      <BottomNav />
    </div>
  )
}
