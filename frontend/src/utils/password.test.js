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
    ['too long', 'Aa1' + 'x'.repeat(126)],
  ])('rejects a password that is %s', (_, password) => {
    expect(passwordProblem(password)).toMatch(/Password must be 8-128 characters/)
  })
})
