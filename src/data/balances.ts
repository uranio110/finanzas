import { supabase } from '@/lib/supabase'

export interface AccountBalance {
  account_id: string
  user_id: string
  name: string
  balance: number
}

/** Lee la vista `account_balances` (ver migración SQL): el saldo nunca se
 * guarda, siempre se deriva de transacciones + transferencias. */
export async function listAccountBalances(): Promise<AccountBalance[]> {
  const { data, error } = await supabase.from('account_balances').select('*')
  if (error) throw error
  return data as AccountBalance[]
}

export interface MonthlyCategoryTotal {
  month: string
  category_id: string
  category_name: string
  kind: 'income' | 'expense'
  total: number
}

export async function getMonthlyCategoryTotals(from: string, to: string): Promise<MonthlyCategoryTotal[]> {
  const { data, error } = await supabase.rpc('monthly_category_totals', { p_from: from, p_to: to })
  if (error) throw error
  return data as MonthlyCategoryTotal[]
}
