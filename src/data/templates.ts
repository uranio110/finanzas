import { supabase, getUserId } from '@/lib/supabase'
import { createTransaction } from './transactions'
import type { CategoryKind, QuickTemplate } from '@/types/database'

export async function listTemplates(): Promise<QuickTemplate[]> {
  const { data, error } = await supabase.from('quick_templates').select('*').order('sort_order')
  if (error) throw error
  return data as QuickTemplate[]
}

export async function createTemplate(input: {
  label: string
  icon: string
  kind: CategoryKind
  categoryId: string | null
  accountId: string
  defaultAmountCents: number | null
}): Promise<QuickTemplate> {
  const user_id = await getUserId()
  const { data, error } = await supabase
    .from('quick_templates')
    .insert({
      user_id,
      label: input.label,
      icon: input.icon,
      kind: input.kind,
      category_id: input.categoryId,
      account_id: input.accountId,
      default_amount: input.defaultAmountCents,
    })
    .select()
    .single()
  if (error) throw error
  return data as QuickTemplate
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('quick_templates').delete().eq('id', id)
  if (error) throw error
}

/** Registra una transacción real a partir de una plantilla, con la fecha de
 * hoy. `amountOverrideCents` permite ajustar el importe antes de confirmar
 * (gastos variables), sin tener que llenar un formulario desde cero. */
export async function applyTemplate(template: QuickTemplate, amountOverrideCents?: number) {
  const rawAmount = amountOverrideCents ?? template.default_amount
  if (rawAmount === null || rawAmount === undefined) {
    throw new Error('Esta plantilla no tiene un importe por defecto; indica uno para registrarla')
  }
  const signedAmount = template.kind === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount)
  return createTransaction({
    accountId: template.account_id,
    categoryId: template.category_id,
    amountCents: signedAmount,
    occurredAt: new Date().toISOString().slice(0, 10),
  })
}
