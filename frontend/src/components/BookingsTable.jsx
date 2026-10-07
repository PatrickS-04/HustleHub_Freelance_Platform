import { useEffect, useState } from 'react'
import { STATUS_ACTIONS, STATUS_STEPS, money } from '../data/placeholder'
import ConfirmDialog from './ConfirmDialog'
import ReceiptModal from './ReceiptModal'
import ReviewModal from './ReviewModal'
import './Bookings.css'

const FILTERS = [
  { id: 'All', test: () => true },
  { id: 'Pending', test: (b) => b.status === 'Pending' },
  { id: 'Accepted', test: (b) => b.status === 'Accepted' },
  { id: 'Completed', test: (b) => b.status === 'Completed' },
  { id: 'Closed', test: (b) => b.status === 'Declined' || b.status === 'Cancelled' },
]

const VERB = {
  Accepted: 'accepted',
  Completed: 'marked complete',
  Declined: 'declined',
  Cancelled: 'cancelled',
}

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

// Shared bookings table for both roles. `role` decides who the counterparty is
// and which status actions are offered.
function BookingsTable({ bookings, role, onStatus, onReview }) {
  const [filter, setFilter] = useState('All')
  const [confirming, setConfirming] = useState(null)
  const [notice, setNotice] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [reviewing, setReviewing] = useState(null)

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

  function apply(booking, action) {
    const ok = onStatus(booking.id, action.to)
    setNotice(
      ok
        ? `${booking.transactionId} ${VERB[action.to]}.`
        : 'That change is no longer available for this booking.',
    )
  }

  function handleAction(booking, action) {
    if (action.confirm) setConfirming({ booking, action })
    else apply(booking, action)
  }

  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0]
  const shown = bookings.filter(active.test)

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

      {shown.length === 0 ? (
        <p className="empty">
          {bookings.length === 0
            ? isFreelancer
              ? 'No one has booked your gigs yet.'
              : "You haven't booked any gigs yet."
            : 'No bookings with this status.'}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Gig</th>
                <th>{isFreelancer ? 'Client' : 'Freelancer'}</th>
                <th>Start date</th>
                <th>Amount</th>
                <th>Status</th>
                <th className="col-track">Progress</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id}>
                  <td data-label="Transaction">{b.transactionId}</td>
                  <td data-label="Gig">
                    {b.gigTitle}
                    {isFreelancer && b.note && (
                      <span className="muted note">&ldquo;{b.note}&rdquo;</span>
                    )}
                    {isFreelancer && b.review && (
                      <span className="muted note">
                        <span className="review-stars">{'★'.repeat(b.review.rating)}</span>
                        {b.review.text && <> &ldquo;{b.review.text}&rdquo;</>}
                      </span>
                    )}
                  </td>
                  <td data-label={isFreelancer ? 'Client' : 'Freelancer'}>
                    {isFreelancer ? b.clientName : b.freelancerName}
                  </td>
                  <td data-label="Start date">{b.date}</td>
                  <td data-label="Amount">{money(b.price)}</td>
                  <td data-label="Status">
                    <span className={`status status-${b.status.toLowerCase()}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="col-track" data-label="Progress">
                    <StatusTrack status={b.status} />
                  </td>
                  <td data-label="Actions">
                    <div className="row-actions">
                      {actionsFor(b).map((a) => (
                        <button
                          key={a.to}
                          type="button"
                          className={a.primary ? 'btn-primary' : 'btn-outline'}
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
                      {actionsFor(b).length === 0 && !hasReceipt(b) && (
                        <span className="muted">&mdash;</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {receipt && <ReceiptModal booking={receipt} onClose={() => setReceipt(null)} />}

      {reviewing && (
        <ReviewModal
          booking={reviewing}
          onClose={() => setReviewing(null)}
          onSubmit={(id, review) => {
            const ok = onReview(id, review)
            if (ok) setNotice('Thanks, your review was posted.')
            return ok
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

export default BookingsTable
