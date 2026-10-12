import { useEffect, useState } from 'react'
import { listTemplates, createTemplate, deleteTemplate, applyTemplate } from '@/data/templates'
import { listAccounts } from '@/data/accounts'
import { listCategories } from '@/data/categories'
import { formatCurrency, parseAmountToCents } from '@/utils/currency'
import { getErrorMessage } from '@/utils/errors'
import type { Account, Category, CategoryKind, QuickTemplate } from '@/types/database'
import { Card, PageHeader, Button, Input, Select, Modal, EmojiPicker, EmptyState } from '@/components/ui'

export function TemplatesPage() {
  const [templates, setTemplates] = useState<QuickTemplate[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [applying, setApplying] = useState<QuickTemplate | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    const [t, a, c] = await Promise.all([listTemplates(), listAccounts(), listCategories()])
    setTemplates(t)
    setAccounts(a)
    setCategories(c)
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  async function quickApply(t: QuickTemplate) {
    if (t.default_amount === null) {
      setApplying(t)
      return
    }
    await applyTemplate(t)
    setFeedback(`Registrado: ${t.label}`)
    setTimeout(() => setFeedback(null), 1500)
  }

  return (
    <div>
      <PageHeader title="Operaciones rápidas" action={<Button onClick={() => setShowCreate(true)}>+ Nueva plantilla</Button>} />
      {feedback && <div className="mb-3 rounded-md bg-income-soft px-3 py-2 text-sm text-income">{feedback}</div>}

      {!loading && templates.length === 0 && (
        <EmptyState message="Crea plantillas para tus gastos/ingresos habituales (almuerzo, transporte...) y regístralos en un toque." />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => (
          <Card key={t.id} className="flex items-center justify-between gap-2">
            <button onClick={() => quickApply(t)} className="flex flex-1 items-center gap-3 text-left">
              <span className="text-2xl">{t.icon}</span>
              <div>
                <div className="text-sm font-medium text-text">{t.label}</div>
                <div className="text-xs text-text-muted">
                  {t.default_amount !== null ? formatCurrency(t.default_amount) : 'Importe variable'}
                </div>
              </div>
            </button>
            <button
              onClick={async () => {
                if (confirm(`¿Eliminar la plantilla "${t.label}"?`)) {
                  await deleteTemplate(t.id)
                  reload()
                }
              }}
              className="text-text-faint hover:text-expense"
            >
              ✕
            </button>
          </Card>
        ))}
      </div>

      <CreateTemplateModal open={showCreate} onClose={() => setShowCreate(false)} accounts={accounts} categories={categories} onCreated={reload} />
      {applying && (
        <AmountPromptModal
          template={applying}
          onClose={() => setApplying(null)}
          onApplied={() => {
            setFeedback(`Registrado: ${applying.label}`)
            setTimeout(() => setFeedback(null), 1500)
          }}
        />
      )}
    </div>
  )
}

function CreateTemplateModal({
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
      })
      setLabel('')
      setAmount('')
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
        <div className="flex gap-1 rounded-md bg-surface-2 p-1">
          {(['expense', 'income'] as const).map((k) => (
            <button
              type="button"
              key={k}
              onClick={() => setKind(k)}
              className={`flex-1 rounded-md py-1.5 text-xs font-medium ${kind === k ? 'bg-accent text-white' : 'text-text-muted'}`}
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
          placeholder="Importe por defecto (vacío = variable, lo pide cada vez)"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {error && <p className="text-xs text-expense">{error}</p>}
        <Button type="submit" disabled={saving || !label}>
          {saving ? 'Guardando…' : 'Crear plantilla'}
        </Button>
      </form>
    </Modal>
  )
}

function AmountPromptModal({
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
