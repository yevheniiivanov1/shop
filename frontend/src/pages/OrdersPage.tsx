import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { ordersApi } from '../api/endpoints'
import type { Order, OrderSummary } from '../api/types'
import { EmptyState, ErrorMessage, Notice, Pagination, Spinner } from '../components/ui'
import { formatDateTime, formatMoney, pluralize } from '../lib/format'
import { useFetch } from '../lib/useFetch'

export function OrdersPage() {
  const location = useLocation()
  const navigate = useNavigate()
  // The cart passes the new order in history state. Show the notice once and
  // clear that state, so reloading the page doesn't announce the payment again.
  const [createdOrderId] = useState(() => (location.state as { createdOrderId?: number } | null)?.createdOrderId)
  useEffect(() => {
    if (location.state) navigate(location.pathname + location.search, { replace: true, state: null })
  }, [location, navigate])

  const [params, setParams] = useSearchParams()
  const page = Number(params.get('page') ?? 1)

  const { data, loading, error } = useFetch((signal) => ordersApi.list(page, signal), [page])

  return (
    <div className="page">
      <h1>My orders</h1>
      {createdOrderId && <Notice>Order #{createdOrderId} has been paid. Thank you for your purchase!</Notice>}
      <ErrorMessage error={error} />
      {!data && loading && <Spinner />}
      {data && data.orders.length === 0 && (
        <EmptyState>
          You have no orders yet. <Link to="/">Go to the catalog</Link>
        </EmptyState>
      )}

      {data && data.orders.length > 0 && (
        <div className="orders">
          {data.orders.map((order) => (
            <OrderRow key={order.id} order={order} initiallyOpen={order.id === createdOrderId} />
          ))}
        </div>
      )}

      <Pagination meta={data?.meta} onChange={(p) => setParams({ page: String(p) })} />
    </div>
  )
}

function OrderRow({ order, initiallyOpen }: { order: OrderSummary; initiallyOpen: boolean }) {
  const [open, setOpen] = useState(initiallyOpen)
  const [details, setDetails] = useState<Order | null>(null)
  const [error, setError] = useState<unknown>(null)

  // Lines are loaded lazily, the first time the order is expanded.
  // After an error, collapsing and expanding again retries.
  useEffect(() => {
    if (!open || details) return
    let cancelled = false
    ordersApi.get(order.id).then(
      (response) => !cancelled && setDetails(response.order),
      (err: unknown) => !cancelled && setError(err),
    )
    return () => {
      cancelled = true
    }
  }, [open, details, order.id])

  const toggle = () => {
    if (!open) setError(null)
    setOpen(!open)
  }

  const panelId = `order-${order.id}`
  return (
    <section className={open ? 'card order order--open' : 'card order'}>
      <button className="order__summary" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
        <span className="order__number">Order #{order.id}</span>
        <span className="muted">{formatDateTime(order.created_at)}</span>
        <span className="muted">{pluralize(order.items_count, 'item')}</span>
        <span className="order__amount">{formatMoney(order.amount)}</span>
        <span className="order__chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div id={panelId} className="order__details">
          <ErrorMessage error={error} />
          {!details && !error && <Spinner />}
          {details && (
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th className="num">Price</th>
                  <th className="num">Qty</th>
                  <th className="num">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {details.lines.map((line) => (
                  <tr key={line.id}>
                    <td data-label="Item">{line.name}</td>
                    <td data-label="Price" className="num">
                      {formatMoney(line.price)}
                    </td>
                    <td data-label="Qty" className="num">
                      {line.quantity}
                    </td>
                    <td data-label="Subtotal" className="num">
                      {formatMoney(line.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>Total</td>
                  <td className="num">{formatMoney(details.amount)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </section>
  )
}
