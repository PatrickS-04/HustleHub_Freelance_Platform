import { useState } from 'react'
import { logout } from '../services/api'

function Dashboard({ user, onLogout }) {
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    setLoading(true)
    try {
      await logout()
    } finally {
      // Clear local state even if the request failed; the server cookie
      // expires on its own after an hour.
      onLogout()
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <p className="auth-brand">HustleHub+</p>
        <h1>Hello, {user.name}</h1>
        <p className="auth-subtitle">You're signed in.</p>

        <dl className="profile">
          <dt>Email</dt>
          <dd>{user.email}</dd>
          <dt>Role</dt>
          <dd className="role-badge">{user.role}</dd>
        </dl>

        <button
          type="button"
          className="auth-submit"
          onClick={handleLogout}
          disabled={loading}
        >
          {loading ? 'Logging out...' : 'Log out'}
        </button>
      </div>
    </div>
  )
}

export default Dashboard
