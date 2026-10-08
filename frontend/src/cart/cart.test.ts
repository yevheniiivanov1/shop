import { describe, expect, it } from 'vitest'
import type { Item } from '../api/types'
import { centsToAmount, compareWithCatalog, hasChanges, toCents, type CartLine } from './cart'

const item = (id: number, price: string, name = `Item ${id}`): Item => ({ id, name, description: null, price })

describe('money helpers', () => {
  it('converts prices to cents without floating-point drift', () => {
    expect(toCents('0.10') * 3).toBe(30)
    expect(toCents('19.99')).toBe(1999)
    expect(toCents(1234.5)).toBe(123450)
  })

  it('formats cents as an exact decimal amount', () => {
    expect(centsToAmount(0)).toBe('0.00')
    expect(centsToAmount(5)).toBe('0.05')
    expect(centsToAmount(123456)).toBe('1234.56')
  })
})

describe('compareWithCatalog', () => {
  const lines: CartLine[] = [
    { item: item(1, '10.00', 'Mouse'), quantity: 1 },
    { item: item(2, '5.00', 'Cable'), quantity: 2 },
    { item: item(3, '7.00', 'Lamp'), quantity: 1 },
  ]

  it('reports repriced and removed items among the requested ones', () => {
    const changes = compareWithCatalog(lines, [item(1, '12.00', 'Mouse'), item(2, '5.00', 'Cable')], [1, 2, 3])

    expect(changes).toEqual({ repriced: [{ name: 'Mouse', from: '10.00', to: '12.00' }], removed: ['Lamp'] })
    expect(hasChanges(changes)).toBe(true)
  })

  it('ignores items that were not requested', () => {
    const changes = compareWithCatalog(lines, [item(1, '10.00')], [1])

    expect(hasChanges(changes)).toBe(false)
  })

  it('treats "10" and "10.00" as the same price', () => {
    expect(hasChanges(compareWithCatalog(lines, [item(1, '10')], [1]))).toBe(false)
  })
})
