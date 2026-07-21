import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AssetsClient from './AssetsClient'

export const dynamic = 'force-dynamic'

export default async function AssetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <AssetsClient currentUserId={user.id} />
}
