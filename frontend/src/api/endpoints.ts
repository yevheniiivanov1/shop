import { api } from './client'
import type { Item, Order, OrderSummary, PageMeta, Role, User } from './types'

export interface SignUpData {
  first_name: string
  last_name: string
  email: string
  password: string
  password_confirmation: string
}

export interface ProfileData {
  first_name: string
  last_name: string
  email: string
  password?: string
  password_confirmation?: string
  current_password?: string
}

export interface AdminUserData {
  first_name: string
  last_name: string
  email: string
  role: Role
  password?: string
}

export interface ItemData {
  name: string
  description: string
  price: string
}

export interface ListQuery {
  q?: string
  page?: number
  per_page?: number
  sort?: string
}

export const authApi = {
  me: () => api.get<{ user: User | null }>('/api/me'),
  signIn: (email: string, password: string) =>
    api.post<{ user: User }>('/api/auth/sign_in', { user: { email, password } }),
  signUp: (user: SignUpData) => api.post<{ user: User }>('/api/auth/sign_up', { user }),
  signOut: () => api.delete('/api/auth/sign_out'),
  updateProfile: (user: ProfileData) => api.patch<{ user: User }>('/api/profile', { user }),
}

export const itemsApi = {
  list: (query: ListQuery, signal?: AbortSignal) =>
    api.get<{ items: Item[]; meta: PageMeta }>('/api/items', { ...query }, signal),
}

export const ordersApi = {
  list: (page: number, signal?: AbortSignal) =>
    api.get<{ orders: OrderSummary[]; meta: PageMeta }>('/api/orders', { page }, signal),
  get: (id: number) => api.get<{ order: Order }>(`/api/orders/${id}`),
  create: (items: { item_id: number; quantity: number }[]) => api.post<{ order: Order }>('/api/orders', { items }),
}

export const adminApi = {
  users: (query: ListQuery, signal?: AbortSignal) =>
    api.get<{ users: User[]; meta: PageMeta }>('/api/admin/users', { ...query }, signal),
  createUser: (user: AdminUserData) => api.post<{ user: User }>('/api/admin/users', { user }),
  updateUser: (id: number, user: AdminUserData) => api.patch<{ user: User }>(`/api/admin/users/${id}`, { user }),
  deleteUser: (id: number) => api.delete(`/api/admin/users/${id}`),

  createItem: (item: ItemData) => api.post<{ item: Item }>('/api/admin/items', { item }),
  updateItem: (id: number, item: ItemData) => api.patch<{ item: Item }>(`/api/admin/items/${id}`, { item }),
  deleteItem: (id: number) => api.delete(`/api/admin/items/${id}`),
}
