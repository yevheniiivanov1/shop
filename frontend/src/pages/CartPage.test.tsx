import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { itemsApi, ordersApi } from '../api/endpoints'
import type { Item } from '../api/types'
import { CartProvider } from '../cart/CartContext'
import { CartPage } from './CartPage'

vi.mock('../api/endpoints', () => ({ itemsApi: { byIds: vi.fn() }, ordersApi: { create: vi.fn() } }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 1, role: 'user' } }) }))

const mouse: Item = { id: 1, name: 'Mouse', description: null, price: '99.50' }
const lamp: Item = { id: 2, name: 'Lamp', description: null, price: '49.00' }
const meta = { page: 1, per_page: 100, total: 0, total_pages: 1 }

function OrdersProbe() {
  return <p>orders page, created {(useLocation().state as { createdOrderId: number }).createdOrderId}</p>
}

function renderCart(lines: { item: Item; quantity: number }[]) {
  localStorage.setItem('shop.cart', JSON.stringify(lines))
  render(
    <MemoryRouter initialEntries={['/cart']}>
      <CartProvider>
        <Routes>
          <Route path="/cart" element={<CartPage />} />
          <Route path="/orders" element={<OrdersProbe />} />
        </Routes>
      </CartProvider>
    </MemoryRouter>,
  )
}

describe('CartPage', () => {
  beforeEach(() => {
    vi.mocked(itemsApi.byIds).mockResolvedValue({ items: [mouse, lamp], meta })
  })

  it('pays for the cart with the total the customer saw, then shows the order', async () => {
    vi.mocked(ordersApi.create).mockResolvedValue({
      order: { id: 7, amount: '248.00', items_count: 3, created_at: '2026-10-08T00:00:00Z', lines: [] },
    })
    const user = userEvent.setup()
    renderCart([
      { item: mouse, quantity: 2 },
      { item: lamp, quantity: 1 },
    ])

    expect(screen.getByText('$248.00')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Pay for the order' }))

    expect(await screen.findByText('orders page, created 7')).toBeInTheDocument()
    expect(ordersApi.create).toHaveBeenCalledWith(
      [
        { item_id: 1, quantity: 2 },
        { item_id: 2, quantity: 1 },
      ],
      '248.00',
    )
    expect(JSON.parse(localStorage.getItem('shop.cart')!)).toEqual([])
  })

  it('shows new prices instead of charging when they changed', async () => {
    vi.mocked(ordersApi.create).mockRejectedValue(
      new ApiError(409, { error: 'Prices have changed', code: 'prices_changed' }),
    )
    const user = userEvent.setup()
    renderCart([{ item: mouse, quantity: 1 }])
    await waitFor(() => expect(itemsApi.byIds).toHaveBeenCalledTimes(1))

    vi.mocked(itemsApi.byIds).mockResolvedValue({ items: [{ ...mouse, price: '120.00' }], meta })
    await user.click(screen.getByRole('button', { name: 'Pay for the order' }))

    expect(await screen.findByText('Your cart has been updated.')).toBeInTheDocument()
    expect(screen.getByText('Mouse: $99.50 → $120.00')).toBeInTheDocument()
    expect(screen.getAllByText('$120.00').length).toBeGreaterThan(0)
    expect(screen.queryByText(/orders page/)).not.toBeInTheDocument()
  })

  it('drops items that are no longer sold when the cart opens', async () => {
    vi.mocked(itemsApi.byIds).mockResolvedValue({ items: [mouse], meta })
    renderCart([
      { item: mouse, quantity: 1 },
      { item: lamp, quantity: 1 },
    ])

    expect(await screen.findByText('Lamp is no longer available and was removed')).toBeInTheDocument()
    expect(itemsApi.byIds).toHaveBeenCalledWith([1, 2])
    expect(screen.queryByRole('cell', { name: 'Lamp' })).not.toBeInTheDocument()
    expect(screen.getByText('$99.50', { selector: '.checkout__total' })).toBeInTheDocument()
  })
})
