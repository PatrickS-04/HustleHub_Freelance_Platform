import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import Dashboard from './Dashboard'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  listGigs: vi.fn(),
  listMyGigs: vi.fn(),
  listMyBookings: vi.fn(),
  listAllBookings: vi.fn(),
  listUsers: vi.fn(),
  getUser: vi.fn(),
  deleteUser: vi.fn(),
  getIncome: vi.fn(),
  updateMe: vi.fn(),
  changePassword: vi.fn(),
  logout: vi.fn(),
}))

const makeUser = (role) => ({ id: `${role}-1`, name: `Test ${role}`, email: `${role}@example.com`, role })
const navLabels = () =>
  within(screen.getByRole('navigation', { name: 'Main' }))
    .getAllByRole('button')
    .map((b) => b.textContent)

describe('Dashboard by role', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listGigs.mockResolvedValue([])
    api.listMyGigs.mockResolvedValue([])
    api.listMyBookings.mockResolvedValue([])
    api.listUsers.mockResolvedValue([])
    api.logout.mockResolvedValue({})
  })

  it('shows a client the browse, bookings and spending tabs', async () => {
    render(<Dashboard user={makeUser('client')} onLogout={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: 'Hello, Test client' })).toBeInTheDocument()
    expect(navLabels()).toEqual(['Overview', 'Browse gigs', 'My bookings', 'Spending', 'Settings'])
    expect(api.listGigs).toHaveBeenCalled()
    expect(api.listMyBookings).toHaveBeenCalled()
    expect(api.listUsers).not.toHaveBeenCalled()
  })

  it('shows a freelancer the gigs, bookings and earnings tabs', async () => {
    render(<Dashboard user={makeUser('freelancer')} onLogout={vi.fn()} />)
    expect(await screen.findByRole('heading', { name: 'Hello, Test freelancer' })).toBeInTheDocument()
    expect(navLabels()).toEqual(['Overview', 'My gigs', 'Bookings', 'Earnings', 'Settings'])
    expect(api.listMyGigs).toHaveBeenCalled()
    expect(api.listUsers).not.toHaveBeenCalled()
  })

  it('gives an admin the users, gigs and bookings tabs, and loads gigs and bookings only when opened', async () => {
    render(<Dashboard user={makeUser('admin')} onLogout={vi.fn()} />)
    expect(await screen.findByText(/Every account on the platform/)).toBeInTheDocument()
    expect(navLabels()).toEqual(['Users', 'Gigs', 'Bookings', 'Settings'])
    expect(api.listUsers).toHaveBeenCalled()
    expect(api.listGigs).not.toHaveBeenCalled()
    expect(api.listMyGigs).not.toHaveBeenCalled()
    expect(api.listMyBookings).not.toHaveBeenCalled()
    expect(api.listAllBookings).not.toHaveBeenCalled()
  })

  it('moves between tabs when a tab is clicked', async () => {
    render(<Dashboard user={makeUser('client')} onLogout={vi.fn()} />)
    await screen.findByRole('heading', { name: 'Hello, Test client' })
    await userEvent.click(screen.getByRole('button', { name: 'My bookings' }))
    expect(screen.getByText("You haven't booked any gigs yet.")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'My bookings' })).toHaveAttribute('aria-current', 'page')
  })

  it('logs out through the API and tells the app', async () => {
    const onLogout = vi.fn()
    render(<Dashboard user={makeUser('client')} onLogout={onLogout} />)
    await screen.findByRole('heading', { name: 'Hello, Test client' })
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(api.logout).toHaveBeenCalled()
    expect(onLogout).toHaveBeenCalled()
  })
})
