import { useState } from 'react'
import { FILTER_OPTIONS, money } from '../constants'
import Select from '../components/Select'
import BookingModal from './BookingModal'
import GigDetail from './GigDetail'

// "newest" keeps the API's order, newest first (sort is stable, so 0 = unchanged).
const SORTS = {
  newest: () => 0,
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  fastest: (a, b) => a.deliveryDays - b.deliveryDays,
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'fastest', label: 'Fastest delivery' },
]

function BrowseGigs({ user, gigs, reviews = [], onBooked }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [selected, setSelected] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [sort, setSort] = useState('newest')

  // Paused gigs are hidden from clients; your own gigs never show in browse.
  const available = gigs.filter((g) => g.active !== false && g.freelancerId !== user.id)

  const q = query.trim().toLowerCase()
  const visible = available
    .filter(
      (g) =>
        (category === 'All' || g.category === category) &&
        (!q ||
          g.title.toLowerCase().includes(q) ||
          g.freelancerName.toLowerCase().includes(q)),
    )
    .sort(SORTS[sort] || SORTS.newest)

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
          gigs={available}
          userReviews={reviews.filter((r) => r.gigId === detailGig.id)}
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
            <Select
              ariaLabel="Sort gigs"
              value={sort}
              onChange={setSort}
              options={SORT_OPTIONS}
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
          onClose={() => setSelected(null)}
          onBooked={onBooked}
        />
      )}
    </>
  )
}

export default BrowseGigs
