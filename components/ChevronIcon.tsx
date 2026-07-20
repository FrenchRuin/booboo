type Props = {
  direction: 'left' | 'right'
  className?: string
}

export default function ChevronIcon({ direction, className = 'w-5 h-5' }: Props) {
  const d = direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 6l6 6-6 6'
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}
