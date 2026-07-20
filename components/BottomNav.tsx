'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Wallet, BarChart3, Repeat, Settings, Plus, type LucideIcon } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleAdd = () => {
    router.push('/expenses/add')
  }

  const NavItem = ({ href, label, Icon }: { href: string; label: string; Icon: LucideIcon }) => {
    const active = pathname.startsWith(href)
    return (
      <Link
        href={href}
        className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors relative ${
          active ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <Icon className="w-6 h-6" strokeWidth={2} />
        <span className={`text-xs font-medium ${active ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
          {label}
        </span>
        {active && (
          <span className="absolute bottom-0 w-8 h-0.5 bg-blue-500 rounded-t-full" />
        )}
      </Link>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 shadow-[0_-1px_0_0_#F0F0F0] pb-[env(safe-area-inset-bottom)]">
      <div className="relative flex max-w-lg mx-auto">
        {/* 왼쪽 2개 */}
        <NavItem href="/expenses" label="가계부" Icon={Wallet} />
        <NavItem href="/stats" label="통계" Icon={BarChart3} />

        {/* 가운데 자리 확보용 빈 슬롯 */}
        <div className="flex-1" />

        {/* 오른쪽 2개 */}
        <NavItem href="/recurring" label="고정비" Icon={Repeat} />
        <NavItem href="/profile" label="설정" Icon={Settings} />

        {/* 정가운데 + 버튼 (absolute) */}
        <button
          onClick={handleAdd}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-3 w-14 h-14 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white rounded-full shadow-lg shadow-blue-200 dark:shadow-blue-950/40 flex items-center justify-center transition-all"
          aria-label="내역 추가"
        >
          <Plus className="w-7 h-7" strokeWidth={2.5} />
        </button>
      </div>
    </nav>
  )
}
