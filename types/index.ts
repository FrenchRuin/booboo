export type Category = {
  id: string
  name: string
  color: string
  sort_order: number
  is_active: boolean
}

export type IncomeCategory = {
  id: string
  name: string
  color: string
  sort_order: number
  is_active: boolean
}

export type Profile = {
  id: string
  display_name: string
  avatar_url?: string | null
}

export type Expense = {
  id: string
  amount: number
  category_id: string
  note: string | null
  paid_by: string
  date: string
  created_at: string
  deleted_at: string | null
  categories?: Category
  profiles?: Profile
}

export type RecurringExpense = {
  id: string
  title: string
  amount: number
  category_id: string | null
  type: 'expense' | 'income'
  period: 'monthly' | 'yearly'
  apply_month: number | null
  day_of_month: number
  paid_by: string
  is_active: boolean
  created_at: string
}

export type Income = {
  id: string
  amount: number
  category_id: string | null
  note: string | null
  received_by: string
  date: string
  created_at: string
  deleted_at: string | null
  income_categories?: IncomeCategory
}

export type AssetType = 'bank' | 'savings' | 'stock'

export type Asset = {
  id: string
  name: string
  type: AssetType
  amount: number
  owner_id: string
  memo: string | null
  created_at: string
  updated_at: string
}
