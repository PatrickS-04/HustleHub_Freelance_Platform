import { useEffect, useState } from 'react'
import { money } from '../constants'
import { getIncome } from '../services/api'
import { BarChart, DonutChart } from '../components/Charts'
import { monthlySeries } from '../utils/months'

const tidy = (t) => {
  const s = t.replace(/^I will /i, '')
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// Income summary from GET /api/income. The API works it out from this
// freelancer's transaction records (filtered by the JWT, never a parameter):
// only Accepted and Completed bookings count, refunded ones don't.
function Earnings() {
  const [income, setIncome] = useState(null)
  const [error, setError] = useState('')

  // Fetched each time the tab opens, so it reflects the latest status changes.
  useEffect(() => {
    getIncome()
      .then(setIncome)
      .catch((err) => setError(err.message))
  }, [])

  const [now] = useState(() => new Date())

  if (error) {
    return (
      <p className="auth-error" role="alert">
        {error}
      </p>
    )
  }
  if (!income) return <p className="empty">Loading...</p>

  const { total, paidOut, inProgress, byMonth, byGig, transactions } = income
  const months = monthlySeries(
    Object.fromEntries(byMonth.map((m) => [m.month, m.total])),
    now,
  )

  // Top gigs by income; anything beyond the top four is grouped as "Other".
  const slices = byGig.slice(0, 4).map((g) => ({ label: tidy(g.title), value: g.total }))
  const rest = byGig.slice(4).reduce((s, g) => s + g.total, 0)
  if (rest > 0) slices.push({ label: 'Other', value: rest })

  const stats = [
    { label: 'Total income', value: money(total) },
    { label: 'Paid out', value: money(paidOut) },
    { label: 'In progress', value: money(inProgress) },
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

      <div className="dash-grid charts-grid">
        <section className="panel">
          <h2>Income by month</h2>
          <BarChart
            data={months}
            ariaLabel={`Income per month: ${months
              .map((m) => `${m.label} ${money(m.value)}`)
              .join(', ')}`}
          />
        </section>

        <section className="panel">
          <h2>Income by gig</h2>
          {slices.length === 0 ? (
            <p className="empty">No income yet.</p>
          ) : (
            <DonutChart
              slices={slices}
              centerLabel="total"
              ariaLabel={`Income by gig: ${slices
                .map((s) => `${s.label} ${money(s.value)}`)
                .join(', ')}`}
            />
          )}
        </section>
      </div>

      <div className="dash-grid earnings-lists">
        <section className="panel">
          <h2>Income transactions</h2>
          {transactions.length === 0 ? (
            <p className="empty">No income yet.</p>
          ) : (
            <ul className="row-list">
              {transactions.map((t) => (
                <li className="row" key={t.reference}>
                  <div>
                    <strong>{t.reference}</strong>
                    <span className="muted">
                      {t.gigTitle} &middot; from {t.clientName}
                    </span>
                  </div>
                  <span className="job-budget">+ {money(t.amount)}</span>
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
                <li className="row" key={g.gigId}>
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
