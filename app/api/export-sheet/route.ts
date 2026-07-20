import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { exportMonthToGoogleSheet, type SheetEntry } from '@/lib/google-sheets'
import type { Expense, Income } from '@/types'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요해요.' }, { status: 401 })
  }

  const { year, month } = await request.json()
  if (!year || !month) {
    return NextResponse.json({ error: 'year, month가 필요해요.' }, { status: 400 })
  }

  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const to = new Date(year, month, 0).toISOString().split('T')[0]

  const [{ data: expData }, { data: incData }, { data: profileData }] = await Promise.all([
    supabase.from('expenses').select('*, categories(*)').gte('date', from).lte('date', to).is('deleted_at', null).order('date'),
    supabase.from('incomes').select('*, income_categories(*)').gte('date', from).lte('date', to).is('deleted_at', null).order('date'),
    supabase.from('profiles').select('*'),
  ])

  const profileMap = new Map((profileData ?? []).map((p) => [p.id, p.display_name as string]))

  const entries: SheetEntry[] = [
    ...((expData as Expense[]) ?? []).map((e) => ({
      date: e.date,
      type: 'expense' as const,
      category: e.categories?.name ?? '기타',
      note: e.note,
      person: profileMap.get(e.paid_by) ?? '',
      amount: e.amount,
    })),
    ...((incData as Income[]) ?? []).map((e) => ({
      date: e.date,
      type: 'income' as const,
      category: e.income_categories?.name ?? '기타',
      note: e.note,
      person: profileMap.get(e.received_by) ?? '',
      amount: e.amount,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date))

  if (entries.length === 0) {
    return NextResponse.json({ error: '내보낼 내역이 없어요.' }, { status: 400 })
  }

  try {
    const url = await exportMonthToGoogleSheet(year, month, entries)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('구글시트 내보내기 실패:', err)
    const message = err instanceof Error ? err.message : '구글시트 내보내기에 실패했어요.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
