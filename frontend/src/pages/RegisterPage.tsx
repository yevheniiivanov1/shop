import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import type { SignUpData } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { ErrorMessage, Field } from '../components/ui'

export function RegisterPage() {
  const { signUp } = useAuth()
  const location = useLocation()
  const [form, setForm] = useState<SignUpData>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field: keyof SignUpData) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [field]: event.target.value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signUp(form)
    } catch (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-card card">
      <h1>Sign up</h1>
      <form onSubmit={handleSubmit} className="form">
        <ErrorMessage error={error} />
        <div className="form__row">
          <Field label="First name">
            <input className="input" autoComplete="given-name" required value={form.first_name} onChange={update('first_name')} />
          </Field>
          <Field label="Last name">
            <input className="input" autoComplete="family-name" required value={form.last_name} onChange={update('last_name')} />
          </Field>
        </div>
        <Field label="Email">
          <input className="input" type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
        </Field>
        <Field label="Password" hint="At least 6 characters">
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={form.password}
            onChange={update('password')}
          />
        </Field>
        <Field label="Confirm password">
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            required
            value={form.password_confirmation}
            onChange={update('password_confirmation')}
          />
        </Field>
        <button className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Creating your account…' : 'Sign up'}
        </button>
      </form>
      <p className="muted">
        Already have an account?{' '}
        <Link to="/login" state={location.state}>
          Sign in
        </Link>
      </p>
    </div>
  )
}
