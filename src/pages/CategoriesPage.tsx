import { useEffect, useState } from 'react'
import { listCategories, seedDefaultCategoriesIfEmpty, archiveCategory, updateCategoryIcon } from '@/data/categories'
import type { Category } from '@/types/database'
import { Card, PageHeader, EmptyState, EmojiPicker } from '@/components/ui'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingIconId, setEditingIconId] = useState<string | null>(null)

  async function reload() {
    setLoading(true)
    await seedDefaultCategoriesIfEmpty()
    setCategories(await listCategories())
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  const income = categories.filter((c) => c.kind === 'income')
  const expense = categories.filter((c) => c.kind === 'expense')

  async function changeIcon(id: string, icon: string) {
    await updateCategoryIcon(id, icon)
    setEditingIconId(null)
    reload()
  }

  async function archive(id: string) {
    await archiveCategory(id)
    reload()
  }

  return (
    <div>
      <PageHeader title="Categorías" />
      <p className="mb-4 text-xs text-text-faint">
        Las categorías son fijas; lo único que puedes personalizar es el ícono de cada una. Toca el ícono para
        cambiarlo.
      </p>

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          <CategoryGroup
            title="Gastos"
            items={expense}
            editingIconId={editingIconId}
            onEditIcon={setEditingIconId}
            onChangeIcon={changeIcon}
            onArchive={archive}
          />
          <CategoryGroup
            title="Ingresos"
            items={income}
            editingIconId={editingIconId}
            onEditIcon={setEditingIconId}
            onChangeIcon={changeIcon}
            onArchive={archive}
          />
        </div>
      )}
    </div>
  )
}

function CategoryGroup({
  title,
  items,
  editingIconId,
  onEditIcon,
  onChangeIcon,
  onArchive,
}: {
  title: string
  items: Category[]
  editingIconId: string | null
  onEditIcon: (id: string | null) => void
  onChangeIcon: (id: string, icon: string) => void
  onArchive: (id: string) => void
}) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-text">{title}</h2>
      {items.length === 0 ? (
        <EmptyState message="Sin categorías." />
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((c) => (
            <li key={c.id} className="rounded-xl px-2 py-1.5 hover:bg-surface-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => onEditIcon(editingIconId === c.id ? null : c.id)}
                  className="flex items-center gap-2 text-sm text-text"
                >
                  <span className="text-lg">{c.icon}</span>
                  {c.name}
                </button>
                <button onClick={() => onArchive(c.id)} className="text-xs text-text-faint hover:text-expense">
                  Archivar
                </button>
              </div>
              {editingIconId === c.id && (
                <div className="mt-2">
                  <EmojiPicker value={c.icon} onChange={(icon) => onChangeIcon(c.id, icon)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
