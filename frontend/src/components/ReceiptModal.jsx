import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { money } from '../constants'
import './ReceiptModal.css'

// Printable receipt for a booking's transaction record. Rendered through a
// portal so printing can hide the whole app and print only the receipt.
function ReceiptModal({ booking: b, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="modal-backdrop receipt-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal receipt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="receipt-sheet">
          <div className="receipt-head">
            <div>
              <span className="receipt-brand">HustleHub+</span>
              <h2 id="receipt-title">Receipt</h2>
            </div>
            <div className="receipt-id">
              <span>Transaction</span>
              <strong>{b.transactionId}</strong>
            </div>
          </div>

          <dl className="receipt-parties">
            <div>
              <dt>Paid by</dt>
              <dd>{b.clientName}</dd>
            </div>
            <div>
              <dt>Paid to</dt>
              <dd>{b.freelancerName}</dd>
            </div>
            <div>
              <dt>Start date</dt>
              <dd>{b.date}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{b.status}</dd>
            </div>
          </dl>

          <table className="receipt-lines">
            <thead>
              <tr>
                <th>Service</th>
                <th>Qty</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{b.gigTitle}</td>
                <td>1</td>
                <td>{money(b.price)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2">Total</td>
                <td>{money(b.price)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="receipt-note">
            Simulated payment. This receipt records the booking transaction
            only, and no real money was taken.
          </p>
        </div>

        <div className="modal-actions no-print">
          <button type="button" className="btn-outline" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={() => window.print()}>
            Print / save as PDF
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default ReceiptModal
