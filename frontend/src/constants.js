// Shared constants and helpers. Categories and the status flow mirror the API
// (models/Gig.js, models/Booking.js); the API is what actually enforces them.

export const money = (n) => `R ${Number(n).toLocaleString('en-US')}`

export const longDate = (iso) =>
  new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

export const CATEGORIES = [
  'Design',
  'Web Development',
  'Writing',
  'Marketing',
  'Photography',
  'Video',
  'Translation',
]

export const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }))
export const FILTER_OPTIONS = [{ value: 'All', label: 'All categories' }, ...CATEGORY_OPTIONS]

// ---- Booking status flow ----
// Pending -> Accepted -> Completed, with Declined (freelancer) and Cancelled
// (client) as the ways out. Only these transitions are offered, per role.
export const STATUS_STEPS = ['Pending', 'Accepted', 'Completed']

export const STATUS_ACTIONS = {
  freelancer: {
    Pending: [
      { to: 'Accepted', label: 'Accept', primary: true },
      { to: 'Declined', label: 'Decline', confirm: 'Decline this booking? The client will be told it was declined.' },
    ],
    Accepted: [{ to: 'Completed', label: 'Mark complete', primary: true }],
  },
  client: {
    Pending: [
      { to: 'Cancelled', label: 'Cancel', confirm: 'Cancel this booking request? The freelancer will no longer see it.' },
    ],
  },
}

// Only accepted and completed bookings count as income / spend.
export const countsAsIncome = (b) => b.status === 'Accepted' || b.status === 'Completed'
