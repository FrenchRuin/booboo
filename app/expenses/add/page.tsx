import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import AddExpenseClient from './AddExpenseClient'

export const dynamic = 'force-dynamic'

export default async function AddExpensePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <AddExpenseClient currentUserId={user.id} />
}
