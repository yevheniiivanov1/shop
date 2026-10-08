import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ordersApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { useCart } from '../cart/CartContext'
import { EmptyState, ErrorMessage, QuantityInput } from '../components/ui'
import { formatMoney, pluralize } from '../lib/format'

export function CartPage() {
  const { user } = useAuth()
  const { lines, total, count, setQuantity, remove, clear } = useCart()
  const navigate = useNavigate()
  const [error, setError] = useState<unknown>(null)
  const [paying, setPaying] = useState(false)

  const pay = async () => {
    setPaying(true)
    setError(null)
    try {
      const { order } = await ordersApi.create(
        lines.map((line) => ({ item_id: line.item.id, quantity: line.quantity })),
      )
      clear()
      navigate('/orders', { state: { createdOrderId: order.id } })
    } catch (err) {
      setError(err)
      setPaying(false)
    }
  }

  if (lines.length === 0) {
    return (
      <div className="page">
        <h1>Cart</h1>
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
          <div className="checkout__total">{formatMoney(total)}</div>
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
