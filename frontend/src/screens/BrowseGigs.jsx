import { useState } from 'react'
import { CATEGORIES, money } from '../data/placeholder'
import BookingModal from './BookingModal'

function BrowseGigs({ user, gigs, nextTransactionId, onBooked }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState(null)

  const q = query.trim().toLowerCase()
  const visible = gigs.filter(
    (g) =>
      g.freelancerId !== user.id &&
      (category === 'All' || g.category === category) &&
      (!q ||
        g.title.toLowerCase().includes(q) ||
        g.freelancerName.toLowerCase().includes(q)),
  )

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Browse gigs</h1>
          <p>Pick a gig and book a freelancer.</p>
        </div>
      </div>

      <div className="filters">
        <input
          type="search"
          placeholder="Search gigs or freelancers"
          aria-label="Search gigs"
          maxLength={80}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option>All</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="empty">No gigs match your search.</p>
      ) : (
        <div className="gig-grid">
          {visible.map((g) => (
            <article className="gig-card" key={g.id}>
              <span className="tag">{g.category}</span>
              <h3>{g.title}</h3>
              <p className="gig-desc">{g.description}</p>
              <div className="gig-meta">
                <span>{g.freelancerName}</span>
                <span>&#9733; {g.rating.toFixed(1)}</span>
              </div>
              <div className="gig-foot">
                <div>
                  <strong>{money(g.price)}</strong>
                  <span className="muted"> &middot; {g.deliveryDays} days</span>
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setSelected(g)}
                >
                  Book
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && (
        <BookingModal
          gig={selected}
          user={user}
          nextTransactionId={nextTransactionId}
          onClose={() => setSelected(null)}
          onBooked={onBooked}
        />
      )}
    </>
  )
}

export default BrowseGigs
