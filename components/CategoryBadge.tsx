type Props = {
  category: { name: string; color: string }
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ category, size = 'md' }: Props) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1'

  return (
    <span
      className={`${sizeClass} rounded-full font-medium truncate`}
      style={{ backgroundColor: category.color + '22', color: category.color }}
    >
      {category.name}
    </span>
  )
}
