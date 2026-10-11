import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { Card, PageHeader, Button, Select } from '@/components/ui'

export function SettingsPage() {
  const { session, signOut } = useAuth()
  const [currency, setCurrency] = useState('COP')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session) return
    supabase
      .from('user_preferences')
      .select('default_currency')
      .eq('user_id', session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCurrency(data.default_currency)
      })
  }, [session])

  async function savePreferences() {
    if (!session) return
    setSaving(true)
    await supabase
      .from('user_preferences')
      .upsert({ user_id: session.user.id, default_currency: currency })
    setSaving(false)
  }

  const githubUsername = session?.user.user_metadata?.user_name as string | undefined
  const avatarUrl = session?.user.user_metadata?.avatar_url as string | undefined

  return (
    <div>
      <PageHeader title="Ajustes" />

      <Card className="flex items-center gap-3">
        {avatarUrl && <img src={avatarUrl} alt="" className="h-10 w-10 rounded-full" />}
        <div>
          <div className="text-sm font-medium text-text">{githubUsername ?? session?.user.email ?? 'Sesión activa'}</div>
          <div className="text-xs text-text-muted">Conectado con GitHub</div>
        </div>
      </Card>

      <Card className="mt-3">
        <h2 className="mb-2 text-sm font-semibold text-text-muted">Moneda por defecto</h2>
        <div className="flex gap-2">
          <Select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-32">
            <option value="COP">COP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </Select>
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </Card>

      <Card className="mt-3">
        <h2 className="mb-1 text-sm font-semibold text-text-muted">Datos</h2>
        <p className="mb-3 text-xs text-text-faint">
          Tus datos solo son visibles para tu cuenta. Puedes exportar el historial completo a CSV desde
          "Movimientos" → Exportar CSV.
        </p>
      </Card>

      <Button variant="secondary" className="mt-4" onClick={signOut}>
        Cerrar sesión
      </Button>
    </div>
  )
}
