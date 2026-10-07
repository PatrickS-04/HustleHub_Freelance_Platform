const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3443'

// Carries the HTTP status so screens can react (e.g. cool down on 429).
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Called when an authenticated request comes back 401 (session expired or
// revoked), so the app can sign the user out with a clear message. Login,
// register and the startup "who am I" check are excluded: a 401 there just
// means "not logged in" / "bad credentials".
let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn
}
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/api/auth/me']

// The API's own 4xx messages are written to be shown to users. Anything else
// (5xx, unexpected shapes) gets a generic message so server internals such as
// stack traces or error text never reach the screen.
const SERVER_ERROR = 'Something went wrong on our side. Please try again.'
const RATE_LIMITED = 'Too many attempts. Please wait a moment and try again.'

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new ApiError('Cannot reach the server. Please try again.', 0)
  }

  const data = await res.json().catch(() => ({}))
  if (res.ok) return data

  if (res.status === 401 && !PUBLIC_PATHS.includes(path)) onUnauthorized?.()

  let message
  if (res.status === 429) message = RATE_LIMITED
  else if (res.status >= 500) message = SERVER_ERROR
  else message = typeof data.error === 'string' ? data.error : 'Something went wrong.'
  throw new ApiError(message, res.status)
}

export const login = (email, password) =>
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

export const register = (name, email, password, role) =>
  request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  })

export const logout = () => request('/api/auth/logout', { method: 'POST' })

export const getMe = () => request('/api/auth/me')
