'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/expenses', label: '가계부', icon: '💳' },
  { href: '/stats', label: '통계', icon: '📊' },
  { href: '/profile', label: '프로필', icon: '👤' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 safe-area-inset-bottom">
      <div className="flex max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
                active ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className={`text-xs font-medium ${active ? 'text-gray-900' : 'text-gray-400'}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-gray-900 rounded-t-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
