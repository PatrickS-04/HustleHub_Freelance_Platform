import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import BookingsList from './BookingsList'

const booking = {
  id: 'b1',
  transactionId: 'TX-1',
  gigTitle: 'Logo design',
  clientName: 'Cara',
  freelancerName: 'Finn',
  date: '2026-12-01',
  price: 500,
  status: 'Pending',
}

const renderAs = (role, onStatus) =>
  render(<BookingsList bookings={[booking]} role={role} onStatus={onStatus} onReview={vi.fn()} />)

describe('BookingsList status actions', () => {
  it('applies an action without confirmation straight away', async () => {
    const onStatus = vi.fn().mockResolvedValue({})
    renderAs('freelancer', onStatus)
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(onStatus).toHaveBeenCalledWith('b1', 'Accepted')
    expect(await screen.findByText('TX-1 accepted.')).toBeInTheDocument()
  })

  it('asks first for a confirmed action, then applies it', async () => {
    const onStatus = vi.fn().mockResolvedValue({})
    renderAs('client', onStatus)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onStatus).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('alertdialog').querySelector('.btn-danger'))
    expect(onStatus).toHaveBeenCalledWith('b1', 'Cancelled')
    expect(await screen.findByText('TX-1 cancelled.')).toBeInTheDocument()
  })

  it('shows the API reason when the change is rejected', async () => {
    const onStatus = vi.fn().mockRejectedValue(new Error('This booking was already cancelled.'))
    renderAs('freelancer', onStatus)
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(await screen.findByText('This booking was already cancelled.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Accept' })).toBeEnabled()
  })
})
