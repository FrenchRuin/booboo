'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleAdd = () => {
    router.push('/expenses/add')
  }

  const NavItem = ({ href, label, icon }: { href: string; label: string; icon: string }) => {
    const active = pathname.startsWith(href)
    return (
      <Link
        href={href}
        className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors relative ${
          active ? 'text-blue-500' : 'text-gray-400'
        }`}
      >
        <span className="text-xl">{icon}</span>
        <span className={`text-xs font-medium ${active ? 'text-blue-500' : 'text-gray-400'}`}>
          {label}
        </span>
        {active && (
          <span className="absolute bottom-0 w-8 h-0.5 bg-blue-500 rounded-t-full" />
        )}
      </Link>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-1px_0_0_#F0F0F0] safe-area-inset-bottom">
      <div className="relative flex max-w-lg mx-auto">
        {/* 왼쪽 2개 */}
        <NavItem href="/expenses" label="가계부" icon="💳" />
        <NavItem href="/stats" label="통계" icon="📊" />

        {/* 가운데 자리 확보용 빈 슬롯 */}
        <div className="flex-1" />

        {/* 오른쪽 2개 */}
        <NavItem href="/recurring" label="고정비" icon="🔁" />
        <NavItem href="/profile" label="설정" icon="⚙️" />

        {/* 정가운데 + 버튼 (absolute) */}
        <button
          onClick={handleAdd}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-3 w-14 h-14 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-2xl rounded-full shadow-lg shadow-blue-200 flex items-center justify-center transition-all"
          aria-label="내역 추가"
        >
          +
        </button>
      </div>
    </nav>
  )
}
