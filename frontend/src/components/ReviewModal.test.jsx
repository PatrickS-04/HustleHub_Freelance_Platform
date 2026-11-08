import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import ReviewModal from './ReviewModal'

const booking = { id: 'b1', gigTitle: 'Logo design', freelancerName: 'Finn' }
const star = (n) => screen.getByRole('radio', { name: `${n} star${n > 1 ? 's' : ''}` })
const litStars = () => document.querySelectorAll('.star.on').length

describe('ReviewModal star picker', () => {
  it('previews on hover and falls back to the chosen rating on leave', async () => {
    render(<ReviewModal booking={booking} onSubmit={vi.fn()} onClose={vi.fn()} />)
    await userEvent.click(star(2))
    expect(star(2)).toHaveAttribute('aria-checked', 'true')

    await userEvent.hover(star(4))
    expect(litStars()).toBe(4)
    expect(screen.getByText('Very good')).toBeInTheDocument()

    await userEvent.unhover(star(4))
    expect(litStars()).toBe(2)
    expect(screen.getByText('Fair')).toBeInTheDocument()
  })

  it('requires a rating before submitting', async () => {
    const onSubmit = vi.fn()
    render(<ReviewModal booking={booking} onSubmit={onSubmit} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Please choose a star rating.')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits the rating and trimmed comment, then closes', async () => {
    const onSubmit = vi.fn().mockResolvedValue({})
    const onClose = vi.fn()
    render(<ReviewModal booking={booking} onSubmit={onSubmit} onClose={onClose} />)
    await userEvent.click(star(5))
    await userEvent.type(screen.getByLabelText('Comment (optional)'), '  Great work  ')
    await userEvent.click(screen.getByRole('button', { name: 'Submit review' }))
    expect(onSubmit).toHaveBeenCalledWith('b1', { rating: 5, text: 'Great work' })
    expect(onClose).toHaveBeenCalled()
  })
})
