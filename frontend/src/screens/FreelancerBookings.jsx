import BookingsList from '../components/BookingsList'

function FreelancerBookings({ bookings, onStatus }) {
  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Bookings</h1>
          <p>Accept new requests and mark jobs complete as you finish them.</p>
        </div>
      </div>

      <BookingsList bookings={bookings} role="freelancer" onStatus={onStatus} />
    </>
  )
}

export default FreelancerBookings
