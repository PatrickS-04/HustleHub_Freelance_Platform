import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import MfaPanel from './MfaPanel'
import { ApiError, mfaDisable, mfaEnable, mfaSetup } from '../services/api'

vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal()),
  mfaSetup: vi.fn(),
  mfaEnable: vi.fn(),
  mfaDisable: vi.fn(),
}))

const SETUP = { secret: 'ABCDEFGH', qrCode: 'data:image/gif;base64,AAAA' }

async function startSetup(onChange = vi.fn()) {
  mfaSetup.mockResolvedValue(SETUP)
  render(<MfaPanel enabled={false} onChange={onChange} />)
  const u = userEvent.setup()
  await u.type(screen.getByLabelText('Password'), 'Passw0rd!')
  await u.click(screen.getByRole('button', { name: 'Set up' }))
  await screen.findByAltText(/QR code/)
  return u
}

describe('MfaPanel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tells an admin that admin features are locked until it is on', () => {
    render(<MfaPanel enabled={false} isAdmin onChange={vi.fn()} />)
    expect(screen.getByText(/Admin features stay locked/)).toBeInTheDocument()
  })

  it('shows the QR code and key after the password is accepted', async () => {
    await startSetup()
    expect(mfaSetup).toHaveBeenCalledWith('Passw0rd!')
    expect(screen.getByAltText(/QR code/)).toHaveAttribute('src', SETUP.qrCode)
    expect(screen.getByText(SETUP.secret)).toBeInTheDocument()
  })

  it('shows the API error when the password is wrong, and clears it', async () => {
    mfaSetup.mockRejectedValue(new ApiError('Password is incorrect.', 400))
    render(<MfaPanel enabled={false} onChange={vi.fn()} />)
    await userEvent.type(screen.getByLabelText('Password'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'Set up' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Password is incorrect.')
    expect(screen.getByLabelText('Password')).toHaveValue('')
  })

  it('shows the recovery codes once a code is confirmed, then lets them be dismissed', async () => {
    const onChange = vi.fn()
    mfaEnable.mockResolvedValue({ recoveryCodes: ['aaaaa-bbbbb', 'ccccc-ddddd'] })
    const u = await startSetup(onChange)

    await u.type(screen.getByLabelText('6-digit code'), '123456')
    await u.click(screen.getByRole('button', { name: 'Turn on' }))

    expect(await screen.findByText('aaaaa-bbbbb')).toBeInTheDocument()
    expect(mfaEnable).toHaveBeenCalledWith('123456')
    expect(onChange).toHaveBeenCalledWith(true)

    await u.click(screen.getByRole('button', { name: "I've saved them" }))
    expect(screen.queryByText('aaaaa-bbbbb')).not.toBeInTheDocument()
  })

  it('stays on the QR code after a wrong code', async () => {
    mfaEnable.mockRejectedValue(new ApiError("That code didn't match.", 400))
    const onChange = vi.fn()
    const u = await startSetup(onChange)

    await u.type(screen.getByLabelText('6-digit code'), '000000')
    await u.click(screen.getByRole('button', { name: 'Turn on' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("That code didn't match.")
    expect(screen.getByAltText(/QR code/)).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('turns off with the password and a code', async () => {
    const onChange = vi.fn()
    mfaDisable.mockResolvedValue({})
    render(<MfaPanel enabled onChange={onChange} />)
    const u = userEvent.setup()
    await u.type(screen.getByLabelText('Password'), 'Passw0rd!')
    await u.type(screen.getByLabelText('Authentication or recovery code'), '123456')
    await u.click(screen.getByRole('button', { name: 'Turn off' }))
    expect(mfaDisable).toHaveBeenCalledWith('Passw0rd!', '123456')
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
