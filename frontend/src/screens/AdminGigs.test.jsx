import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import AdminGigs from './AdminGigs'
import AdminBookings from './AdminBookings'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  listGigs: vi.fn(),
  deleteGig: vi.fn(),
  listAllBookings: vi.fn(),
}))

const gigs = [
  { id: 'g1', title: 'Logo design', description: 'A clean logo for your brand.', category: 'Design', price: 500, deliveryDays: 3, freelancerName: 'Fay Freelancer' },
  { id: 'g2', title: 'Landing page', description: 'A fast one-page website.', category: 'Web Development', price: 2000, deliveryDays: 7, freelancerName: 'Finn Freelancer' },
]

describe('AdminGigs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listGigs.mockResolvedValue(gigs)
    api.deleteGig.mockResolvedValue({ message: 'Gig deleted.' })
  })

  it('removes a gig only after confirmation', async () => {
    render(<AdminGigs />)
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Logo design' }))
    expect(api.deleteGig).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Remove gig' }))
    expect(api.deleteGig).toHaveBeenCalledWith('g1')
    expect(screen.queryByText('Logo design')).not.toBeInTheDocument()
    expect(screen.getByText('Landing page')).toBeInTheDocument()
  })

  it("keeps the gig and shows the API's reason when the removal is refused", async () => {
    api.deleteGig.mockRejectedValue(new Error('Insufficient permissions.'))
    render(<AdminGigs />)
    await userEvent.click(await screen.findByRole('button', { name: 'Remove Logo design' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove gig' }))
    expect(await screen.findByText('Insufficient permissions.')).toBeInTheDocument()
    expect(screen.getByText('Logo design')).toBeInTheDocument()
  })
})

describe('AdminBookings', () => {
  it('lists every booking with both parties and offers no status actions', async () => {
    api.listAllBookings.mockResolvedValue([
      { id: 'b1', transactionId: 'TX-AAAA1111', gigId: 'g1', gigTitle: 'Logo design', price: 500, clientName: 'Carl Client', freelancerName: 'Fay Freelancer', date: '2026-11-02', note: '', status: 'Pending' },
    ])
    render(<AdminBookings />)
    expect(await screen.findByText('Logo design')).toBeInTheDocument()
    expect(screen.getByText('Carl Client → Fay Freelancer')).toBeInTheDocument()
    expect(screen.getByText('TX-AAAA1111')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Accept|Decline|Cancel|Review/ })).not.toBeInTheDocument()
  })
})
