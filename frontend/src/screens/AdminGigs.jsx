import { useEffect, useState } from 'react'
import * as api from '../services/api'
import { money } from '../constants'
import ConfirmDialog from '../components/ConfirmDialog'
import './MyGigs.css'

// Admin moderation: every live gig, with the option to remove one. The API
// allows DELETE /api/gigs/:id for the owner or an admin only.
function AdminGigs() {
  const [gigs, setGigs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api
      .listGigs()
      .then(setGigs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Auto-dismiss the confirmation message.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  async function confirmDelete() {
    const gig = deleting
    setDeleting(null)
    try {
      await api.deleteGig(gig.id)
      setGigs((gs) => gs.filter((g) => g.id !== gig.id))
      setNotice(`"${gig.title}" was removed.`)
    } catch (err) {
      setNotice(err.message)
    }
  }

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Gigs</h1>
          <p>Every live gig on the platform. Remove one that breaks the rules.</p>
        </div>
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
      ) : gigs.length === 0 ? (
        <p className="empty">No live gigs.</p>
      ) : (
        <div className="gig-grid">
          {gigs.map((g) => (
            <article className="gig-card" key={g.id}>
              <span className="tag">{g.category}</span>
              <h3>{g.title}</h3>
              <p className="gig-desc">{g.description}</p>
              <div className="gig-meta">
                <span>{g.freelancerName}</span>
              </div>
              <div className="gig-foot">
                <div>
                  <strong>{money(g.price)}</strong>
                  <span className="muted"> &middot; {g.deliveryDays} days</span>
                </div>
              </div>
              <div className="gig-manage">
                <button
                  type="button"
                  className="btn-outline danger-text"
                  onClick={() => setDeleting(g)}
                  aria-label={`Remove ${g.title}`}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          message={`Remove "${deleting.title}" by ${deleting.freelancerName}? Existing bookings keep their records, but clients will no longer see this gig.`}
          confirmLabel="Remove gig"
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  )
}

export default AdminGigs
