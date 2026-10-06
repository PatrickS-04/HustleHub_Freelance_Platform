function IdleWarning({ secondsLeft, onStay, onLogout }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal modal-sm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="idle-title"
        aria-describedby="idle-desc"
      >
        <h2 id="idle-title">Still there?</h2>
        <p className="muted" id="idle-desc">
          For your security you'll be signed out in{' '}
          <strong>{secondsLeft}</strong> second{secondsLeft === 1 ? '' : 's'}{' '}
          because there has been no activity.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn-outline" onClick={onLogout}>
            Log out now
          </button>
          <button type="button" className="btn-primary" onClick={onStay} autoFocus>
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  )
}

export default IdleWarning
