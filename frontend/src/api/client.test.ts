import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, onUnauthorized } from './client'

function respond(status: number, body?: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => {
      if (body === undefined) throw new SyntaxError('no body')
      return body
    },
  }
}

function mockFetch(...responses: ReturnType<typeof respond>[]) {
  const fetch = vi.fn()
  for (const response of responses) fetch.mockResolvedValueOnce(response)
  vi.stubGlobal('fetch', fetch)
  return fetch
}

afterEach(() => {
  vi.unstubAllGlobals()
  onUnauthorized(null)
})

describe('api client', () => {
  it('builds query strings without empty values', async () => {
    const fetch = mockFetch(respond(200, { ok: true }))

    await api.get('/api/items', { q: 'usb c', page: 2, sort: '', ids: undefined })

    expect(fetch.mock.calls[0][0]).toBe('/api/items?q=usb+c&page=2')
  })

  it('sends the CSRF token from the cookie on writes, not on reads', async () => {
    document.cookie = 'CSRF-TOKEN=abc%2B%2F1'
    const fetch = mockFetch(respond(200, {}), respond(200, {}))

    await api.get('/api/me')
    await api.post('/api/orders', { items: [] })

    expect(fetch.mock.calls[0][1].headers['X-CSRF-Token']).toBeUndefined()
    expect(fetch.mock.calls[1][1].headers['X-CSRF-Token']).toBe('abc+/1')
    expect(fetch.mock.calls[1][1].body).toBe('{"items":[]}')
  })

  it('retries once when the CSRF token was rotated', async () => {
    const fetch = mockFetch(
      respond(422, { error: 'expired', code: 'invalid_csrf_token' }),
      respond(201, { order: { id: 1 } }),
    )

    await expect(api.post('/api/orders', {})).resolves.toEqual({ order: { id: 1 } })
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('turns error bodies into ApiError and reports 401s', async () => {
    const unauthorized = vi.fn()
    onUnauthorized(unauthorized)
    mockFetch(respond(422, { error: 'Bad', errors: ['Bad', 'Worse'], code: 'x' }), respond(401, { error: 'Sign in' }))

    const invalid = await api.post('/api/items').catch((error: unknown) => error)
    expect(invalid).toBeInstanceOf(ApiError)
    expect(invalid).toMatchObject({ status: 422, message: 'Bad', errors: ['Bad', 'Worse'], code: 'x' })
    expect(unauthorized).not.toHaveBeenCalled()

    await expect(api.get('/api/orders')).rejects.toMatchObject({ status: 401, message: 'Sign in' })
    expect(unauthorized).toHaveBeenCalledOnce()
  })

  it('returns undefined for 204 and has a fallback message for bodiless errors', async () => {
    mockFetch(respond(204), respond(500))

    await expect(api.delete('/api/auth/sign_out')).resolves.toBeUndefined()
    await expect(api.get('/api/items')).rejects.toMatchObject({ message: 'Server error (500)' })
  })
})
