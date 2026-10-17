import { Link } from 'react-router-dom'
import '../App.css'

export default function CaregiverPlaceholder() {
  return (
    <div className="landing-page-shell">
      {/* Top Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand-link" aria-label="Kural Home">
            <span className="brand-tamil">குரல்</span>
            <span className="brand-capsule">KURAL</span>
            <span className="brand-dot" aria-hidden="true">•</span>
            <span className="brand-sub">Caregiver Portal</span>
          </Link>

          <nav className="landing-header-nav" aria-label="Header navigation">
            <Link to="/" className="btn-header-link" title="Return to Kural home">
              ← Return Home
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-main placeholder-main">
        <div className="placeholder-card" role="region" aria-labelledby="placeholder-heading">
          <div className="placeholder-icon-wrap" aria-hidden="true">
            🌱
          </div>

          <div className="card-top-pill caregiver-pill-label" style={{ alignSelf: 'center' }}>
            <span>COMING SOON</span>
          </div>

          <h1 id="placeholder-heading" className="placeholder-title">
            Caregiver Portal &amp; Memory Bank
          </h1>

          <p className="placeholder-subtitle">
            Caregiver account setup, patient profiles, and family memory banks are currently in development.
          </p>

          <div className="honest-notice-box">
            <h2 className="notice-title">Architecture &amp; Privacy Standards</h2>
            <p>
              To ensure data protection and authentic patient consent, authentication and profile persistence are scheduled for upcoming releases:
            </p>
            <ul className="notice-list">
              <li>
                <strong>No Mock Credentials:</strong> We do not simulate fake login states or unverified tokens.
              </li>
              <li>
                <strong>Secure Authentication:</strong> Direct Google sign-in and passwordless email magic links will arrive next.
              </li>
              <li>
                <strong>Family Memory Banks:</strong> Caregivers will be able to upload stories, identify loved ones, and configure stage-adaptive pacing with explicit consent.
              </li>
            </ul>
          </div>

          <div className="placeholder-actions">
            <Link to="/" className="btn-pill btn-secondary-pill" id="back-home-button">
              ← Return to Home
            </Link>
            <Link
              to="/companion"
              className="btn-pill btn-primary-pill"
              id="preview-companion-button"
              title="Explore the current patient companion chat prototype"
            >
              Preview Companion Chat →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p className="disclaimer-text">
            <strong>Demonstration Notice:</strong> Kural is an assistive companion prototype for demonstration purposes. It is not a clinical medical device, does not provide medical advice or diagnostic screening, and does not independently monitor emergencies or alert caregivers.
          </p>
          <p className="copyright-text">
            &copy; {new Date().getFullYear()} Kural. Thoughtfully designed for dementia care &amp; family connection.
          </p>
        </div>
      </footer>
    </div>
  )
}
