import { useEffect, useState } from 'react'
import * as api from '../services/api'
import ConfirmDialog from '../components/ConfirmDialog'
import { longDate } from '../constants'
import './AdminUsers.css'

// Everything about one account, with the option to delete it. The API
// refuses to let an admin delete their own account; the button is hidden here too.
function UserDetail({ userId, meId, onBack, onDelete }) {
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api
      .getUser(userId)
      .then(setUser)
      .catch((err) => setError(err.message))
  }, [userId])

  async function confirmDelete() {
    setConfirming(false)
    setBusy(true)
    setError('')
    try {
      await onDelete(user)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const isSelf = userId === meId
  const stats = user && [
    ...(user.role === 'freelancer' ? [{ label: 'Gigs listed', value: user.gigs }] : []),
    ...(user.role !== 'admin'
      ? [
          { label: 'Bookings made', value: user.bookingsMade },
          ...(user.role === 'freelancer'
            ? [{ label: 'Bookings received', value: user.bookingsReceived }]
            : []),
        ]
      : []),
  ]

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>User details</h1>
          <p>Review this account before making changes.</p>
        </div>
        <button type="button" className="btn-outline" onClick={onBack}>
          Back to users
        </button>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {!user ? (
        !error && <p className="empty">Loading...</p>
      ) : (
        <>
          <section className="panel user-card" aria-label="Account">
            <span className="avatar user-avatar" aria-hidden="true">
              {user.name.charAt(0).toUpperCase()}
            </span>
            <div className="user-card-main">
              <h2>{user.name}</h2>
              <span className={`status status-role-${user.role}`}>{user.role}</span>
            </div>
            <dl className="user-facts">
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Joined</dt>
                <dd>{longDate(user.createdAt)}</dd>
              </div>
              <div>
                <dt>User ID</dt>
                <dd className="b-tx">{user.id}</dd>
              </div>
            </dl>
          </section>

          {stats.length > 0 && (
            <section className="stats" aria-label="Activity">
              {stats.map((s, i) => (
                <div className={`stat-card tone-${i % 4}`} key={s.label}>
                  <span className="stat-label">{s.label}</span>
                  <span className="stat-value">{s.value}</span>
                </div>
              ))}
            </section>
          )}

          <section className="panel user-danger">
            <div>
              <h2>Delete account</h2>
              <p className="muted">
                {isSelf
                  ? 'You cannot delete the account you are signed in with.'
                  : 'Permanently removes this user along with their gigs, bookings and transaction records. This cannot be undone.'}
              </p>
            </div>
            {!isSelf && (
              <button type="button" className="btn-danger" disabled={busy} onClick={() => setConfirming(true)}>
                {busy ? 'Deleting...' : 'Delete user'}
              </button>
            )}
          </section>
        </>
      )}

      {confirming && (
        <ConfirmDialog
          message={`Delete ${user.name} (${user.email})? Their gigs, bookings and transactions will be removed too. This cannot be undone.`}
          confirmLabel="Delete user"
          onCancel={() => setConfirming(false)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}

export default UserDetail
