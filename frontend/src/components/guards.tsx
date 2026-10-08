import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { Spinner } from './ui'

/** Only for signed-in users (and only for admins when `admin` is set). */
export function RequireAuth({ admin = false }: { admin?: boolean }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (admin && user.role !== 'admin') {
    return (
      <div className="page">
        <h1>Access denied</h1>
        <p>This section is available to administrators only.</p>
      </div>
    )
  }
  return <Outlet />
}

/** Login / registration pages: signed-in users are sent back where they came from. */
export function GuestOnly() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (loading) return <Spinner />
  if (user) return <Navigate to={from} replace />
  return <Outlet />
}
