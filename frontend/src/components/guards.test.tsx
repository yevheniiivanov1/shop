import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { User } from '../api/types'
import { RequireAuth } from './guards'

const auth = vi.hoisted(() => ({ user: null as User | null, loading: false }))
vi.mock('../auth/AuthContext', () => ({ useAuth: () => auth }))

const user = (role: User['role']): User => ({
  id: 1,
  email: 'a@example.com',
  first_name: 'A',
  last_name: 'B',
  role,
  created_at: '2026-10-08T00:00:00Z',
})

function LoginProbe() {
  const location = useLocation()
  return <p>login page, from {(location.state as { from: string }).from}</p>
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route element={<RequireAuth />}>
          <Route path="/orders" element={<p>orders page</p>} />
        </Route>
        <Route element={<RequireAuth admin />}>
          <Route path="/admin/users" element={<p>users page</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    auth.user = null
    auth.loading = false
  })

  it('waits while the session is being checked', () => {
    auth.loading = true
    renderAt('/orders')
    expect(screen.getByRole('status')).toHaveTextContent('Loading')
  })

  it('sends guests to the login page and remembers where they were going', () => {
    renderAt('/orders?page=2')
    expect(screen.getByText('login page, from /orders?page=2')).toBeInTheDocument()
  })

  it('lets signed-in users in', () => {
    auth.user = user('user')
    renderAt('/orders')
    expect(screen.getByText('orders page')).toBeInTheDocument()
  })

  it('keeps regular users out of admin pages', () => {
    auth.user = user('user')
    renderAt('/admin/users')
    expect(screen.getByRole('heading', { name: 'Access denied' })).toBeInTheDocument()
    expect(screen.queryByText('users page')).not.toBeInTheDocument()
  })

  it('lets admins into admin pages', () => {
    auth.user = user('admin')
    renderAt('/admin/users')
    expect(screen.getByText('users page')).toBeInTheDocument()
  })
})
