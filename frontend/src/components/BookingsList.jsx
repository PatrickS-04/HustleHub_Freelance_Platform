import { useEffect, useState } from 'react'
import { STATUS_ACTIONS, STATUS_STEPS, money } from '../constants'
import ConfirmDialog from './ConfirmDialog'
import ReceiptModal from './ReceiptModal'
import ReviewModal from './ReviewModal'
import './Bookings.css'

// Bookings are grouped by stage. The first group's title depends on who is
// looking: a client is waiting for a reply, a freelancer has new requests.
const GROUPS = [
  {
    id: 'Pending',
    title: { client: 'Awaiting reply', freelancer: 'New requests' },
    test: (b) => b.status === 'Pending',
  },
  { id: 'Accepted', title: 'In progress', test: (b) => b.status === 'Accepted' },
  { id: 'Completed', title: 'Completed', test: (b) => b.status === 'Completed' },
  {
    id: 'Closed',
    title: 'Declined or cancelled',
    test: (b) => b.status === 'Declined' || b.status === 'Cancelled',
  },
]

const FILTERS = [{ id: 'All', test: () => true }, ...GROUPS]

const VERB = {
  Accepted: 'accepted',
  Completed: 'marked complete',
  Declined: 'declined',
  Cancelled: 'cancelled',
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function StatusTrack({ status }) {
  const index = STATUS_STEPS.indexOf(status)
  if (index === -1) return <span className="muted">Closed</span>
  return (
    <ol
      className="track"
      aria-label={`Progress: ${status}, step ${index + 1} of ${STATUS_STEPS.length}`}
    >
      {STATUS_STEPS.map((step, i) => (
        <li
          key={step}
          title={step}
          className={i < index ? 'done' : i === index ? 'current' : ''}
        />
      ))}
    </ol>
  )
}

// Calendar-style block showing the booking's start date
function DateBlock({ date }) {
  const month = MONTHS[Number(date.slice(5, 7)) - 1] || ''
  return (
    <time className="b-date" dateTime={date} title="Start date">
      <span className="b-month">{month}</span>
      <span className="b-day">{Number(date.slice(8, 10))}</span>
      <span className="b-year">{date.slice(0, 4)}</span>
    </time>
  )
}

// Bookings list for both roles. `role` decides who the counterparty is and
// which status actions are offered.
function BookingsList({ bookings, role, onStatus, onReview }) {
  const [filter, setFilter] = useState('All')
  const [confirming, setConfirming] = useState(null)
  const [notice, setNotice] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [reviewing, setReviewing] = useState(null)
  // Id of the booking whose status change is in flight (its buttons are disabled).
  const [busy, setBusy] = useState(null)

  const isFreelancer = role === 'freelancer'
  const actionsFor = (b) => STATUS_ACTIONS[role][b.status] || []
  // Money only moves once a booking is accepted, so only those get a receipt.
  const hasReceipt = (b) => b.status === 'Accepted' || b.status === 'Completed'

  // Auto-dismiss the confirmation message.
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(''), 4000)
    return () => clearTimeout(t)
  }, [notice])

  // The API has the final say: if the booking changed in the meantime it
  // answers 409 with a reason, which is shown instead.
  async function apply(booking, action) {
    setBusy(booking.id)
    try {
      await onStatus(booking.id, action.to)
      setNotice(`${booking.transactionId} ${VERB[action.to]}.`)
    } catch (err) {
      setNotice(err.message)
    } finally {
      setBusy(null)
    }
  }

  function handleAction(booking, action) {
    if (action.confirm) setConfirming({ booking, action })
    else apply(booking, action)
  }

  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0]
  const shown = bookings.filter(active.test)
  const groups = GROUPS.map((g) => ({
    ...g,
    items: shown.filter(g.test).sort((a, b) => a.date.localeCompare(b.date)),
  })).filter((g) => g.items.length > 0)

  return (
    <>
      <div className="chip-tabs" role="tablist" aria-label="Filter bookings">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? 'chip-tab active' : 'chip-tab'}
            onClick={() => setFilter(f.id)}
          >
            {f.id}
            <span className="chip-count">{bookings.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      <p className="notice" role="status" aria-live="polite">
        {notice}
      </p>

      {groups.length === 0 ? (
        <p className="empty">
          {bookings.length === 0
            ? isFreelancer
              ? 'No one has booked your gigs yet.'
              : "You haven't booked any gigs yet."
            : 'No bookings with this status.'}
        </p>
      ) : (
        groups.map((g) => (
          <section className="booking-group" key={g.id}>
            <div className="booking-head">
              <h2 className="group-title">
                {typeof g.title === 'string' ? g.title : g.title[role]}
                <span className="chip-count">{g.items.length}</span>
              </h2>
              <span aria-hidden="true">Status</span>
              <span aria-hidden="true">Amount</span>
              <span />
            </div>

            <ul className="booking-list">
              {g.items.map((b) => (
                <li className={`booking rail-${b.status.toLowerCase()}`} key={b.id}>
                  <DateBlock date={b.date} />

                  <div className="b-main">
                    <h3 className="b-title">{b.gigTitle}</h3>
                    <p className="b-meta">
                      <span className="avatar xs" aria-hidden="true">
                        {(isFreelancer ? b.clientName : b.freelancerName).charAt(0)}
                      </span>
                      <span>{isFreelancer ? b.clientName : b.freelancerName}</span>
                      <span className="b-tx">{b.transactionId}</span>
                    </p>
                    {isFreelancer && b.note && (
                      <p className="b-note">&ldquo;{b.note}&rdquo;</p>
                    )}
                    {isFreelancer && b.review && (
                      <p className="b-note">
                        <span className="review-stars">{'★'.repeat(b.review.rating)}</span>
                        {b.review.text && <> &ldquo;{b.review.text}&rdquo;</>}
                      </p>
                    )}
                  </div>

                  <div className="b-status">
                    <span className={`status status-${b.status.toLowerCase()}`}>
                      {b.status}
                    </span>
                    <StatusTrack status={b.status} />
                  </div>

                  <div className="b-amount">{money(b.price)}</div>

                  <div className="row-actions">
                    {actionsFor(b).map((a) => (
                      <button
                        key={a.to}
                        type="button"
                        className={a.primary ? 'btn-primary' : 'btn-outline'}
                        disabled={busy === b.id}
                        onClick={() => handleAction(b, a)}
                      >
                        {a.label}
                      </button>
                    ))}
                    {!isFreelancer && b.status === 'Completed' && !b.review && (
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setReviewing(b)}
                      >
                        Review
                      </button>
                    )}
                    {!isFreelancer && b.review && (
                      <span className="review-chip" title="Your review">
                        <span className="review-stars">{'★'.repeat(b.review.rating)}</span>
                        <span className="sr-only"> rated {b.review.rating} out of 5</span>
                      </span>
                    )}
                    {hasReceipt(b) && (
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => setReceipt(b)}
                      >
                        Receipt
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {receipt && <ReceiptModal booking={receipt} onClose={() => setReceipt(null)} />}

      {reviewing && (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onSubmit={async (id, review) => {
            await onReview(id, review)
            setNotice('Thanks, your review was posted.')
          }}
        />
      )}

      {confirming && (
        <ConfirmDialog
          message={confirming.action.confirm}
          confirmLabel={confirming.action.label}
          onCancel={() => setConfirming(null)}
          onConfirm={() => {
            apply(confirming.booking, confirming.action)
            setConfirming(null)
          }}
        />
      )}
    </>
  )
}

export default BookingsList
