import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  // No lanzamos un error duro: dejamos que la UI muestre una pantalla clara
  // de "falta configurar .env.local" en vez de una página en blanco.
  console.warn(
    '[supabase] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia .env.example a .env.local.',
  )
}

export const supabase = createClient(url ?? 'https://placeholder.supabase.co', anonKey ?? 'placeholder')

/** UUID del usuario autenticado. RLS ya exige user_id = auth.uid() en cada
 * fila, pero el cliente debe seguir enviando ese valor explicitamente en
 * cada insert (Postgres no lo completa solo). */
export async function getUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('No hay sesión activa')
  return data.user.id
}
