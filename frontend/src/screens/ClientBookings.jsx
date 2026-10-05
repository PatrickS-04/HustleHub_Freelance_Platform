import { money } from '../data/placeholder'

function ClientBookings({ bookings, goTo }) {
  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>My bookings</h1>
          <p>Every booking creates a transaction record.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => goTo('browse')}>
          Browse gigs
        </button>
      </div>

      {bookings.length === 0 ? (
        <p className="empty">You haven't booked any gigs yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Gig</th>
                <th>Freelancer</th>
                <th>Start date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td data-label="Transaction">{b.transactionId}</td>
                  <td data-label="Gig">{b.gigTitle}</td>
                  <td data-label="Freelancer">{b.freelancerName}</td>
                  <td data-label="Start date">{b.date}</td>
                  <td data-label="Amount">{money(b.price)}</td>
                  <td data-label="Status">
                    <span className={`status status-${b.status.toLowerCase()}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

export default ClientBookings
