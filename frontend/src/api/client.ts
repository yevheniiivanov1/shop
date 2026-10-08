// Thin fetch wrapper for the Rails API.
//
// Auth is a cookie session set by Devise (HttpOnly, same origin), so there are
// no tokens to store. State-changing requests echo the CSRF-TOKEN cookie back
// in the X-CSRF-Token header, which Rails verifies.

export class ApiError extends Error {
  readonly status: number
  readonly errors: string[]
  readonly code?: string

  constructor(status: number, body: unknown) {
    const data = (body ?? {}) as { error?: string; errors?: string[]; code?: string }
    const errors = data.errors?.length ? data.errors : data.error ? [data.error] : []
    super(errors[0] ?? `Server error (${status})`)
    this.status = status
    this.errors = errors.length ? errors : [this.message]
    this.code = data.code
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'
type Query = Record<string, string | number | undefined | null>

let unauthorizedHandler: (() => void) | null = null

/** Called whenever the API answers 401, e.g. when the session has expired. */
export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

function csrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)CSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : null
}

function withQuery(path: string, query?: Query): string {
  if (!query) return path
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${path}?${qs}` : path
}

async function request<T>(
  method: Method,
  path: string,
  options: { body?: unknown; query?: Query; signal?: AbortSignal } = {},
  retried = false,
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (method !== 'GET') {
    const token = csrfToken()
    if (token) headers['X-CSRF-Token'] = token
  }

  const response = await fetch(withQuery(path, options.query), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
    signal: options.signal,
  })

  if (response.status === 204) return undefined as T
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new ApiError(response.status, data)
    // The server rotated the token (e.g. after sign-in in another tab) and sent
    // a fresh cookie with this response: retry once with it.
    if (error.code === 'invalid_csrf_token' && !retried) return request(method, path, options, true)
    if (response.status === 401) unauthorizedHandler?.()
    throw error
  }
  return data as T
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>('GET', path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  delete: <T = void>(path: string) => request<T>('DELETE', path),
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
