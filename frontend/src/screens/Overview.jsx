import { countsAsIncome, money } from '../constants'
import { activityFor } from '../data/placeholder'

function Overview({ user, isFreelancer, gigs, bookings, goTo }) {
  // Paused gigs don't count as live.
  const liveGigs = gigs.filter((g) => g.active !== false)
  const myGigs = liveGigs.filter((g) => g.freelancerId === user.id)
  const income = bookings.filter(countsAsIncome).reduce((sum, b) => sum + b.price, 0)
  const requests = bookings.filter((b) => b.status === 'Pending').length
  const upcoming = bookings.filter(
    (b) => b.status === 'Pending' || b.status === 'Accepted',
  ).length

  const stats = isFreelancer
    ? [
        { label: 'Active listings', value: myGigs.length },
        { label: 'Bookings received', value: bookings.length },
        { label: 'Awaiting your reply', value: requests },
        { label: 'Total income', value: money(income) },
      ]
    : [
        { label: 'Gigs available', value: liveGigs.length },
        { label: 'Your bookings', value: bookings.length },
        { label: 'Upcoming', value: upcoming },
        { label: 'Total spent', value: money(income) },
      ]

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Hello, {user.name}</h1>
          <p>
            {isFreelancer
              ? "Here's how your gigs are performing."
              : 'Find a freelancer and book your next gig.'}
          </p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => goTo(isFreelancer ? 'gigs' : 'browse')}
        >
          {isFreelancer ? 'View gigs' : 'Browse gigs'}
        </button>
      </div>

      <section className="stats" aria-label="Summary">
        {stats.map((s, i) => (
          <div className={`stat-card tone-${i % 4}`} key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </section>

      <div className="dash-grid">
      <section className="panel">
        <h2>{isFreelancer ? 'Latest bookings' : 'Recent bookings'}</h2>
        {bookings.length === 0 ? (
          <p className="empty">Nothing here yet.</p>
        ) : (
          <ul className="timeline">
            {bookings.slice(0, 4).map((b) => (
              <li className="tl-item" key={b.id}>
                <span className="tl-node" aria-hidden="true" />
                <div className="tl-body">
                  <div>
                    <strong>{b.gigTitle}</strong>
                    <span className="muted">
                      {isFreelancer ? b.clientName : b.freelancerName} &middot;{' '}
                      {b.date}
                    </span>
                  </div>
                  <div className="row-end">
                    <span className="job-budget">{money(b.price)}</span>
                    <span className={`status status-${b.status.toLowerCase()}`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Activity</h2>
        <ul className="activity">
          {activityFor(isFreelancer).map((a) => (
            <li key={a.text}>
              <div className="activity-head">
                <span className="avatar sm" aria-hidden="true">
                  {a.who.charAt(0)}
                </span>
                <strong>{a.who}</strong>
                <span className="muted">{a.when}</span>
              </div>
              <p>{a.text}</p>
            </li>
          ))}
        </ul>
      </section>
      </div>
    </>
  )
}

export default Overview
