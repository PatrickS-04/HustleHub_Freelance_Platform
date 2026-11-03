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

// `code` is only sent once the API has answered with { mfaRequired: true }.
export const login = (email, password, code) =>
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, code }),
  })

export const register = (name, email, password, role) =>
  request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  })

export const logout = () => request('/api/auth/logout', { method: 'POST' })

export const getMe = () => request('/api/auth/me')

const send = (method, body) => ({ method, body: JSON.stringify(body) })

// Only the display name can be changed; the API ignores anything else.
export const updateMe = (name) => request('/api/auth/me', send('PATCH', { name })).then((d) => d.user)

// The API replaces the auth cookie, so this session stays signed in while every
// other session is signed out.
export const changePassword = (currentPassword, newPassword) =>
  request('/api/auth/password', send('PATCH', { currentPassword, newPassword }))

// ---- Two-factor authentication ----
// Enable and disable replace the auth cookie, signing out every other session.
export const mfaSetup = (password) => request('/api/auth/mfa/setup', send('POST', { password }))
export const mfaEnable = (code) => request('/api/auth/mfa/enable', send('POST', { code }))
export const mfaDisable = (password, code) =>
  request('/api/auth/mfa/disable', send('POST', { password, code }))

// ---- Gigs ----
// The owner is never sent: the API takes it from the JWT.
export const listGigs = () => request('/api/gigs').then((d) => d.gigs)
export const listMyGigs = () => request('/api/gigs/mine').then((d) => d.gigs)
export const createGig = (fields) => request('/api/gigs', send('POST', fields)).then((d) => d.gig)
export const updateGig = (id, patch) =>
  request(`/api/gigs/${encodeURIComponent(id)}`, send('PATCH', patch)).then((d) => d.gig)
export const deleteGig = (id) =>
  request(`/api/gigs/${encodeURIComponent(id)}`, { method: 'DELETE' })

// ---- Bookings ----
// Only the gig, date and note are sent; price and parties come from the database.
export const listMyBookings = () => request('/api/bookings/mine').then((d) => d.bookings)
// Admin only: every booking on the platform.
export const listAllBookings = () => request('/api/bookings').then((d) => d.bookings)
export const createBooking = (gigId, date, note) =>
  request('/api/bookings', send('POST', { gigId, date, note })).then((d) => d.booking)
export const updateBookingStatus = (id, status) =>
  request(`/api/bookings/${encodeURIComponent(id)}/status`, send('PATCH', { status })).then((d) => d.booking)
export const reviewBooking = (id, rating, text) =>
  request(`/api/bookings/${encodeURIComponent(id)}/review`, send('POST', { rating, text })).then((d) => d.booking)

// ---- Users (admin only) ----
export const listUsers = () => request('/api/users').then((d) => d.users)
export const getUser = (id) => request(`/api/users/${encodeURIComponent(id)}`).then((d) => d.user)
export const deleteUser = (id) =>
  request(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' })

// ---- Income (freelancers) ----
export const getIncome = () => request('/api/income')
