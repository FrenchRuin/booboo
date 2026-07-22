'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  isOpen: boolean
  year: number
  month?: number // 생략하면 연도만 선택하는 모드 (통계 연별 보기용)
  onClose: () => void
  onSelect: (year: number, month?: number) => void
}

export default function YearMonthPicker({ isOpen, year, month, onClose, onSelect }: Props) {
  const [displayYear, setDisplayYear] = useState(year)

  useEffect(() => {
    if (isOpen) setDisplayYear(year)
  }, [isOpen, year])

  if (!isOpen) return null

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const isYearOnly = month === undefined
  const years = Array.from({ length: 8 }, (_, i) => currentYear - 7 + i)

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-xs bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        {isYearOnly ? (
          <div className="p-5">
            <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 text-center">연도 선택</p>
            <div className="grid grid-cols-4 gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => onSelect(y)}
                  disabled={y > currentYear}
                  className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    y === year
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  } disabled:opacity-30 disabled:pointer-events-none`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setDisplayYear((y) => y - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <span className="text-sm font-bold text-gray-800 dark:text-gray-100">{displayYear}년</span>
              <button
                type="button"
                onClick={() => setDisplayYear((y) => y + 1)}
                disabled={displayYear >= currentYear}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const isFuture = displayYear === currentYear && m > currentMonth
                const isSelected = displayYear === year && m === month
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSelect(displayYear, m)}
                    disabled={isFuture}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    } disabled:opacity-30 disabled:pointer-events-none`}
                  >
                    {m}월
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
