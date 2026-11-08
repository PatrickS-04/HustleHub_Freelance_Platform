const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

// Six months of totals from `totals` ({ 'YYYY-MM': amount }), grouped by the
// booking's start date. Bookings start today or later, so the window ends at
// the latest month with data, or the current month if that is later.
export function monthlySeries(totals, now) {
  const latest = Object.keys(totals).sort((a, b) => a.localeCompare(b)).pop()
  const current = monthKey(now)
  const end = latest && latest > current ? latest : current
  const [year, month] = end.split('-').map(Number)

  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(year, month - 1 - (5 - i), 1)
    const key = monthKey(d)
    return {
      key,
      label: d.toLocaleString('en-US', { month: 'short' }),
      value: totals[key] || 0,
    }
  })
}

// { 'YYYY-MM': total price } for a list of bookings.
export const totalsByMonth = (bookings) =>
  bookings.reduce((acc, b) => {
    const key = b.date.slice(0, 7)
    acc[key] = (acc[key] || 0) + b.price
    return acc
  }, {})
