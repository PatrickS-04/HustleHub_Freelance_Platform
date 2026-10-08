import { useState } from 'react'
import { money } from '../constants'
import { createBooking } from '../services/api'
import DatePicker from '../components/DatePicker'

// Local date as YYYY-MM-DD (toISOString would give the UTC date, which can be
// "yesterday" or "tomorrow" around midnight).
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Simulated booking: no payment is taken. Confirming asks the API to create a
// booking plus a transaction record linking the client and the freelancer.
function BookingModal({ gig, onClose, onBooked }) {
  const [date, setDate] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)
  const [booking, setBooking] = useState(null)

  // Checked here for quick feedback; the API validates again and sets the
  // price, client and freelancer itself. The receipt shows what the API saved.
  async function handleSubmit(e) {
    e.preventDefault()
    if (!date) return setError('Please choose a start date.')
    if (date < today()) return setError('The start date cannot be in the past.')
    if (note.length > 300) return setError('Notes must be 300 characters or fewer.')

    setError('')
    setProcessing(true)
    try {
      const created = await createBooking(gig.id, date, note.trim())
      onBooked(created)
      setBooking(created)
    } catch (err) {
      // e.g. the gig was paused meanwhile, or the booking rate limit was hit.
      setError(err.message)
    } finally {
      setProcessing(false)
    }
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
            <h2 id="modal-title">Booking requested</h2>
            <p className="muted">
              {booking.freelancerName} will accept or decline it. This was a
              simulated payment, no money was taken.
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
              <DatePicker
                id="book-date"
                min={today()}
                value={date}
                onChange={setDate}
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
