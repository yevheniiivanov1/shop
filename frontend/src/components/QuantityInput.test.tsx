import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { MAX_QUANTITY } from '../cart/cart'
import { QuantityInput } from './ui'

function Harness({ initial = 1 }: { initial?: number }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <QuantityInput value={value} onChange={setValue} />
      <output>{value}</output>
    </>
  )
}

describe('QuantityInput', () => {
  it('steps with the buttons within bounds', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByRole('button', { name: 'Decrease' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Increase' }))
    expect(screen.getByRole('status')).toHaveTextContent('2')
  })

  it('can be cleared while typing a new number', async () => {
    const user = userEvent.setup()
    render(<Harness initial={3} />)
    const input = screen.getByRole('spinbutton', { name: 'Quantity' })

    await user.clear(input)
    expect(input).toHaveValue(null)
    await user.type(input, '15')

    expect(input).toHaveValue(15)
    expect(screen.getByRole('status')).toHaveTextContent('15')
  })

  it('restores the current value on blur after invalid input and caps large numbers', async () => {
    const user = userEvent.setup()
    render(<Harness initial={4} />)
    const input = screen.getByRole('spinbutton', { name: 'Quantity' })

    await user.clear(input)
    await user.tab()
    expect(input).toHaveValue(4)

    await user.clear(input)
    await user.type(input, String(MAX_QUANTITY * 10))
    expect(screen.getByRole('status')).toHaveTextContent(String(MAX_QUANTITY))
  })
})
