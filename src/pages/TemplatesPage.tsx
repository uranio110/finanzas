import { useEffect, useState } from 'react'
import { listTemplates, deleteTemplate, applyTemplate } from '@/data/templates'
import { listAccounts } from '@/data/accounts'
import { listCategories } from '@/data/categories'
import { formatCurrency } from '@/utils/currency'
import type { Account, Category, QuickTemplate } from '@/types/database'
import { Card, PageHeader, Button, EmptyState } from '@/components/ui'
import { CreateTemplateModal, AmountPromptModal } from '@/components/TemplateModals'

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
      {feedback && <div className="mb-3 rounded-xl bg-income-soft px-3 py-2 text-sm text-income">{feedback}</div>}

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
                  {t.is_recurring && ` · fijo, día ${t.recurrence_day}`}
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
