import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { Item } from '../api/types'
import { MAX_QUANTITY } from './cart'
import { CartProvider, useCart } from './CartContext'

const mouse: Item = { id: 1, name: 'Mouse', description: null, price: '99.50' }
const cable: Item = { id: 2, name: 'Cable', description: null, price: '9.00' }

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>
const renderCart = () => renderHook(() => useCart(), { wrapper }).result

describe('CartContext', () => {
  it('merges repeated adds of the same item and totals in cents', () => {
    const cart = renderCart()

    act(() => cart.current.add(mouse, 1))
    act(() => cart.current.add(mouse, 2))
    act(() => cart.current.add(cable, 1))

    expect(cart.current.lines.map((line) => [line.item.id, line.quantity])).toEqual([
      [1, 3],
      [2, 1],
    ])
    expect(cart.current.count).toBe(4)
    expect(cart.current.totalCents).toBe(3 * 9950 + 900)
  })

  it('clamps quantities and removes a line set to zero', () => {
    const cart = renderCart()

    act(() => cart.current.add(mouse, MAX_QUANTITY + 50))
    expect(cart.current.quantityOf(mouse.id)).toBe(MAX_QUANTITY)

    act(() => cart.current.setQuantity(mouse.id, 0))
    expect(cart.current.lines).toEqual([])
  })

  it('persists the cart and survives corrupted storage', () => {
    const cart = renderCart()
    act(() => cart.current.add(cable, 2))

    expect(renderCart().current.quantityOf(cable.id)).toBe(2)

    localStorage.setItem('shop.cart', '{not json')
    expect(renderCart().current.lines).toEqual([])
  })

  it('syncs with the catalog: new prices, and drops only requested items that are gone', () => {
    const cart = renderCart()
    act(() => cart.current.add(mouse, 1))
    act(() => cart.current.add(cable, 1))

    act(() => cart.current.syncWithCatalog([{ ...mouse, price: '80.00' }], [mouse.id, cable.id]))
    expect(cart.current.lines.map((line) => [line.item.id, line.item.price])).toEqual([[1, '80.00']])

    act(() => cart.current.add(cable, 1))
    act(() => cart.current.syncWithCatalog([], [mouse.id]))
    expect(cart.current.lines.map((line) => line.item.id)).toEqual([2])
  })
})
