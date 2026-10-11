// Tipos que reflejan el esquema de supabase/migrations/0001_init.sql.
// Los importes se manejan siempre en unidades enteras (centavos) como
// `number` (bigint de Postgres cabe en un JS number hasta 2^53, de sobra
// para finanzas personales) -- nunca como float con decimales.

export type AccountType = 'cash' | 'bank' | 'savings' | 'card' | 'other'
export type CategoryKind = 'income' | 'expense'
export type TransactionKind = 'normal' | 'adjustment'

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  icon: string
  opening_balance: number
  currency: string
  created_at: string
  archived_at: string | null
}

export interface Category {
  id: string
  user_id: string
  name: string
  kind: CategoryKind
  icon: string
  color: string | null
  sort_order: number
  archived_at: string | null
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  kind: TransactionKind
  amount: number // positivo = ingreso, negativo = gasto, centavos
  occurred_at: string
  note: string | null
  created_at: string
}

export interface Transfer {
  id: string
  user_id: string
  source_account_id: string
  destination_account_id: string
  amount: number // siempre positivo, centavos
  occurred_at: string
  note: string | null
  created_at: string
}

export interface QuickTemplate {
  id: string
  user_id: string
  label: string
  icon: string
  category_id: string | null
  account_id: string
  default_amount: number | null
  kind: CategoryKind
}

export interface UserPreferences {
  user_id: string
  theme: string
  locale: string
  default_currency: string
}
