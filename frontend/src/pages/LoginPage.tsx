import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext'
import { ErrorMessage, Field } from '../components/ui'

const DEMO_ACCOUNTS = [
  { email: 'admin@example.com', password: 'password', label: 'Admin' },
  { email: 'user@example.com', password: 'password', label: 'Customer' },
]

export function LoginPage() {
  const { signIn } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<unknown>(null)
  const [submitting, setSubmitting] = useState(false)

  // After a successful sign-in <GuestOnly> redirects back to state.from.
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-card card">
      <h1>Sign in</h1>
      <form onSubmit={handleSubmit} className="form">
        <ErrorMessage error={error} />
        <Field label="Email">
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Password">
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <button className="btn btn--primary btn--block" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="muted">
        No account yet?{' '}
        <Link to="/register" state={location.state}>
          Sign up
        </Link>
      </p>

      <div className="demo">
        <div className="demo__title">Demo accounts (password: password)</div>
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => {
              setEmail(account.email)
              setPassword(account.password)
            }}
          >
            {account.label}: {account.email}
          </button>
        ))}
      </div>
    </div>
  )
}
