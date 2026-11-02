import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import RegisterForm from './RegisterForm'
import { ApiError, register } from '../services/api'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal()),
  register: vi.fn(),
}))

async function fill({ name = 'Jane Doe', email = 'jane@example.com', password = 'Passw0rd1' } = {}) {
  const u = userEvent.setup()
  await u.type(screen.getByLabelText('Full name'), name)
  await u.type(screen.getByLabelText('Email'), email)
  await u.type(screen.getByLabelText('Password'), password)
  await u.click(screen.getByRole('button', { name: 'Create account' }))
}

describe('RegisterForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the registration fields', () => {
    render(<RegisterForm onRegister={vi.fn()} onSwitch={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('rejects a weak password without calling the API', async () => {
    render(<RegisterForm onRegister={vi.fn()} onSwitch={vi.fn()} />)
    await fill({ password: 'weak' })
    expect(await screen.findByRole('alert')).toHaveTextContent(/Password must be 8-72 characters/)
    expect(register).not.toHaveBeenCalled()
  })

  it('rejects an invalid email without calling the API', async () => {
    render(<RegisterForm onRegister={vi.fn()} onSwitch={vi.fn()} />)
    await fill({ email: 'not-an-email' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.')
    expect(register).not.toHaveBeenCalled()
  })

  it('rejects a name containing script characters', async () => {
    render(<RegisterForm onRegister={vi.fn()} onSwitch={vi.fn()} />)
    await fill({ name: '<script>alert(1)</script>' })
    expect(await screen.findByRole('alert')).toHaveTextContent('Name must be 2-50 letters.')
    expect(register).not.toHaveBeenCalled()
  })

  it('registers a valid user as a client by default', async () => {
    const created = { id: '1', name: 'Jane Doe', role: 'client' }
    register.mockResolvedValue({ user: created })
    const onRegister = vi.fn()
    render(<RegisterForm onRegister={onRegister} onSwitch={vi.fn()} />)
    await fill()
    expect(register).toHaveBeenCalledWith('Jane Doe', 'jane@example.com', 'Passw0rd1', 'client')
    expect(onRegister).toHaveBeenCalledWith(created)
  })

  it('shows the API error when the email is already taken', async () => {
    register.mockRejectedValue(new ApiError('An account with this email already exists.', 409))
    render(<RegisterForm onRegister={vi.fn()} onSwitch={vi.fn()} />)
    await fill()
    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists.')
  })
})
