const API_URL = import.meta.env.VITE_API_URL || 'https://localhost:3443'

// The API stores the JWT in an httpOnly cookie, so the browser must be told to
// send/accept cookies on cross-origin requests. The token is never read or
// stored by frontend code.
async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new Error('Cannot reach the server. Please try again.')
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong.')
  }
  return data
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

export const getMe = () => request('/api/auth/me')
