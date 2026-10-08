import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Item } from '../api/types'
import { MAX_QUANTITY, toCents, type CartLine } from './cart'

interface CartContextValue {
  lines: CartLine[]
  /** Total number of units in the cart. */
  count: number
  /** Total in cents, from the prices stored with the cart lines. */
  totalCents: number
  quantityOf: (itemId: number) => number
  add: (item: Item, quantity: number) => void
  setQuantity: (itemId: number, quantity: number) => void
  remove: (itemId: number) => void
  clear: () => void
  /**
   * Replaces the stored item data with `current` (fresh from the API) and drops
   * lines whose item was requested (`requestedIds`) but is gone.
   */
  syncWithCatalog: (current: Item[], requestedIds: number[]) => void
}

const STORAGE_KEY = 'shop.cart'
const CartContext = createContext<CartContextValue | null>(null)

function clamp(quantity: number): number {
  return Math.min(MAX_QUANTITY, Math.max(0, Math.floor(quantity)))
}

function load(): CartLine[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (line): line is CartLine =>
        typeof line?.item?.id === 'number' && typeof line?.quantity === 'number' && line.quantity > 0,
    )
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Storage may be unavailable (private mode); the cart then lives in memory only.
    }
  }, [lines])

  const setQuantity = useCallback((itemId: number, quantity: number) => {
    const next = clamp(quantity)
    setLines((current) =>
      next === 0
        ? current.filter((line) => line.item.id !== itemId)
        : current.map((line) => (line.item.id === itemId ? { ...line, quantity: next } : line)),
    )
  }, [])

  const add = useCallback((item: Item, quantity: number) => {
    setLines((current) => {
      const existing = current.find((line) => line.item.id === item.id)
      if (existing) {
        return current.map((line) =>
          line.item.id === item.id ? { item, quantity: clamp(line.quantity + quantity) } : line,
        )
      }
      const next = clamp(quantity)
      return next > 0 ? [...current, { item, quantity: next }] : current
    })
  }, [])

  const remove = useCallback((itemId: number) => {
    setLines((current) => current.filter((line) => line.item.id !== itemId))
  }, [])

  const clear = useCallback(() => setLines([]), [])

  const syncWithCatalog = useCallback((current: Item[], requestedIds: number[]) => {
    const fresh = new Map(current.map((item) => [item.id, item]))
    const requested = new Set(requestedIds)
    setLines((lines) =>
      lines
        .filter((line) => !requested.has(line.item.id) || fresh.has(line.item.id))
        .map((line) => ({ ...line, item: fresh.get(line.item.id) ?? line.item })),
    )
  }, [])

  const value = useMemo<CartContextValue>(() => {
    const quantities = new Map(lines.map((line) => [line.item.id, line.quantity]))
    return {
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      totalCents: lines.reduce((sum, line) => sum + toCents(line.item.price) * line.quantity, 0),
      quantityOf: (itemId) => quantities.get(itemId) ?? 0,
      add,
      setQuantity,
      remove,
      clear,
      syncWithCatalog,
    }
  }, [lines, add, setQuantity, remove, clear, syncWithCatalog])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// oxlint-disable-next-line react/only-export-components -- hook lives next to its provider
export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used inside <CartProvider>')
  return context
}
