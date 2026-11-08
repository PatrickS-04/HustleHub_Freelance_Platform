import { useEffect, useState } from 'react'
import './ReviewModal.css'

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

// Client reviews a completed booking: a 1-5 star rating and an optional comment.
function ReviewModal({ booking, onSubmit, onClose }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return setError('Please choose a star rating.')
    }
    if (text.length > 300) return setError('Comments must be 300 characters or fewer.')
    setError('')
    setSubmitting(true)
    try {
      await onSubmit(booking.id, { rating, text: text.trim() })
      onClose()
    } catch (err) {
      // e.g. "This booking has already been reviewed." from the API.
      setError(err.message)
      setSubmitting(false)
    }
  }

  const shown = hover || rating

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} noValidate>
          <h2 id="review-title">Rate this gig</h2>
          <p className="muted">
            {booking.gigTitle} &middot; {booking.freelancerName}
          </p>

          <div className="field">
            <span className="field-label" id="rating-label">
              Your rating
            </span>
            {/* Hover lives on the stars, not the group: the group is not a focus
                target, so it carries no handlers. Stars touch (no gap), so moving
                between them never drops the hover. */}
            <div className="star-picker" role="radiogroup" aria-labelledby="rating-label">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  className={n <= shown ? 'star on' : 'star'}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                >
                  &#9733;
                </button>
              ))}
              <span className="star-word">{RATING_WORDS[shown]}</span>
            </div>
          </div>

          <div className="field">
            <label htmlFor="review-text">Comment (optional)</label>
            <textarea
              id="review-text"
              rows="3"
              maxLength={300}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <span className="hint">{text.length}/300</span>
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
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ReviewModal
