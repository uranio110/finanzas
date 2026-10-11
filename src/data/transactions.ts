import { supabase, getUserId } from '@/lib/supabase'
import type { Transaction } from '@/types/database'

export interface TransactionFilters {
  accountId?: string
  categoryId?: string
  from?: string // YYYY-MM-DD
  to?: string
  kind?: 'income' | 'expense' // filtra por signo del importe, no por la columna `kind`
}

export async function listTransactions(filters: TransactionFilters = {}): Promise<Transaction[]> {
  let query = supabase.from('transactions').select('*').order('occurred_at', { ascending: false })
  if (filters.accountId) query = query.eq('account_id', filters.accountId)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.from) query = query.gte('occurred_at', filters.from)
  if (filters.to) query = query.lte('occurred_at', filters.to)
  if (filters.kind === 'income') query = query.gt('amount', 0)
  if (filters.kind === 'expense') query = query.lt('amount', 0)

  const { data, error } = await query
  if (error) throw error
  return data as Transaction[]
}

export async function createTransaction(input: {
  accountId: string
  categoryId: string | null
  amountCents: number // ya con signo: positivo ingreso, negativo gasto
  occurredAt: string
  note?: string
  kind?: 'normal' | 'adjustment'
}): Promise<Transaction> {
  const user_id = await getUserId()
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id,
      account_id: input.accountId,
      category_id: input.categoryId,
      amount: input.amountCents,
      occurred_at: input.occurredAt,
      note: input.note ?? null,
      kind: input.kind ?? 'normal',
    })
    .select()
    .single()
  if (error) throw error
  return data as Transaction
}

export async function updateTransaction(
  id: string,
  patch: Partial<{
    account_id: string
    category_id: string | null
    amount: number
    occurred_at: string
    note: string | null
  }>,
): Promise<void> {
  const { error } = await supabase.from('transactions').update(patch).eq('id', id)
  if (error) throw error
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from('transactions').delete().eq('id', id)
  if (error) throw error
}
