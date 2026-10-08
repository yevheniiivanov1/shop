import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { itemsApi, ordersApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { centsToAmount, compareWithCatalog, hasChanges, MAX_LINES, type CartChanges } from '../cart/cart'
import { useCart } from '../cart/CartContext'
import { EmptyState, ErrorMessage, QuantityInput } from '../components/ui'
import { formatMoney, pluralize } from '../lib/format'

export function CartPage() {
  const { user } = useAuth()
  const { lines, totalCents, count, setQuantity, remove, clear, syncWithCatalog } = useCart()
  const navigate = useNavigate()
  const [error, setError] = useState<unknown>(null)
  const [changes, setChanges] = useState<CartChanges | null>(null)
  const [paying, setPaying] = useState(false)

  // Prices in the cart were saved when the items were added; bring them up to date.
  const refreshCart = async (): Promise<CartChanges> => {
    const ids = lines.slice(0, MAX_LINES).map((line) => line.item.id)
    const { items } = await itemsApi.byIds(ids)
    syncWithCatalog(items, ids)
    return compareWithCatalog(lines, items, ids)
  }

  useEffect(() => {
    if (lines.length === 0) return
    let cancelled = false
    refreshCart().then(
      (found) => !cancelled && hasChanges(found) && setChanges(found),
      () => {}, // Not critical: the server checks prices again on payment.
    )
    return () => {
      cancelled = true
    }
    // Once per visit of the cart page.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [])

  const pay = async () => {
    setPaying(true)
    setError(null)
    setChanges(null)
    try {
      const { order } = await ordersApi.create(
        lines.map((line) => ({ item_id: line.item.id, quantity: line.quantity })),
        centsToAmount(totalCents),
      )
      clear()
      navigate('/orders', { state: { createdOrderId: order.id } })
    } catch (err) {
      // Prices changed or items are gone: show the updated cart instead of charging.
      const outdated = err instanceof ApiError && (err.code === 'prices_changed' || err.code === 'items_not_found')
      const found = outdated ? await refreshCart().catch(() => null) : null
      if (hasChanges(found)) setChanges(found)
      else setError(err)
      setPaying(false)
    }
  }

  const changesNotice = hasChanges(changes) && (
    <div className="alert alert--warning" role="status">
      <strong>Your cart has been updated.</strong>
      <ul>
        {changes.repriced.map((change) => (
          <li key={`price-${change.name}`}>
            {change.name}: {formatMoney(change.from)} → {formatMoney(change.to)}
          </li>
        ))}
        {changes.removed.map((name) => (
          <li key={`gone-${name}`}>{name} is no longer available and was removed</li>
        ))}
      </ul>
      {lines.length > 0 && 'Please check the new total before paying.'}
    </div>
  )

  if (lines.length === 0) {
    return (
      <div className="page">
        <h1>Cart</h1>
        {changesNotice}
        <EmptyState>
          Your cart is empty. <Link to="/">Go to the catalog</Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Cart</h1>
        <button className="btn btn--ghost" onClick={clear}>
          Clear cart
        </button>
      </div>

      {changesNotice}
      <ErrorMessage error={error} />

      <div className="table-wrap card">
        <table className="table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="num">Price</th>
              <th>Quantity</th>
              <th className="num">Subtotal</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {lines.map(({ item, quantity }) => (
              <tr key={item.id}>
                <td data-label="Item">{item.name}</td>
                <td data-label="Price" className="num">
                  {formatMoney(item.price)}
                </td>
                <td data-label="Quantity">
                  <QuantityInput value={quantity} onChange={(value) => setQuantity(item.id, value)} />
                </td>
                <td data-label="Subtotal" className="num">
                  {formatMoney(Number(item.price) * quantity)}
                </td>
                <td className="actions">
                  <button className="btn btn--ghost btn--danger btn--small" onClick={() => remove(item.id)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="checkout card">
        <div>
          <div className="muted">Total, {pluralize(count, 'item')}</div>
          <div className="checkout__total">{formatMoney(centsToAmount(totalCents))}</div>
        </div>
        {user ? (
          <div className="checkout__pay">
            <button className="btn btn--primary btn--large" onClick={pay} disabled={paying}>
              {paying ? 'Paying…' : 'Pay for the order'}
            </button>
            <span className="field__hint">Payment is simulated: the order is marked as paid right away.</span>
          </div>
        ) : (
          <div className="checkout__pay">
            <Link to="/login" state={{ from: '/cart' }} className="btn btn--primary btn--large">
              Sign in to pay
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
