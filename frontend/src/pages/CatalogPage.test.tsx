import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { itemsApi } from '../api/endpoints'
import { CartProvider } from '../cart/CartContext'
import { CatalogPage } from './CatalogPage'

vi.mock('../api/endpoints', () => ({ itemsApi: { list: vi.fn() } }))

function SearchProbe() {
  return <p data-testid="search">{useLocation().search}</p>
}

function renderCatalog(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <CartProvider>
        <Link to="/">Catalog</Link>
        <Routes>
          <Route path="/" element={<CatalogPage />} />
        </Routes>
        <SearchProbe />
      </CartProvider>
    </MemoryRouter>,
  )
}

const afterDebounce = () => new Promise((resolve) => setTimeout(resolve, 400))

describe('CatalogPage search', () => {
  beforeEach(() => {
    vi.mocked(itemsApi.list).mockResolvedValue({
      items: [],
      meta: { page: 1, per_page: 12, total: 0, total_pages: 0 },
    })
  })

  it('puts the query into the URL after typing stops, keeping a trailing space in the box', async () => {
    const user = userEvent.setup()
    renderCatalog('/')
    const box = screen.getByRole('searchbox')

    await user.type(box, 'sony ')
    await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('?q=sony'))
    await afterDebounce()

    expect(box).toHaveValue('sony ')
    expect(vi.mocked(itemsApi.list)).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'sony' }), expect.anything())
  })

  it('is reset by navigating to the catalog without a query', async () => {
    const user = userEvent.setup()
    renderCatalog('/?q=mouse')
    expect(screen.getByRole('searchbox')).toHaveValue('mouse')

    await user.click(screen.getByRole('link', { name: 'Catalog' }))
    await afterDebounce()

    expect(screen.getByRole('searchbox')).toHaveValue('')
    expect(screen.getByTestId('search')).toHaveTextContent(/^$/)
  })
})
