// Mirrors the server's rule (8-72 chars with upper, lower and a number). The
// limit is 72 bytes because bcrypt ignores anything after that.
export function passwordProblem(password) {
  if (
    password.length < 8 ||
    new TextEncoder().encode(password).length > 72 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    return 'Password must be 8-72 characters with an uppercase letter, a lowercase letter and a number.'
  }
  return ''
}
