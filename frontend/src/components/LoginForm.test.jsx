import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import LoginForm from './LoginForm'
import { ApiError, login } from '../services/api'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal()),
  login: vi.fn(),
}))

const user = { id: '1', name: 'Test User', email: 'test@example.com', role: 'client' }

async function fillAndSubmit(email = 'test@example.com', password = 'Passw0rd!') {
  const u = userEvent.setup()
  await u.type(screen.getByLabelText('Email'), email)
  await u.type(screen.getByLabelText('Password'), password)
  await u.click(screen.getByRole('button', { name: 'Log in' }))
  return u
}

describe('LoginForm', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the email and password fields and the submit button', () => {
    render(<LoginForm onLogin={vi.fn()} onSwitch={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled()
  })

  it('shows the notice it is given (e.g. why the user was signed out)', () => {
    render(<LoginForm onLogin={vi.fn()} onSwitch={vi.fn()} notice="Your session expired." />)
    expect(screen.getByRole('status')).toHaveTextContent('Your session expired.')
  })

  it('toggles password visibility', async () => {
    render(<LoginForm onLogin={vi.fn()} onSwitch={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
  })

  it('sends trimmed credentials and passes the user up on success', async () => {
    login.mockResolvedValue({ user })
    const onLogin = vi.fn()
    render(<LoginForm onLogin={onLogin} onSwitch={vi.fn()} />)
    await fillAndSubmit('  test@example.com  ')
    expect(login).toHaveBeenCalledWith('test@example.com', 'Passw0rd!')
    expect(onLogin).toHaveBeenCalledWith(user)
  })

  it('shows the API error and clears the password on a failed login', async () => {
    login.mockRejectedValue(new ApiError('Invalid email or password.', 401))
    const onLogin = vi.fn()
    render(<LoginForm onLogin={onLogin} onSwitch={vi.fn()} />)
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('pauses the button after the API rate-limits the user (429)', async () => {
    login.mockRejectedValue(new ApiError('Too many attempts.', 429))
    render(<LoginForm onLogin={vi.fn()} onSwitch={vi.fn()} />)
    await fillAndSubmit()
    expect(await screen.findByRole('button', { name: /Try again in \d+s/ })).toBeDisabled()
  })

  it('asks for a code when the account needs one, then signs in with it', async () => {
    login.mockResolvedValueOnce({ mfaRequired: true }).mockResolvedValueOnce({ user })
    const onLogin = vi.fn()
    render(<LoginForm onLogin={onLogin} onSwitch={vi.fn()} />)
    const u = await fillAndSubmit()
    expect(onLogin).not.toHaveBeenCalled()
    // Focus follows the user to the new field, since the password field is gone.
    expect(await screen.findByLabelText('Authentication code')).toHaveFocus()

    await u.type(await screen.findByLabelText('Authentication code'), ' 123456 ')
    await u.click(screen.getByRole('button', { name: 'Verify' }))
    expect(login).toHaveBeenLastCalledWith('test@example.com', 'Passw0rd!', '123456')
    expect(onLogin).toHaveBeenCalledWith(user)
  })

  it('stays on the code step after a wrong code, keeping the password for the next try', async () => {
    login
      .mockResolvedValueOnce({ mfaRequired: true })
      .mockRejectedValueOnce(new ApiError('Invalid authentication code.', 401))
      .mockResolvedValueOnce({ user })
    render(<LoginForm onLogin={vi.fn()} onSwitch={vi.fn()} />)
    const u = await fillAndSubmit()

    await u.type(await screen.findByLabelText('Authentication code'), '000000')
    await u.click(screen.getByRole('button', { name: 'Verify' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid authentication code.')
    expect(screen.getByLabelText('Authentication code')).toHaveValue('')

    await u.type(screen.getByLabelText('Authentication code'), '654321')
    await u.click(screen.getByRole('button', { name: 'Verify' }))
    expect(login).toHaveBeenLastCalledWith('test@example.com', 'Passw0rd!', '654321')
  })

  it('goes back to the password step and clears the password', async () => {
    login.mockResolvedValueOnce({ mfaRequired: true })
    render(<LoginForm onLogin={vi.fn()} onSwitch={vi.fn()} />)
    const u = await fillAndSubmit()
    await u.click(await screen.findByRole('button', { name: 'Back to login' }))
    expect(screen.getByLabelText('Password')).toHaveValue('')
    expect(screen.queryByLabelText('Authentication code')).not.toBeInTheDocument()
  })

  it('switches to registration', async () => {
    const onSwitch = vi.fn()
    render(<LoginForm onLogin={vi.fn()} onSwitch={onSwitch} />)
    await userEvent.click(screen.getByRole('button', { name: 'Create an account' }))
    expect(onSwitch).toHaveBeenCalled()
  })
})
