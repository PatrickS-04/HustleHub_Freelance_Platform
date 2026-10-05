import BookingsTable from '../components/BookingsTable'

function ClientBookings({ bookings, goTo, onStatus }) {
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

      <BookingsTable bookings={bookings} role="client" onStatus={onStatus} />
    </>
  )
}

export default ClientBookings
