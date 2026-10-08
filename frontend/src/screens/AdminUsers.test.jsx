import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import AdminUsers from './AdminUsers'
import * as api from '../services/api'

vi.mock('../services/api', () => ({
  listUsers: vi.fn(),
  getUser: vi.fn(),
  deleteUser: vi.fn(),
}))

const me = { id: 'a1', name: 'Ada Admin', role: 'admin' }
const users = [
  { id: 'a1', name: 'Ada Admin', email: 'ada@example.com', role: 'admin', createdAt: '2026-01-05T10:00:00Z' },
  { id: 'c1', name: 'Carl Client', email: 'carl@example.com', role: 'client', createdAt: '2026-02-10T10:00:00Z' },
  { id: 'f1', name: 'Fay Freelancer', email: 'fay@example.com', role: 'freelancer', createdAt: '2026-03-15T10:00:00Z' },
]
const detail = (u) => ({ ...u, gigs: 3, bookingsMade: 0, bookingsReceived: 7 })

const rows = () => screen.getAllByRole('listitem')

describe('AdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listUsers.mockResolvedValue(users)
    api.getUser.mockImplementation((id) => Promise.resolve(detail(users.find((u) => u.id === id))))
    api.deleteUser.mockResolvedValue({ message: 'User deleted.' })
  })

  it('lists every user with name, email and role', async () => {
    render(<AdminUsers me={me} />)
    expect(await screen.findByText('Carl Client')).toBeInTheDocument()
    expect(rows()).toHaveLength(3)
    expect(screen.getByText('fay@example.com')).toBeInTheDocument()
    expect(screen.getByText('You')).toBeInTheDocument()
  })

  it('filters by role using the chips', async () => {
    render(<AdminUsers me={me} />)
    await screen.findByText('Carl Client')
    await userEvent.click(screen.getByRole('tab', { name: /Freelancers/ }))
    expect(rows()).toHaveLength(1)
    expect(screen.getByText('Fay Freelancer')).toBeInTheDocument()
    expect(screen.queryByText('Carl Client')).not.toBeInTheDocument()
  })

  it('filters by name or email using the search box', async () => {
    render(<AdminUsers me={me} />)
    await screen.findByText('Carl Client')
    await userEvent.type(screen.getByLabelText('Search users'), 'carl@')
    expect(rows()).toHaveLength(1)
    expect(screen.getByText('Carl Client')).toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Search users'))
    await userEvent.type(screen.getByLabelText('Search users'), 'nobody')
    expect(screen.getByText('No users match.')).toBeInTheDocument()
  })

  it('shows the API error when the list cannot be loaded', async () => {
    api.listUsers.mockRejectedValue(new Error('Insufficient permissions.'))
    render(<AdminUsers me={me} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Insufficient permissions.')
  })

  it('opens a user detail page and goes back', async () => {
    render(<AdminUsers me={me} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View details for Fay Freelancer' }))
    expect(await screen.findByRole('heading', { name: 'User details' })).toBeInTheDocument()
    expect(api.getUser).toHaveBeenCalledWith('f1')
    expect(screen.getByText('Gigs listed')).toBeInTheDocument()
    expect(screen.getByText('Bookings received')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Back to users' }))
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
  })

  it('deletes a user only after confirmation and removes them from the list', async () => {
    render(<AdminUsers me={me} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View details for Carl Client' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete user' }))

    // Nothing is deleted until the dialog is confirmed.
    const dialog = screen.getByRole('alertdialog')
    expect(api.deleteUser).not.toHaveBeenCalled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete user' }))

    expect(api.deleteUser).toHaveBeenCalledWith('c1')
    expect(await screen.findByText('Carl Client was deleted.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View details for Carl Client' })).not.toBeInTheDocument()
    expect(rows()).toHaveLength(2)
  })

  it('keeps the user when the delete is cancelled', async () => {
    render(<AdminUsers me={me} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View details for Carl Client' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete user' }))
    await userEvent.click(screen.getByRole('button', { name: 'Keep it' }))
    expect(api.deleteUser).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it("shows the API's reason when a delete is refused", async () => {
    api.deleteUser.mockRejectedValue(new Error('User not found.'))
    render(<AdminUsers me={me} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View details for Carl Client' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Delete user' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete user' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('User not found.')
    expect(screen.getByRole('heading', { name: 'User details' })).toBeInTheDocument()
  })

  it("does not offer to delete the admin's own account", async () => {
    render(<AdminUsers me={me} />)
    await userEvent.click(await screen.findByRole('button', { name: 'View details for Ada Admin' }))
    expect(await screen.findByText('You cannot delete the account you are signed in with.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete user' })).not.toBeInTheDocument()
  })
})
