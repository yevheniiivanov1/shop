import { useState, type FormEvent } from 'react'
import { adminApi, itemsApi, type ItemData } from '../../api/endpoints'
import type { Item } from '../../api/types'
import { EmptyState, ErrorMessage, Field, Modal, Pagination, SearchInput, Spinner } from '../../components/ui'
import { formatMoney } from '../../lib/format'
import { useDebounce } from '../../lib/useDebounce'
import { useFetch } from '../../lib/useFetch'

type Editing = { mode: 'create' } | { mode: 'edit'; item: Item } | null

export function AdminItemsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search.trim())
  const [editing, setEditing] = useState<Editing>(null)
  const [actionError, setActionError] = useState<unknown>(null)

  const { data, loading, error, reload } = useFetch(
    (signal) => itemsApi.list({ q, page, sort: 'newest' }, signal),
    [q, page],
  )

  const handleDelete = async (item: Item) => {
    if (!confirm(`Delete "${item.name}"?`)) return
    setActionError(null)
    try {
      await adminApi.deleteItem(item.id)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Items</h1>
        <button className="btn btn--primary" onClick={() => setEditing({ mode: 'create' })}>
          Add item
        </button>
      </div>

      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Search by name or description"
        />
      </div>

      <ErrorMessage error={error ?? actionError} />
      {!data && loading && <Spinner />}
      {data && data.items.length === 0 && <EmptyState>No items found</EmptyState>}

      {data && data.items.length > 0 && (
        <div className={loading ? 'table-wrap card is-loading' : 'table-wrap card'}>
          <table className="table">
            <thead>
              <tr>
                <th className="num">ID</th>
                <th>Name</th>
                <th>Description</th>
                <th className="num">Price</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td data-label="ID" className="num">
                    {item.id}
                  </td>
                  <td data-label="Name">{item.name}</td>
                  <td data-label="Description" className="truncate" title={item.description ?? undefined}>
                    {item.description}
                  </td>
                  <td data-label="Price" className="num nowrap">
                    {formatMoney(item.price)}
                  </td>
                  <td className="actions">
                    <button className="btn btn--ghost btn--small" onClick={() => setEditing({ mode: 'edit', item })}>
                      Edit
                    </button>
                    <button className="btn btn--ghost btn--danger btn--small" onClick={() => handleDelete(item)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={data?.meta} onChange={setPage} />

      {editing && (
        <ItemForm
          item={editing.mode === 'edit' ? editing.item : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function ItemForm({ item, onClose, onSaved }: { item: Item | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ItemData>({
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price ?? '',
  })
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  const update =
    (field: keyof ItemData) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (item) await adminApi.updateItem(item.id, form)
      else await adminApi.createItem(form)
      onSaved()
    } catch (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  return (
    <Modal title={item ? `Item #${item.id}` : 'New item'} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <ErrorMessage error={error} />
        <Field label="Name">
          <input className="input" required maxLength={255} value={form.name} onChange={update('name')} />
        </Field>
        <Field label="Description">
          <textarea className="input textarea" rows={4} maxLength={5000} value={form.description} onChange={update('description')} />
        </Field>
        <Field label="Price, $">
          <input
            className="input"
            type="number"
            required
            min="0"
            step="0.01"
            inputMode="decimal"
            value={form.price}
            onChange={update('price')}
          />
        </Field>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
