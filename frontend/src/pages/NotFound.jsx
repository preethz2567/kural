import { Link } from 'react-router-dom'
import '../App.css'

export default function NotFound() {
  return (
    <div className="landing-page-shell">
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand-link" aria-label="Kural Home">
            <span className="brand-tamil">குரல்</span>
            <span className="brand-capsule">KURAL</span>
            <span className="brand-dot" aria-hidden="true">•</span>
            <span className="brand-sub">Companion</span>
          </Link>

          <nav className="landing-header-nav" aria-label="Header navigation">
            <Link to="/" className="btn-header-link" title="Return to Kural home">
              ← Return Home
            </Link>
          </nav>
        </div>
      </header>

      <main className="landing-main placeholder-main">
        <div className="placeholder-card" role="region" aria-labelledby="not-found-heading">
          <div className="placeholder-icon-wrap" aria-hidden="true">
            🧭
          </div>

          <h1 id="not-found-heading" className="placeholder-title">
            Page Not Found
          </h1>

          <p className="placeholder-subtitle">
            We couldn&apos;t find the page you were looking for. Let&apos;s return to a familiar and welcoming space.
          </p>

          <div className="placeholder-actions" style={{ justifyContent: 'center' }}>
            <Link to="/" className="btn-pill btn-primary-pill" id="not-found-home-button">
              ← Return to Kural Home
            </Link>
          </div>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p className="disclaimer-text">
            <strong>Demonstration Notice:</strong> Kural is an assistive companion prototype for demonstration purposes. It is not a clinical medical device.
          </p>
        </div>
      </footer>
    </div>
  )
}
