const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

const dateTime = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' })

export function formatMoney(value: string | number): string {
  return money.format(Number(value))
}

export function formatDateTime(value: string): string {
  return dateTime.format(new Date(value))
}

/** pluralize(1, 'item') -> '1 item', pluralize(3, 'item') -> '3 items' */
export function pluralize(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`
}
