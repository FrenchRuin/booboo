import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import RecurringClient from './RecurringClient'

export const dynamic = 'force-dynamic'

export default async function RecurringPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <RecurringClient currentUserId={user.id} />
}
