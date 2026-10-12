import { useEffect, useState } from 'react'
import * as api from '../services/api'
import { longDate } from '../constants'
import UserDetail from './UserDetail'
import '../components/Bookings.css'
import './AdminUsers.css'

const ROLES = ['client', 'freelancer', 'admin']
const FILTERS = [{ id: 'All', test: () => true }, ...ROLES.map((r) => ({ id: r, test: (u) => u.role === r }))]

// Admin's user management: every account, with a detail page to inspect and
// delete one. The API only serves /api/users to admins.
function AdminUsers({ me }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api
      .listUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Auto-dismiss the confirmation message.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  async function removeUser(user) {
    await api.deleteUser(user.id)
    setUsers((us) => us.filter((u) => u.id !== user.id))
    setSelected(null)
    setNotice(`${user.name} was deleted.`)
  }

  if (selected) {
    return (
      <UserDetail
        userId={selected}
        meId={me.id}
        onBack={() => setSelected(null)}
        onDelete={removeUser}
      />
    )
  }

  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0]
  const q = query.trim().toLowerCase()
  const shown = users
    .filter(active.test)
    .filter((u) => !q || u.name.toLowerCase().includes(q) || u.email.includes(q))

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Users</h1>
          <p>Every account on the platform. Open one to see its details or remove it.</p>
        </div>
      </div>

      <div className="chip-tabs" role="tablist" aria-label="Filter users by role">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? 'chip-tab active' : 'chip-tab'}
            onClick={() => setFilter(f.id)}
          >
            {f.id === 'All' ? 'All' : f.id.charAt(0).toUpperCase() + f.id.slice(1) + 's'}
            <span className="chip-count">{users.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      <div className="filters user-search">
        <label htmlFor="user-q" className="sr-only">
          Search users
        </label>
        <input
          id="user-q"
          type="search"
          placeholder="Search by name or email"
          maxLength={100}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p className="notice" role="status" aria-live="polite">
        {notice}
      </p>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="empty">Loading...</p>
      ) : shown.length === 0 ? (
        <p className="empty">{users.length === 0 ? 'No users yet.' : 'No users match.'}</p>
      ) : (
        <section className="booking-group">
          <div className="booking-head user-head">
            <h2 className="group-title">
              {active.id === 'All' ? 'All users' : `${active.id}s`}
              <span className="chip-count">{shown.length}</span>
            </h2>
            <span aria-hidden="true">Role</span>
            <span aria-hidden="true">Joined</span>
            <span />
          </div>

          <ul className="booking-list">
            {shown.map((u) => (
              <li className={`booking user-row rail-role-${u.role}`} key={u.id}>
                <span className="avatar" aria-hidden="true">
                  {u.name.charAt(0).toUpperCase()}
                </span>

                <div className="b-main">
                  <h3 className="b-title">
                    {u.name}
                    {u.id === me.id && <span className="b-tx you-tag">You</span>}
                  </h3>
                  <p className="b-meta">{u.email}</p>
                </div>

                <div className="b-status">
                  <span className={`status status-role-${u.role}`}>{u.role}</span>
                </div>

                <div className="b-amount user-joined">{longDate(u.createdAt)}</div>

                <div className="row-actions">
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setSelected(u.id)}
                    aria-label={`View details for ${u.name}`}
                  >
                    User details
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

export default AdminUsers
