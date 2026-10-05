import { useState } from 'react'
import { FILTER_OPTIONS, money } from '../data/placeholder'
import Select from '../components/Select'
import BookingModal from './BookingModal'
import GigDetail from './GigDetail'

function BrowseGigs({ user, gigs, nextTransactionId, onBooked }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState(null)
  const [detailId, setDetailId] = useState(null)

  const q = query.trim().toLowerCase()
  const visible = gigs.filter(
    (g) =>
      g.freelancerId !== user.id &&
      (category === 'All' || g.category === category) &&
      (!q ||
        g.title.toLowerCase().includes(q) ||
        g.freelancerName.toLowerCase().includes(q)),
  )

  const detailGig = gigs.find((g) => g.id === detailId)

  function openDetail(id) {
    setDetailId(id)
    window.scrollTo({ top: 0 })
  }

  return (
    <>
      {detailGig ? (
        <GigDetail
          gig={detailGig}
          gigs={gigs.filter((g) => g.freelancerId !== user.id)}
          onBack={() => setDetailId(null)}
          onOpen={openDetail}
          onBook={setSelected}
        />
      ) : (
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
            <Select
              ariaLabel="Filter by category"
              value={category}
              onChange={setCategory}
              options={FILTER_OPTIONS}
            />
          </div>

          {visible.length === 0 ? (
            <p className="empty">No gigs match your search.</p>
          ) : (
            <div className="gig-grid">
              {visible.map((g) => (
                <article className="gig-card" key={g.id}>
                  <span className="tag">{g.category}</span>
                  <h3>
                    <button
                      type="button"
                      className="title-link"
                      onClick={() => openDetail(g.id)}
                    >
                      {g.title}
                    </button>
                  </h3>
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
                    <div className="foot-actions">
                      <button
                        type="button"
                        className="btn-outline btn-sm"
                        onClick={() => openDetail(g.id)}
                      >
                        Details
                      </button>
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        onClick={() => setSelected(g)}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
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
