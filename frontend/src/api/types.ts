export type Role = 'user' | 'admin'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: Role
  created_at: string
}

/** Money comes from the API as a decimal string, e.g. "1299.00". */
export type Money = string

export interface Item {
  id: number
  name: string
  description: string | null
  price: Money
}

export interface PageMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface OrderSummary {
  id: number
  amount: Money
  items_count: number
  created_at: string
}

export interface OrderLine {
  id: number
  item_id: number
  name: string
  price: Money
  quantity: number
  subtotal: Money
}

export interface Order extends OrderSummary {
  lines: OrderLine[]
}
