/**
 * Los errores de supabase-js (PostgrestError, AuthError, etc.) no siempre
 * llegan como `instanceof Error` tal cual se propagan por el bundler, así
 * que extraemos el mensaje por duck-typing en vez de confiar en eso. Además
 * siempre logueamos el objeto completo: Postgres suele poner la pista útil
 * en `hint` o `details`, no en `message`.
 */
export function getErrorMessage(err: unknown): string {
  console.error('[error]', err)
  if (err && typeof err === 'object') {
    const anyErr = err as Record<string, unknown>
    const parts = [anyErr.message, anyErr.hint, anyErr.details].filter(
      (p): p is string => typeof p === 'string' && p.length > 0,
    )
    if (parts.length > 0) return parts.join(' — ')
  }
  if (typeof err === 'string') return err
  return 'Error al guardar (revisa la consola del navegador para más detalle)'
}
