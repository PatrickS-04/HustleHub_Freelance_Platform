import { money } from '../data/placeholder'

function FreelancerBookings({ bookings }) {
  return (
    <>
      <div className="dash-title-row">
        <div>
          <h1>Bookings</h1>
          <p>Clients who have booked your gigs.</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <p className="empty">No one has booked your gigs yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Transaction</th>
                <th>Gig</th>
                <th>Client</th>
                <th>Start date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td data-label="Transaction">{b.transactionId}</td>
                  <td data-label="Gig">
                    {b.gigTitle}
                    {b.note && <span className="muted note">&ldquo;{b.note}&rdquo;</span>}
                  </td>
                  <td data-label="Client">{b.clientName}</td>
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

export default FreelancerBookings
