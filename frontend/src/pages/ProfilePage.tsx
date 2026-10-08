import { useState, type FormEvent } from 'react'
import { authApi, type ProfileData } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { ErrorMessage, Field, Notice } from '../components/ui'
import { formatDateTime } from '../lib/format'

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState<Required<ProfileData>>({
    first_name: user?.first_name ?? '',
    last_name: user?.last_name ?? '',
    email: user?.email ?? '',
    password: '',
    password_confirmation: '',
    current_password: '',
  })
  const [error, setError] = useState<unknown>(null)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!user) return null

  const emailChanged = form.email.trim().toLowerCase() !== user.email.toLowerCase()
  const needsCurrentPassword = emailChanged || form.password !== ''

  const update = (field: keyof ProfileData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false)
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSaved(false)
    try {
      const payload: ProfileData = { first_name: form.first_name, last_name: form.last_name, email: form.email }
      if (form.password) {
        payload.password = form.password
        payload.password_confirmation = form.password_confirmation
      }
      if (needsCurrentPassword) payload.current_password = form.current_password

      const response = await authApi.updateProfile(payload)
      setUser(response.user)
      setForm((current) => ({ ...current, password: '', password_confirmation: '', current_password: '' }))
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page--narrow">
      <h1>Personal details</h1>
      <p className="muted">
        Role: {user.role === 'admin' ? 'administrator' : 'customer'} · member since {formatDateTime(user.created_at)}
      </p>

      <form onSubmit={handleSubmit} className="form card">
        {saved && <Notice>Changes saved</Notice>}
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

        <fieldset className="fieldset">
          <legend>Change password</legend>
          <div className="form__row">
            <Field label="New password" hint="Leave blank to keep the current one">
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={form.password}
                onChange={update('password')}
              />
            </Field>
            <Field label="Confirm new password">
              <input
                className="input"
                type="password"
                autoComplete="new-password"
                value={form.password_confirmation}
                onChange={update('password_confirmation')}
                disabled={!form.password}
              />
            </Field>
          </div>
        </fieldset>

        {needsCurrentPassword && (
          <Field label="Current password" hint="Required to change your email or password">
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={form.current_password}
              onChange={update('current_password')}
            />
          </Field>
        )}

        <button className="btn btn--primary" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
      </form>
    </div>
  )
}
