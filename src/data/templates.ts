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
  isRecurring?: boolean
  recurrenceDay?: number | null
}): Promise<QuickTemplate> {
  if (input.isRecurring && input.defaultAmountCents === null) {
    throw new Error('Un gasto/ingreso fijo necesita un importe por defecto (se registra solo, sin preguntarte)')
  }
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
      is_recurring: input.isRecurring ?? false,
      recurrence_day: input.isRecurring ? input.recurrenceDay : null,
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
 * (gastos variables), sin tener que llenar un formulario desde cero.
 * `occurredAt` permite que la aplicación automática de recurrentes registre
 * la fecha real del día configurado en vez de siempre "hoy". */
export async function applyTemplate(template: QuickTemplate, amountOverrideCents?: number, occurredAt?: string) {
  const rawAmount = amountOverrideCents ?? template.default_amount
  if (rawAmount === null || rawAmount === undefined) {
    throw new Error('Esta plantilla no tiene un importe por defecto; indica uno para registrarla')
  }
  const signedAmount = template.kind === 'expense' ? -Math.abs(rawAmount) : Math.abs(rawAmount)
  return createTransaction({
    accountId: template.account_id,
    categoryId: template.category_id,
    amountCents: signedAmount,
    occurredAt: occurredAt ?? new Date().toISOString().slice(0, 10),
  })
}

function lastDayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate()
}

function sameMonth(isoDate: string, today: Date): boolean {
  const d = new Date(isoDate + 'T00:00:00')
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()
}

/**
 * Aplica las plantillas marcadas como fijas/recurrentes cuyo día ya pasó
 * este mes y que todavía no se hayan registrado en el mes actual. No hay
 * ningún proceso en segundo plano (la app no tiene servidor propio) -- esto
 * corre en el cliente cada vez que se abre la app, así que el gasto queda
 * registrado la primera vez que alguien entra en o después del día
 * configurado, no exactamente ese día si nadie abrió la app.
 */
export async function applyDueRecurringTemplates(): Promise<number> {
  const templates = await listTemplates()
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)
  let applied = 0

  for (const t of templates) {
    if (!t.is_recurring || !t.recurrence_day || t.default_amount === null) continue
    if (t.last_applied_at && sameMonth(t.last_applied_at, today)) continue

    const dueDay = Math.min(t.recurrence_day, lastDayOfMonth(today.getFullYear(), today.getMonth()))
    if (today.getDate() < dueDay) continue

    await applyTemplate(t, undefined, todayIso)
    await supabase.from('quick_templates').update({ last_applied_at: todayIso }).eq('id', t.id)
    applied++
  }

  return applied
}
