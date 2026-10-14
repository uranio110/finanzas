import { supabase, getUserId } from '@/lib/supabase'
import type { Category, CategoryKind } from '@/types/database'

/** Lista fija de categorías -- no hay pantalla para crear/editar categorías,
 * cubre de antemano los ámbitos de gasto/ingreso más comunes. Orden
 * alfabético dentro de cada tipo. Máximo 15 de gasto / 5 de ingreso. */
export const FIXED_CATEGORIES: { name: string; kind: CategoryKind; icon: string }[] = [
  { name: 'Alimentación', kind: 'expense', icon: '🍔' },
  { name: 'Compras', kind: 'expense', icon: '🛍️' },
  { name: 'Educación', kind: 'expense', icon: '📚' },
  { name: 'Entretenimiento', kind: 'expense', icon: '🎉' },
  { name: 'Hogar y servicios', kind: 'expense', icon: '🏠' },
  { name: 'Impuestos y trámites', kind: 'expense', icon: '🧾' },
  { name: 'Mascotas', kind: 'expense', icon: '🐾' },
  { name: 'Otros', kind: 'expense', icon: '🔹' },
  { name: 'Regalos y donaciones', kind: 'expense', icon: '🎁' },
  { name: 'Salud', kind: 'expense', icon: '💊' },
  { name: 'Seguros', kind: 'expense', icon: '🛡️' },
  { name: 'Suscripciones', kind: 'expense', icon: '🔁' },
  { name: 'Tecnología', kind: 'expense', icon: '📱' },
  { name: 'Transporte', kind: 'expense', icon: '🚌' },
  { name: 'Viajes', kind: 'expense', icon: '✈️' },
  { name: 'Ingresos extra', kind: 'income', icon: '💵' },
  { name: 'Inversiones', kind: 'income', icon: '📈' },
  { name: 'Otros', kind: 'income', icon: '✨' },
  { name: 'Regalos', kind: 'income', icon: '🎁' },
  { name: 'Salario', kind: 'income', icon: '💼' },
]

export async function listCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').is('archived_at', null).order('name')
  if (error) throw error
  return data as Category[]
}

/** Crea las categorías fijas que a este usuario todavía le falten (por
 * nombre+tipo). Es seguro llamarla en cada inicio de sesión: no duplica las
 * que ya existen, y a los usuarios que ya tenían categorías de una lista
 * anterior les agrega solo las nuevas. */
export async function syncDefaultCategories(): Promise<void> {
  const user_id = await getUserId()
  const { data: existing, error: fetchError } = await supabase.from('categories').select('name, kind')
  if (fetchError) throw fetchError

  const existingKeys = new Set((existing ?? []).map((c) => `${c.kind}:${c.name}`))
  const missing = FIXED_CATEGORIES.filter((c) => !existingKeys.has(`${c.kind}:${c.name}`))
  if (missing.length === 0) return

  const { error } = await supabase
    .from('categories')
    .insert(missing.map((c) => ({ user_id, name: c.name, kind: c.kind, icon: c.icon })))
  if (error) throw error
}
