import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ExpensesClient from './ExpensesClient'

export default async function ExpensesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <ExpensesClient currentUserId={user.id} />
}
