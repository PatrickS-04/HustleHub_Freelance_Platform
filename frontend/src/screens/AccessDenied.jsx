function AccessDenied({ onBack }) {
  return (
    <section className="panel denied">
      <h2>You don't have access to this page</h2>
      <p className="muted">
        This page isn't available for your account type. Head back to your
        overview to continue.
      </p>
      <button type="button" className="btn-primary" onClick={onBack}>
        Back to overview
      </button>
    </section>
  )
}

export default AccessDenied
