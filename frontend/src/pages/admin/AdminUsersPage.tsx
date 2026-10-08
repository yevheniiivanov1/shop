import { useState, type FormEvent } from 'react'
import { adminApi, type AdminUserData } from '../../api/endpoints'
import type { User } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { EmptyState, ErrorMessage, Field, Modal, Pagination, SearchInput, Spinner } from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import { useDebounce } from '../../lib/useDebounce'
import { useFetch } from '../../lib/useFetch'

type Editing = { mode: 'create' } | { mode: 'edit'; user: User } | null

export function AdminUsersPage() {
  const { user: currentUser, setUser: setCurrentUser } = useAuth()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const q = useDebounce(search.trim())
  const [editing, setEditing] = useState<Editing>(null)
  const [actionError, setActionError] = useState<unknown>(null)

  const { data, loading, error, reload } = useFetch((signal) => adminApi.users({ q, page }, signal), [q, page])

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user ${user.email}?`)) return
    setActionError(null)
    try {
      await adminApi.deleteUser(user.id)
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Users</h1>
        <button className="btn btn--primary" onClick={() => setEditing({ mode: 'create' })}>
          Add user
        </button>
      </div>

      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Search by name or email"
        />
      </div>

      <ErrorMessage error={error ?? actionError} />
      {!data && loading && <Spinner />}
      {data && data.users.length === 0 && <EmptyState>No users found</EmptyState>}

      {data && data.users.length > 0 && (
        <div className={loading ? 'table-wrap card is-loading' : 'table-wrap card'}>
          <table className="table">
            <thead>
              <tr>
                <th className="num">ID</th>
                <th>First name</th>
                <th>Last name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id}>
                  <td data-label="ID" className="num">
                    {user.id}
                  </td>
                  <td data-label="First name">{user.first_name}</td>
                  <td data-label="Last name">{user.last_name}</td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Role">
                    <span className={user.role === 'admin' ? 'tag tag--admin' : 'tag'}>{user.role}</span>
                  </td>
                  <td data-label="Created">{formatDateTime(user.created_at)}</td>
                  <td className="actions">
                    <button className="btn btn--ghost btn--small" onClick={() => setEditing({ mode: 'edit', user })}>
                      Edit
                    </button>
                    <button
                      className="btn btn--ghost btn--danger btn--small"
                      onClick={() => handleDelete(user)}
                      disabled={user.id === currentUser?.id}
                      title={user.id === currentUser?.id ? "You can't delete yourself" : undefined}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination meta={data?.meta} onChange={setPage} />

      {editing && (
        <UserForm
          user={editing.mode === 'edit' ? editing.user : null}
          isSelf={editing.mode === 'edit' && editing.user.id === currentUser?.id}
          onClose={() => setEditing(null)}
          onSaved={(saved) => {
            if (saved.id === currentUser?.id) setCurrentUser(saved)
            setEditing(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

function UserForm({
  user,
  isSelf,
  onClose,
  onSaved,
}: {
  user: User | null
  isSelf: boolean
  onClose: () => void
  onSaved: (user: User) => void
}) {
  const [form, setForm] = useState<AdminUserData>({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'user',
    password: '',
  })
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  const update =
    (field: keyof AdminUserData) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [field]: event.target.value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const response = user ? await adminApi.updateUser(user.id, form) : await adminApi.createUser(form)
      onSaved(response.user)
    } catch (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  return (
    <Modal title={user ? `User #${user.id}` : 'New user'} onClose={onClose}>
      <form className="form" onSubmit={handleSubmit}>
        <ErrorMessage error={error} />
        <div className="form__row">
          <Field label="First name">
            <input className="input" required value={form.first_name} onChange={update('first_name')} />
          </Field>
          <Field label="Last name">
            <input className="input" required value={form.last_name} onChange={update('last_name')} />
          </Field>
        </div>
        <Field label="Email">
          <input className="input" type="email" required value={form.email} onChange={update('email')} />
        </Field>
        <Field label="Role" hint={isSelf ? "You can't remove your own admin role" : undefined}>
          <select className="input select" value={form.role} onChange={update('role')} disabled={isSelf}>
            <option value="user">user (customer)</option>
            <option value="admin">admin (administrator)</option>
          </select>
        </Field>
        <Field label={user ? 'New password' : 'Password'} hint={user ? 'Leave blank to keep the current one' : 'At least 6 characters'}>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required={!user}
            minLength={6}
            value={form.password}
            onChange={update('password')}
          />
        </Field>
        <div className="form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
