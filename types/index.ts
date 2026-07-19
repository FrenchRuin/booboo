export type Category = {
  id: string
  name: string
  icon: string
  color: string
}

export type IncomeCategory = {
  id: string
  name: string
  icon: string
  color: string
}

export type Profile = {
  id: string
  display_name: string
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
