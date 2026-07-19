import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import CategoriesClient from './CategoriesClient'

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <CategoriesClient />
}
