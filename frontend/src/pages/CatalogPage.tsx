import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { itemsApi } from '../api/endpoints'
import type { Item } from '../api/types'
import { useCart } from '../cart/CartContext'
import { EmptyState, ErrorMessage, Pagination, QuantityInput, SearchInput, Spinner } from '../components/ui'
import { formatMoney, pluralize } from '../lib/format'
import { useDebounce } from '../lib/useDebounce'
import { useFetch } from '../lib/useFetch'

const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'newest', label: 'Newest' },
]

export function CatalogPage() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'name'
  const page = Number(params.get('page') ?? 1)

  // The search box follows the URL when it changes from outside (the Catalog
  // link, Back/Forward). A change that came from typing is left alone, so a
  // trailing space the user is still typing after isn't trimmed away.
  const [search, setSearch] = useState(q)
  const [syncedQ, setSyncedQ] = useState(q)
  if (q !== syncedQ) {
    setSyncedQ(q)
    if (q !== search.trim()) setSearch(q)
  }

  // ...and the URL (and so the request) follows the box after a short pause.
  const debouncedSearch = useDebounce(search.trim())
  useEffect(() => {
    if (debouncedSearch === q) return
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (debouncedSearch) next.set('q', debouncedSearch)
        else next.delete('q')
        next.delete('page')
        return next
      },
      { replace: true },
    )
    // Reacts to typing only: a `q` changed from outside must not be undone.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [debouncedSearch])

  const setParam = (key: string, value: string | null) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })

  const { data, loading, error } = useFetch(
    (signal) => itemsApi.list({ q, sort, page, per_page: 12 }, signal),
    [q, sort, page],
  )

  return (
    <div className="page">
      <div className="page__header">
        <h1>Catalog</h1>
        {data && (
          <span className="muted">{pluralize(data.meta.total, 'item')}</span>
        )}
      </div>

      <div className="toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or description" />
        <select className="input select" value={sort} onChange={(e) => setParam('sort', e.target.value)} aria-label="Sort by">
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <ErrorMessage error={error} />
      {!data && loading && <Spinner />}
      {data && data.items.length === 0 && <EmptyState>Nothing found. Try a different search.</EmptyState>}

      {data && data.items.length > 0 && (
        <div className={loading ? 'grid is-loading' : 'grid'}>
          {data.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <Pagination meta={data?.meta} onChange={(p) => setParam('page', String(p))} />
    </div>
  )
}

function ItemCard({ item }: { item: Item }) {
  const { add, quantityOf } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [added, setAdded] = useState(false)
  const inCart = quantityOf(item.id)

  useEffect(() => {
    if (!added) return
    const timer = setTimeout(() => setAdded(false), 1500)
    return () => clearTimeout(timer)
  }, [added])

  return (
    <article className="card item-card">
      <h2 className="item-card__name">{item.name}</h2>
      {item.description && <p className="item-card__description">{item.description}</p>}
      <div className="item-card__price">{formatMoney(item.price)}</div>
      <div className="item-card__actions">
        <QuantityInput value={quantity} onChange={setQuantity} />
        <button
          className="btn btn--primary"
          onClick={() => {
            add(item, quantity)
            setQuantity(1)
            setAdded(true)
          }}
        >
          {added ? 'Added ✓' : 'Add to cart'}
        </button>
      </div>
      {inCart > 0 && (
        <Link to="/cart" className="item-card__in-cart">
          In cart: {inCart}
        </Link>
      )}
    </article>
  )
}
