import { Skeleton, CardListSkeleton } from '@/components/Skeleton'

export default function Loading() {
  return (
    <div className="flex flex-col h-full">
      <header className="bg-white px-5 pt-12 pb-4 shadow-[0_1px_0_0_#F0F0F0]">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-28 h-5" />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-5 max-w-lg mx-auto w-full space-y-4">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <CardListSkeleton />
      </main>
    </div>
  )
}
