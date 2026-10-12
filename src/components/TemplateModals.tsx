import { useState } from 'react'
import { createTemplate, applyTemplate } from '@/data/templates'
import { parseAmountToCents } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'
import type { Account, Category, CategoryKind, QuickTemplate } from '@/types/database'
import { Button, Input, Select, Modal, EmojiPicker } from '@/components/ui'

export function CreateTemplateModal({
  open,
  onClose,
  accounts,
  categories,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  accounts: Account[]
  categories: Category[]
  onCreated: () => void
}) {
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('⚡')
  const [kind, setKind] = useState<CategoryKind>('expense')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceDay, setRecurrenceDay] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredCategories = categories.filter((c) => c.kind === kind)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountId) return
    setSaving(true)
    setError(null)
    try {
      const cents = amount ? parseAmountToCents(amount) : null
      await createTemplate({
        label,
        icon,
        kind,
        categoryId: categoryId || null,
        accountId,
        defaultAmountCents: cents,
        isRecurring,
        recurrenceDay: isRecurring ? Number(recurrenceDay) : null,
      })
      setLabel('')
      setAmount('')
      setIsRecurring(false)
      onClose()
      onCreated()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (accounts.length === 0) return null

  return (
    <Modal open={open} onClose={onClose} title="Nueva plantilla">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input placeholder="Nombre (ej. Almuerzo)" value={label} onChange={(e) => setLabel(e.target.value)} required />
        <EmojiPicker value={icon} onChange={setIcon} />
        <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
          {(['expense', 'income'] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${kind === k ? 'bg-accent text-white' : 'text-text-muted'}`}
            >
              {k === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name}
            </option>
          ))}
        </Select>
        <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Sin categoría</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </Select>
        <Input
          placeholder={isRecurring ? 'Importe fijo (obligatorio)' : 'Importe por defecto (vacío = variable, lo pide cada vez)'}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <label className="flex items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Es un gasto/ingreso fijo (se repite cada mes)
        </label>

        {isRecurring && (
          <div>
            <label className="mb-1 block text-xs text-text-muted">Día del mes en que se registra</label>
            <Select value={recurrenceDay} onChange={(e) => setRecurrenceDay(e.target.value)}>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-text-faint">
              Se registra sola la primera vez que abras la app en o después de ese día cada mes (la app no corre en
              segundo plano).
            </p>
          </div>
        )}

        {error && <p className="text-xs text-expense">{error}</p>}
        <Button type="submit" disabled={saving || !label || (isRecurring && !amount)}>
          {saving ? 'Guardando…' : 'Crear plantilla'}
        </Button>
      </form>
    </Modal>
  )
}

export function AmountPromptModal({
  template,
  onClose,
  onApplied,
}: {
  template: QuickTemplate
  onClose: () => void
  onApplied: () => void
}) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const cents = parseAmountToCents(amount)
    if (cents === null) return
    setSaving(true)
    setError(null)
    try {
      await applyTemplate(template, cents)
      onApplied()
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={template.label}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input placeholder="Importe" inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} />
        {error && <p className="text-xs text-expense">{error}</p>}
        <Button type="submit" disabled={saving || !amount}>
          {saving ? 'Guardando…' : 'Registrar'}
        </Button>
      </form>
    </Modal>
  )
}
