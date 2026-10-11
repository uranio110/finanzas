import { supabase, getUserId } from '@/lib/supabase'
import type { Category, CategoryKind } from '@/types/database'

export async function listCategories(includeArchived = false): Promise<Category[]> {
  let query = supabase.from('categories').select('*').order('sort_order')
  if (!includeArchived) query = query.is('archived_at', null)
  const { data, error } = await query
  if (error) throw error
  return data as Category[]
}

export async function createCategory(input: {
  name: string
  kind: CategoryKind
  icon: string
  color?: string
}): Promise<Category> {
  const user_id = await getUserId()
  const { data, error } = await supabase
    .from('categories')
    .insert({ user_id, name: input.name, kind: input.kind, icon: input.icon, color: input.color ?? null })
    .select()
    .single()
  if (error) throw error
  return data as Category
}

export async function archiveCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').update({ archived_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, 'name' | 'icon' | 'color' | 'sort_order'>>,
): Promise<void> {
  const { error } = await supabase.from('categories').update(patch).eq('id', id)
  if (error) throw error
}
