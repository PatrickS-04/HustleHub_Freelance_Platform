// Mirrors the server's rule (8-128 chars with upper, lower and a number).
export function passwordProblem(password) {
  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return 'Password must be 8-128 characters with an uppercase letter, a lowercase letter and a number.'
  }
  return ''
}
