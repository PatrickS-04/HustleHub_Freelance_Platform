import { useEffect, useState } from 'react'
import * as api from '../services/api'
import BookingsList from '../components/BookingsList'

// Admin oversight: every booking on the platform, read-only. The API only
// serves GET /api/bookings to admins.
function AdminBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .listAllBookings()
      .then(setBookings)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Bookings</h1>
          <p>Every booking on the platform, with its transaction reference. View only.</p>
        </div>
      </div>

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      {loading ? <p className="empty">Loading...</p> : <BookingsList bookings={bookings} role="admin" />}
    </>
  )
}

export default AdminBookings
