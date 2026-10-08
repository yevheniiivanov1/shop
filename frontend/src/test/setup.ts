import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.cookie = 'CSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT'
  vi.restoreAllMocks()
})
