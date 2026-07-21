'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Wallet, BarChart3, Landmark, Repeat, Settings, type LucideIcon } from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()

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
      <div className="flex max-w-lg mx-auto">
        <NavItem href="/expenses" label="가계부" Icon={Wallet} />
        <NavItem href="/recurring" label="고정비" Icon={Repeat} />
        <NavItem href="/assets" label="자산" Icon={Landmark} />
        <NavItem href="/stats" label="통계" Icon={BarChart3} />
        <NavItem href="/profile" label="설정" Icon={Settings} />
      </div>
    </nav>
  )
}
