import { render, screen } from '@testing-library/react'
import PasswordStrength from './PasswordStrength'

describe('PasswordStrength', () => {
  it('renders nothing for an empty password', () => {
    const { container } = render(<PasswordStrength password="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    ['abc', 'Too weak'],
    ['abcdefgh', 'Weak'],
    ['Abcdefgh', 'Fair'],
    ['Abcdefg1', 'Good'],
    ['Abcdefg1!', 'Strong'],
  ])('rates %s as %s', (password, label) => {
    render(<PasswordStrength password={password} />)
    expect(screen.getByRole('status')).toHaveTextContent(label)
  })
})
