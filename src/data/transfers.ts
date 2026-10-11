import { supabase, getUserId } from '@/lib/supabase'
import type { Transfer } from '@/types/database'

export async function listTransfers(): Promise<Transfer[]> {
  const { data, error } = await supabase.from('transfers').select('*').order('occurred_at', { ascending: false })
  if (error) throw error
  return data as Transfer[]
}

export async function createTransfer(input: {
  sourceAccountId: string
  destinationAccountId: string
  amountCents: number
  occurredAt: string
  note?: string
}): Promise<Transfer> {
  if (input.sourceAccountId === input.destinationAccountId) {
    throw new Error('La cuenta de origen y destino no pueden ser la misma')
  }
  if (input.amountCents <= 0) {
    throw new Error('El importe de una transferencia debe ser positivo')
  }
  const user_id = await getUserId()
  // Una sola fila/escritura: o la transferencia queda registrada completa,
  // o la inserción falla entera. No hay un estado intermedio posible.
  const { data, error } = await supabase
    .from('transfers')
    .insert({
      user_id,
      source_account_id: input.sourceAccountId,
      destination_account_id: input.destinationAccountId,
      amount: input.amountCents,
      occurred_at: input.occurredAt,
      note: input.note ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data as Transfer
}

export async function deleteTransfer(id: string): Promise<void> {
  const { error } = await supabase.from('transfers').delete().eq('id', id)
  if (error) throw error
}
