import type { Category } from '@/types'

type Props = {
  category: Category
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ category, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-base' : 'w-10 h-10 text-xl'

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0`}
      style={{ backgroundColor: category.color + '22' }}
    >
      <span>{category.icon}</span>
    </div>
  )
}
