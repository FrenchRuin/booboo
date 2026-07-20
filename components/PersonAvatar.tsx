type Props = {
  profile?: { display_name: string; avatar_url?: string | null } | null
  size?: number
}

export default function PersonAvatar({ profile, size = 20 }: Props) {
  const style = { width: size, height: size }

  if (profile?.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.avatar_url}
        alt={profile.display_name}
        style={style}
        className="rounded-full object-cover flex-shrink-0 bg-gray-100"
      />
    )
  }

  return (
    <span
      style={style}
      className="rounded-full bg-gray-200 text-gray-500 flex items-center justify-center flex-shrink-0 font-medium"
    >
      <span style={{ fontSize: size * 0.5 }}>{profile?.display_name?.[0] ?? '?'}</span>
    </span>
  )
}
