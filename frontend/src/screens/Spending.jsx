import { useState } from 'react'
import { SPEND_HISTORY, countsAsIncome, money } from '../data/placeholder'
import { BarChart, DonutChart } from '../components/Charts'
import { monthlySeries } from '../utils/months'

function Spending({ bookings: allBookings, gigs }) {
  // Pending, declined and cancelled bookings cost nothing.
  const bookings = allBookings.filter(countsAsIncome)
  const total = bookings.reduce((s, b) => s + b.price, 0)
  const paid = bookings
    .filter((b) => b.status === 'Completed')
    .reduce((s, b) => s + b.price, 0)
  const committed = total - paid

  const [now] = useState(() => new Date())
  const months = monthlySeries(bookings, SPEND_HISTORY, now)

  // Spend grouped by the gig's category.
  const categoryOf = (b) => gigs.find((g) => g.id === b.gigId)?.category || 'Other'
  const byCategory = Object.entries(
    bookings.reduce((acc, b) => {
      const c = categoryOf(b)
      acc[c] = (acc[c] || 0) + b.price
      return acc
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const stats = [
    { label: 'Total spent', value: money(total) },
    { label: 'Paid (completed)', value: money(paid) },
    { label: 'In progress', value: money(committed) },
  ]

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Spending</h1>
          <p>What you've spent on gigs. Pending and cancelled bookings aren't counted.</p>
        </div>
      </div>

      <section className="stats stats-3" aria-label="Spending summary">
        {stats.map((s, i) => (
          <div className={`stat-card tone-${i % 4}`} key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
          </div>
        ))}
      </section>

      <div className="dash-grid charts-grid">
        <section className="panel">
          <h2>Spending by month</h2>
          <BarChart
            data={months}
            ariaLabel={`Spending per month: ${months
              .map((m) => `${m.label} ${money(m.value)}`)
              .join(', ')}`}
          />
        </section>

        <section className="panel">
          <h2>Spending by category</h2>
          {byCategory.length === 0 ? (
            <p className="empty">Nothing spent yet.</p>
          ) : (
            <DonutChart
              slices={byCategory}
              centerLabel="spent"
              ariaLabel={`Spending by category: ${byCategory
                .map((s) => `${s.label} ${money(s.value)}`)
                .join(', ')}`}
            />
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Transactions</h2>
        {bookings.length === 0 ? (
          <p className="empty">No transactions yet.</p>
        ) : (
          <ul className="row-list">
            {bookings.map((b) => (
              <li className="row" key={b.id}>
                <div>
                  <strong>{b.transactionId}</strong>
                  <span className="muted">
                    {b.gigTitle} &middot; to {b.freelancerName}
                  </span>
                </div>
                <div className="row-end">
                  <span className="job-budget">- {money(b.price)}</span>
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

export default Spending
