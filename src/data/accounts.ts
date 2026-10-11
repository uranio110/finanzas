import { supabase, getUserId } from '@/lib/supabase'
import type { Account, AccountType } from '@/types/database'

export async function listAccounts(includeArchived = false): Promise<Account[]> {
  let query = supabase.from('accounts').select('*').order('created_at')
  if (!includeArchived) query = query.is('archived_at', null)
  const { data, error } = await query
  if (error) throw error
  return data as Account[]
}

export async function createAccount(input: {
  name: string
  type: AccountType
  icon: string
  openingBalanceCents: number
  currency?: string
}): Promise<Account> {
  const user_id = await getUserId()
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id,
      name: input.name,
      type: input.type,
      icon: input.icon,
      opening_balance: input.openingBalanceCents,
      currency: input.currency ?? 'COP',
    })
    .select()
    .single()
  if (error) throw error
  return data as Account
}

export async function archiveAccount(id: string): Promise<void> {
  const { error } = await supabase.from('accounts').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function updateAccount(
  id: string,
  patch: Partial<Pick<Account, 'name' | 'type' | 'icon'>>,
): Promise<void> {
  const { error } = await supabase.from('accounts').update(patch).eq('id', id)
  if (error) throw error
}
