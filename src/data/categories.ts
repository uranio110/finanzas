import { supabase, getUserId } from '@/lib/supabase'
import type { Category, CategoryKind } from '@/types/database'

/** Lista fija de categorías (ya no se crean categorías libres, solo se elige
 * el ícono -- ver CategoriesPage). Orden alfabético dentro de cada tipo. */
export const FIXED_CATEGORIES: { name: string; kind: CategoryKind; icon: string }[] = [
  { name: 'Alimentación', kind: 'expense', icon: '🍔' },
  { name: 'Educación', kind: 'expense', icon: '📚' },
  { name: 'Ocio y compras', kind: 'expense', icon: '🎉' },
  { name: 'Otros', kind: 'expense', icon: '🧾' },
  { name: 'Salud y cuidado personal', kind: 'expense', icon: '💊' },
  { name: 'Suscripciones', kind: 'expense', icon: '🔁' },
  { name: 'Transporte', kind: 'expense', icon: '🚌' },
  { name: 'Vivienda y servicios', kind: 'expense', icon: '🏠' },
  { name: 'Ingresos extra', kind: 'income', icon: '💵' },
  { name: 'Otros', kind: 'income', icon: '✨' },
  { name: 'Regalos', kind: 'income', icon: '🎁' },
  { name: 'Salario', kind: 'income', icon: '💼' },
]

export async function listCategories(includeArchived = false): Promise<Category[]> {
  let query = supabase.from('categories').select('*').order('name')
  if (!includeArchived) query = query.is('archived_at', null)
  const { data, error } = await query
  if (error) throw error
  return data as Category[]
}

/** Crea las categorías fijas para el usuario actual si todavía no tiene
 * ninguna (primera vez que usa la app). No crea nada si ya existen,
 * archivadas o no, para no duplicar si el usuario borró una a propósito. */
export async function seedDefaultCategoriesIfEmpty(): Promise<void> {
  const user_id = await getUserId()
  const { count, error: countError } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
  if (countError) throw countError
  if (count && count > 0) return

  const { error } = await supabase
    .from('categories')
    .insert(FIXED_CATEGORIES.map((c) => ({ user_id, name: c.name, kind: c.kind, icon: c.icon })))
  if (error) throw error
}

export async function archiveCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function updateCategoryIcon(id: string, icon: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ icon }).eq('id', id)
  if (error) throw error
}
