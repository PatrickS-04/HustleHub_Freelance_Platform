import { money } from '../data/placeholder'

function Overview({ user, isFreelancer, gigs, bookings, goTo }) {
  const myGigs = gigs.filter((g) => g.freelancerId === user.id)
  const income = bookings.reduce((sum, b) => sum + b.price, 0)
  const active = bookings.filter((b) => b.status === 'Confirmed').length

  const stats = isFreelancer
    ? [
        { label: 'Active listings', value: myGigs.length },
        { label: 'Bookings received', value: bookings.length },
        { label: 'Pending jobs', value: active },
        { label: 'Total income', value: money(income) },
      ]
    : [
        { label: 'Gigs available', value: gigs.length },
        { label: 'Your bookings', value: bookings.length },
        { label: 'Upcoming', value: active },
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
          {isFreelancer ? 'Create a gig' : 'Browse gigs'}
        </button>
      </div>

      <section className="stats" aria-label="Summary">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </section>

      <section className="panel">
        <h2>{isFreelancer ? 'Latest bookings' : 'Recent bookings'}</h2>
        {bookings.length === 0 ? (
          <p className="empty">Nothing here yet.</p>
        ) : (
          <ul className="row-list">
            {bookings.slice(0, 4).map((b) => (
              <li className="row" key={b.id}>
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

export default Overview
