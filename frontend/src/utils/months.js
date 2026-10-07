// Last six months ending at `now`: placeholder `history` (5 values, oldest
// first) for the earlier months, plus real bookings added by start-date month.
export function monthlySeries(bookings, history, now) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      value: i < 5 ? history[i] : 0,
    }
  })
  bookings.forEach((b) => {
    const month = months.find((m) => m.key === b.date.slice(0, 7))
    if (month) month.value += b.price
  })
  return months
}
