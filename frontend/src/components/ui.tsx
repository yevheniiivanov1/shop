import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ApiError } from '../api/client'
import type { PageMeta } from '../api/types'
import { MAX_QUANTITY } from '../cart/cart'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="spinner" role="status">
      <span className="spinner__dot" aria-hidden="true" />
      {label}
    </div>
  )
}

/** Shows an error (string, Error or ApiError with several messages). */
export function ErrorMessage({ error }: { error: unknown }) {
  if (!error) return null
  const messages =
    error instanceof ApiError ? error.errors : [error instanceof Error ? error.message : String(error)]
  return (
    <div className="alert alert--error" role="alert">
      {messages.length === 1 ? (
        messages[0]
      ) : (
        <ul>
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert--success" role="status">
      {children}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}

export function Pagination({ meta, onChange }: { meta: PageMeta | undefined; onChange: (page: number) => void }) {
  if (!meta || meta.total_pages <= 1) return null
  return (
    <nav className="pagination" aria-label="Pages">
      <button className="btn btn--ghost" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
        ← Previous
      </button>
      <span>
        {meta.page} of {meta.total_pages}
      </span>
      <button
        className="btn btn--ghost"
        disabled={meta.page >= meta.total_pages}
        onClick={() => onChange(meta.page + 1)}
      >
        Next →
      </button>
    </nav>
  )
}

export function QuantityInput({
  value,
  onChange,
  min = 1,
  label = 'Quantity',
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  label?: string
}) {
  // The text is kept separately so the field can be cleared while typing a new number;
  // it follows `value` when that changes from outside (the +/- buttons, the cart).
  const [draft, setDraft] = useState(String(value))
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(String(value))
  }

  const set = (next: number) => onChange(Math.min(MAX_QUANTITY, Math.max(min, next)))
  return (
    <div className="qty">
      <button type="button" className="qty__btn" onClick={() => set(value - 1)} disabled={value <= min} aria-label="Decrease">
        −
      </button>
      <input
        className="qty__input"
        type="number"
        inputMode="numeric"
        min={min}
        max={MAX_QUANTITY}
        value={draft}
        aria-label={label}
        onChange={(event) => {
          setDraft(event.target.value)
          const next = Number(event.target.value)
          if (event.target.value !== '' && Number.isInteger(next)) set(next)
        }}
        onBlur={() => setDraft(String(value))}
      />
      <button
        type="button"
        className="qty__btn"
        onClick={() => set(value + 1)}
        disabled={value >= MAX_QUANTITY}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

/** Native <dialog>: focus trap, Esc to close and a backdrop for free. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <header className="modal__header">
        <h2>{title}</h2>
        <button type="button" className="btn btn--ghost btn--icon" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>
      {children}
    </dialog>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </label>
  )
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      className="input search"
      type="search"
      value={value}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
