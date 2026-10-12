import { useEffect, useState } from 'react'
import { listCategories, createCategory, archiveCategory } from '@/data/categories'
import type { Category, CategoryKind } from '@/types/database'
import { Card, PageHeader, Button, Input, Modal, EmojiPicker, EmptyState } from '@/components/ui'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [createKind, setCreateKind] = useState<CategoryKind>('expense')

  async function reload() {
    setLoading(true)
    setCategories(await listCategories())
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  const income = categories.filter((c) => c.kind === 'income')
  const expense = categories.filter((c) => c.kind === 'expense')

  return (
    <div>
      <PageHeader title="Categorías" />

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <CategoryGroup
            title="Gastos"
            items={expense}
            onAdd={() => {
              setCreateKind('expense')
              setShowCreate(true)
            }}
            onArchive={async (id) => {
              await archiveCategory(id)
              reload()
            }}
          />
          <CategoryGroup
            title="Ingresos"
            items={income}
            onAdd={() => {
              setCreateKind('income')
              setShowCreate(true)
            }}
            onArchive={async (id) => {
              await archiveCategory(id)
              reload()
            }}
          />
        </div>
      )}

      <CreateCategoryModal
        open={showCreate}
        kind={createKind}
        onClose={() => setShowCreate(false)}
        onCreated={reload}
      />
    </div>
  )
}

function CategoryGroup({
  title,
  items,
  onAdd,
  onArchive,
}: {
  title: string
  items: Category[]
  onAdd: () => void
  onArchive: (id: string) => void
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">{title}</h2>
        <Button variant="secondary" onClick={onAdd}>
          + Añadir
        </Button>
      </div>
      {items.length === 0 ? (
        <EmptyState message="Sin categorías todavía." />
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-surface-2">
              <span className="flex items-center gap-2 text-sm text-text">
                <span>{c.icon}</span>
                {c.name}
              </span>
              <button onClick={() => onArchive(c.id)} className="text-xs text-text-faint hover:text-expense">
                Archivar
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function CreateCategoryModal({
  open,
  kind,
  onClose,
  onCreated,
}: {
  open: boolean
  kind: CategoryKind
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🏷️')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await createCategory({ name, kind, icon })
      setName('')
      onClose()
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={kind === 'expense' ? 'Nueva categoría de gasto' : 'Nueva categoría de ingreso'}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Input placeholder="Nombre (ej. Almuerzo, Transporte)" value={name} onChange={(e) => setName(e.target.value)} required />
        <EmojiPicker value={icon} onChange={setIcon} />
        {error && <p className="text-xs text-expense">{error}</p>}
        <Button type="submit" disabled={saving || !name}>
          {saving ? 'Guardando…' : 'Crear categoría'}
        </Button>
      </form>
    </Modal>
  )
}
