import BookingsList from '../components/BookingsList'

function ClientBookings({ bookings, goTo, onStatus, onReview }) {
  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>My bookings</h1>
          <p>Every booking creates a transaction record. Track where each one is up to.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => goTo('browse')}>
          Browse gigs
        </button>
      </div>

      <BookingsList
        bookings={bookings}
        role="client"
        onStatus={onStatus}
        onReview={onReview}
      />
    </>
  )
}

export default ClientBookings
