import { Link } from 'react-router-dom'
import '../App.css'

export default function LandingPage() {
  return (
    <div className="stitch-mobile-frame stitch-landing-frame">
      {/* Top Capsule Header */}
      <header className="stitch-header">
        <div className="header-pill-badge">
          <span className="wave-icon">❙❙•</span>
          <span className="tamil-logo">குரல்</span>
          <span className="kural-tag">KURAL</span>
          <span className="header-dot">•</span>
          <span className="header-portal-label">VOICE COMPANION</span>
        </div>
      </header>

      {/* Hero Portrait & Intergenerational Link */}
      <div className="landing-hero-center">
        <div className="portal-avatar-ring">
          <img
            src="/amma_hero.png"
            alt="Amma and daughter sharing a warm conversation"
            className="portal-avatar-img"
          />
          <div className="avatar-heart-badge">♥</div>
        </div>

        <div className="intergenerational-names-pill">
          <span>Meera &amp; Amma</span>
          <span className="status-dot-green"></span>
        </div>

        <h1 className="landing-display-headline">
          Stay close,
          <span className="title-gradient"> even from afar.</span>
        </h1>

        <p className="landing-body-lead">
          Small messages can become familiar, reassuring moments in their day. Preserving cherished memories, maternal cadence, and who they are.
        </p>
      </div>

      {/* Main Choice Cards Grid */}
      <div className="landing-choice-container">
        {/* Caregiver Portal & Setup Card */}
        <article className="landing-stitch-card caregiver-feature-card">
          <div className="card-top-tag">
            <span>🌱 FOR FAMILIES &amp; CAREGIVERS</span>
          </div>

          <h2 className="card-headline">Caregiver Portal &amp; Setup</h2>
          <p className="card-description">
            Anchor treasured stories, set stage-adaptive cadence, and stay gently connected with complete peace of mind.
          </p>

          <div className="card-actions-row">
            <Link to="/caregiver" className="btn-stitch-primary">
              Caregiver Portal →
            </Link>
            <Link to="/onboarding" className="btn-stitch-secondary">
              + New Person
            </Link>
          </div>
        </article>

        {/* Older Adult Direct Chat Card */}
        <article className="landing-stitch-card companion-feature-card">
          <div className="card-top-tag">
            <span>🌸 FOR OLDER ADULTS</span>
          </div>

          <h2 className="card-headline">Personalized Companion Chat</h2>
          <p className="card-description">
            Unhurried conversation grounded in familiar memories, morning tea rituals, and gentle reassurance.
          </p>

          <div className="card-actions-row">
            <Link to="/companion" className="btn-stitch-primary">
              Begin Companion Chat →
            </Link>
            <Link to="/profiles" className="btn-stitch-secondary">
              Switch Person
            </Link>
          </div>
        </article>
      </div>

      {/* Emotional Anchors Highlight */}
      <section className="landing-anchors-preview">
        <div className="anchors-header-block">
          <span className="anchors-eyebrow">EMOTIONAL ANCHORS</span>
          <h2 className="anchors-title">Little things they know by heart.</h2>
          <p className="anchors-sub">
            White night-blooming jasmine, brass davarahs, and quiet morning melodies.
          </p>
        </div>

        <div className="anchors-mini-pills">
          <span className="mini-pill">🌸 Mylapore Garden</span>
          <span className="mini-pill">☕ Brass Davarah</span>
          <span className="mini-pill">🎶 Morning Ragas</span>
          <span className="mini-pill">🌿 Stage Compass</span>
        </div>
      </section>

      {/* Trust Badges */}
      <div className="trust-grid-row">
        <div className="trust-item">
          <span className="trust-icon">🛡️</span>
          <span className="trust-title">HIPAA &amp; DPDP</span>
          <span className="trust-sub">COMPLIANT</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">🎙️</span>
          <span className="trust-title">ZERO SCREENS</span>
          <span className="trust-sub">FOR ELDERS</span>
        </div>
        <div className="trust-item">
          <span className="trust-icon">🔒</span>
          <span className="trust-title">CAREGIVER-FIRST</span>
          <span className="trust-sub">PRIVACY</span>
        </div>
      </div>

      {/* Footer Legal & Care Notice */}
      <footer className="portal-legal-footer">
        <p>
          Kural complements human care and is not a clinical medical device. By continuing, you agree to Kural&apos;s <Link to="#">Terms of Care</Link> and <Link to="#">Privacy Charter</Link>.
        </p>
      </footer>
    </div>
  )
}
