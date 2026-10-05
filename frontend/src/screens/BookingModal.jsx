import { useState } from 'react'
import { money } from '../data/placeholder'

const today = () => new Date().toISOString().slice(0, 10)

// Simulated booking: no payment is taken. Confirming creates a booking plus a
// transaction record linking the client and the freelancer.
function BookingModal({ gig, user, nextTransactionId, onClose, onBooked }) {
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [booking, setBooking] = useState(null)

  function handleSubmit(e) {
    e.preventDefault()
    if (!date) return setError('Please choose a start date.')
    if (date < today()) return setError('The start date cannot be in the past.')
    if (note.length > 300) return setError('Notes must be 300 characters or fewer.')

    setError('')
    setProcessing(true)
    // Fake processing delay to mimic a payment step.
    setTimeout(() => {
      const created = {
        id: `b-${Date.now()}`,
        transactionId: nextTransactionId,
        gigId: gig.id,
        gigTitle: gig.title,
        price: gig.price,
        clientId: user.id,
        clientName: user.name,
        freelancerId: gig.freelancerId,
        freelancerName: gig.freelancerName,
        date,
        note: note.trim(),
        status: 'Confirmed',
      }
      onBooked(created)
      setBooking(created)
      setProcessing(false)
    }, 900)
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {booking ? (
          <div className="confirm">
            <div className="confirm-icon" aria-hidden="true">
              &#10003;
            </div>
            <h2 id="modal-title">Booking confirmed</h2>
            <p className="muted">
              This was a simulated payment, no money was taken.
            </p>
            <dl className="receipt">
              <dt>Transaction</dt>
              <dd>{booking.transactionId}</dd>
              <dt>Gig</dt>
              <dd>{booking.gigTitle}</dd>
              <dt>Freelancer</dt>
              <dd>{booking.freelancerName}</dd>
              <dt>Start date</dt>
              <dd>{booking.date}</dd>
              <dt>Amount</dt>
              <dd>{money(booking.price)}</dd>
            </dl>
            <button type="button" className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <h2 id="modal-title">Book this gig</h2>
            <p className="muted">
              {gig.title} &middot; {gig.freelancerName}
            </p>

            <div className="field">
              <label htmlFor="book-date">Start date</label>
              <input
                id="book-date"
                type="date"
                min={today()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="book-note">Notes for the freelancer (optional)</label>
              <textarea
                id="book-note"
                rows="3"
                maxLength={300}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <span className="hint">{note.length}/300</span>
            </div>

            <div className="total-row">
              <span>Total</span>
              <strong>{money(gig.price)}</strong>
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-outline" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={processing}>
                {processing ? 'Processing...' : 'Confirm booking'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default BookingModal
