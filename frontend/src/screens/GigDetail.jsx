import { money } from '../constants'
import './GigDetail.css'

const stars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n)

const listedOn = (iso) =>
  new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })

function GigDetail({ gig, gigs, userReviews = [], onBack, onOpen, onBook }) {
  const reviews = userReviews.slice(0, 5)

  // More from the same freelancer, falling back to similar gigs in the category.
  const byFreelancer = gigs.filter(
    (g) => g.freelancerId === gig.freelancerId && g.id !== gig.id,
  )
  const related = (
    byFreelancer.length
      ? byFreelancer
      : gigs.filter((g) => g.category === gig.category && g.id !== gig.id)
  ).slice(0, 3)
  const relatedTitle = byFreelancer.length
    ? `More from ${gig.freelancerName}`
    : 'Similar gigs'

  return (
    <>
      <button type="button" className="back-btn" onClick={onBack}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Back to gigs
      </button>

      <div className="detail-grid">
        <div className="detail-main">
          <section className="panel detail-hero">
            <span className="tag">{gig.category}</span>
            <h1>{gig.title}</h1>
            <div className="detail-meta">
              <span className="muted">by {gig.freelancerName}</span>
              {gig.createdAt && (
                <span className="muted">&middot; listed {listedOn(gig.createdAt)}</span>
              )}
            </div>
          </section>

          <section className="panel">
            <h2>About this gig</h2>
            <p className="detail-desc">{gig.description}</p>
          </section>

          {reviews.length > 0 && (
            <section className="panel">
              <h2>Your reviews</h2>
              <ul className="reviews">
                {reviews.map((r) => (
                  <li key={r.who + r.when}>
                    <span className="avatar sm" aria-hidden="true">
                      {r.who.charAt(0)}
                    </span>
                    <div>
                      <div className="review-top">
                        <strong>{r.who}</strong>
                        <span className="stars" aria-label={`${r.rating} out of 5`}>
                          {stars(r.rating)}
                        </span>
                        <span className="muted">{r.when}</span>
                      </div>
                      <p>{r.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="detail-side">
          <section className="price-card">
            <span className="stat-label">Price</span>
            <span className="price">{money(gig.price)}</span>
            <ul className="price-facts">
              <li>
                <span>Delivery</span>
                <strong>{gig.deliveryDays} days</strong>
              </li>
            </ul>
            <button
              type="button"
              className="btn-primary book-btn"
              onClick={() => onBook(gig)}
            >
              Book this gig
            </button>
            <p className="price-note">
              Simulated payment. A transaction record is created, no money is taken.
            </p>
          </section>

          <section className="panel">
            <div className="freelancer-head">
              <span className="avatar" aria-hidden="true">
                {gig.freelancerName.charAt(0)}
              </span>
              <div>
                <strong className="freelancer-name">{gig.freelancerName}</strong>
                <span className="muted">
                  {byFreelancer.length + 1} live{' '}
                  {byFreelancer.length === 0 ? 'gig' : 'gigs'}
                </span>
              </div>
            </div>
          </section>

          {related.length > 0 && (
            <section className="panel">
              <h2>{relatedTitle}</h2>
              <ul className="row-list">
                {related.map((g) => (
                  <li className="row" key={g.id}>
                    <div>
                      <button
                        type="button"
                        className="title-link"
                        onClick={() => onOpen(g.id)}
                      >
                        {g.title}
                      </button>
                      <span className="muted">{money(g.price)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  )
}

export default GigDetail
