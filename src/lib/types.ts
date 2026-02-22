export type Tab = {
  id: string
  slug: string
  access_code: string
  name: string | null
  created_at: string
  created_by: string
}

export type Member = {
  id: string
  tab_id: string
  user_id: string
  name: string
  joined_at: string
  is_active: boolean
}

export type Expense = {
  id: string
  tab_id: string
  paid_by: string
  category: string
  amount: number // whole SEK
  description: string | null
  split_mode: string
  created_at: string
  deleted_at: string | null
}

export type Balance = {
  memberId: string
  memberName: string
  net: number // positive = owed money, negative = owes money
}

export type Settlement = {
  from: string
  fromName: string
  to: string
  toName: string
  amount: number
}
