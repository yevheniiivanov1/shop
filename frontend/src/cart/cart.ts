// Pure cart logic: kept out of CartContext.tsx so React Fast Refresh works there.
import type { Item, Money } from '../api/types'

export const MAX_QUANTITY = 1000
/** The API refreshes at most this many items at once (and an order has at most this many lines). */
export const MAX_LINES = 100

export interface CartLine {
  item: Item
  quantity: number
}

/** What changed when the cart was compared with the catalog. */
export interface CartChanges {
  repriced: { name: string; from: Money; to: Money }[]
  /** Names of items that are no longer sold. */
  removed: string[]
}

export function toCents(price: Money | number): number {
  return Math.round(Number(price) * 100)
}

/** 12345 -> "123.45", exactly (no floating-point arithmetic). */
export function centsToAmount(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`
}

/** Compares the cart with current catalog data for the requested items. */
export function compareWithCatalog(lines: CartLine[], current: Item[], requestedIds: number[]): CartChanges {
  const fresh = new Map(current.map((item) => [item.id, item]))
  const requested = new Set(requestedIds)
  const changes: CartChanges = { repriced: [], removed: [] }

  for (const { item } of lines) {
    if (!requested.has(item.id)) continue
    const now = fresh.get(item.id)
    if (!now) changes.removed.push(item.name)
    else if (toCents(now.price) !== toCents(item.price)) changes.repriced.push({ name: now.name, from: item.price, to: now.price })
  }
  return changes
}

export function hasChanges(changes: CartChanges | null): changes is CartChanges {
  return !!changes && (changes.repriced.length > 0 || changes.removed.length > 0)
}
