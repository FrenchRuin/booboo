import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ApplyClient from './ApplyClient'

export const dynamic = 'force-dynamic'

export default async function ApplyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ApplyClient currentUserId={user.id} />
}
