import { money } from '../data/placeholder'

function Earnings({ bookings }) {
  const total = bookings.reduce((s, b) => s + b.price, 0)
  const paidOut = bookings
    .filter((b) => b.status === 'Completed')
    .reduce((s, b) => s + b.price, 0)
  const pending = total - paidOut

  // Income grouped per gig so the freelancer can see what earns the most.
  const byGig = Object.values(
    bookings.reduce((acc, b) => {
      acc[b.gigId] ||= { title: b.gigTitle, count: 0, total: 0 }
      acc[b.gigId].count += 1
      acc[b.gigId].total += b.price
      return acc
    }, {}),
  ).sort((a, b) => b.total - a.total)

  const stats = [
    { label: 'Total income', value: money(total) },
    { label: 'Paid out', value: money(paidOut) },
    { label: 'Pending', value: money(pending) },
  ]

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Earnings</h1>
          <p>Income from bookings, linked to your account.</p>
        </div>
      </div>

      <section className="stats stats-3" aria-label="Earnings summary">
        {stats.map((s, i) => (
          <div className={`stat-card tone-${i % 4}`} key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </section>

      <div className="dash-grid">
        <section className="panel">
          <h2>Income transactions</h2>
          {bookings.length === 0 ? (
            <p className="empty">No income yet.</p>
          ) : (
            <ul className="row-list">
              {bookings.map((b) => (
                <li className="row" key={b.id}>
                  <div>
                    <strong>{b.transactionId}</strong>
                    <span className="muted">
                      {b.gigTitle} &middot; from {b.clientName}
                    </span>
                  </div>
                  <span className="job-budget">+ {money(b.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>By gig</h2>
          {byGig.length === 0 ? (
            <p className="empty">Nothing to show.</p>
          ) : (
            <ul className="row-list">
              {byGig.map((g) => (
                <li className="row" key={g.title}>
                  <div>
                    <strong>{g.title}</strong>
                    <span className="muted">
                      {g.count} {g.count === 1 ? 'booking' : 'bookings'}
                    </span>
                  </div>
                  <span className="job-budget">{money(g.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}

export default Earnings
