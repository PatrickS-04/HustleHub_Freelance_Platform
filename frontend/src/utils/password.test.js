import { passwordProblem } from './password'

describe('passwordProblem', () => {
  it('accepts a password that meets the rule', () => {
    expect(passwordProblem('Passw0rdOk')).toBe('')
  })

  it.each([
    ['too short', 'Pa1'],
    ['missing an uppercase letter', 'password1'],
    ['missing a lowercase letter', 'PASSWORD1'],
    ['missing a number', 'Passwordd'],
    ['too long', 'Aa1' + 'x'.repeat(70)],
    ['over 72 bytes but not 72 characters', 'Aa1' + 'é'.repeat(35)],
  ])('rejects a password that is %s', (_, password) => {
    expect(passwordProblem(password)).toMatch(/Password must be 8-72 characters/)
  })

  it('accepts a password of exactly 72 bytes', () => {
    expect(passwordProblem('Aa1' + 'x'.repeat(69))).toBe('')
  })
})
