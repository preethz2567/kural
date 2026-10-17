import { Link } from 'react-router-dom'
import '../App.css'

export default function LandingPage() {
  return (
    <div className="landing-page-shell">
      {/* Top Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand-link" aria-label="Kural Home">
            <span className="brand-tamil">குரல்</span>
            <span className="brand-capsule">KURAL</span>
            <span className="brand-dot" aria-hidden="true">•</span>
            <span className="brand-sub">Companion</span>
          </Link>

          <nav className="landing-header-nav" aria-label="Header navigation">
            <Link to="/companion" className="btn-header-link" title="Open patient companion chat">
              Companion Chat →
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="landing-main">
        {/* Hero Section */}
        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="hero-eyebrow-pill">
            <span className="hero-pill-dot" aria-hidden="true"></span>
            <span>VOICE IDENTITY COMPANION • குரல்</span>
          </div>

          <h1 id="hero-title" className="hero-display-title">
            A gentle, familiar presence.
            <span className="hero-highlight"> Kural preserves who they are.</span>
          </h1>

          <p className="hero-lead">
            A warm, voice-first companion designed to offer unhurried reassurance, cherished
            memories, and dignified conversation for older adults living with memory changes.
          </p>
        </section>

        {/* Choice Sanctuary: Patient Primary + Caregiver Secondary */}
        <section className="sanctuary-section" aria-label="Choose how you wish to experience Kural">
          <div className="sanctuary-cards-grid">
            {/* Patient Card (Primary Action) */}
            <article className="sanctuary-card patient-card-refined">
              <div className="card-top-pill patient-pill-label">
                <span className="pill-sparkle" aria-hidden="true">🌸</span>
                <span>FOR OLDER ADULTS</span>
              </div>

              <h2 className="sanctuary-card-title">I&apos;m using Kural for myself</h2>

              <p className="sanctuary-card-desc">
                Step into a peaceful, reassuring space to chat, reminisce over favorite stories,
                or simply spend quiet time with a companion who listens with infinite patience.
              </p>

              <div className="sanctuary-tags-row" aria-label="Key patient features">
                <span className="sanctuary-tag">✨ Unhurried Pace</span>
                <span className="sanctuary-tag">☕ Distraction-Free</span>
                <span className="sanctuary-tag">🎶 Cherished Memories</span>
              </div>

              <div className="sanctuary-cta-box">
                <Link
                  to="/companion"
                  className="btn-pill btn-primary-pill"
                  id="patient-entry-button"
                  aria-label="Begin patient companion chat"
                >
                  Begin Companion Chat <span className="arrow-icon" aria-hidden="true">→</span>
                </Link>
              </div>
            </article>

            {/* Caregiver Card (Secondary Action) */}
            <article className="sanctuary-card caregiver-card-refined">
              <div className="card-top-pill caregiver-pill-label">
                <span className="pill-sparkle" aria-hidden="true">🌱</span>
                <span>FOR FAMILIES &amp; CAREGIVERS</span>
              </div>

              <h2 className="sanctuary-card-title">I&apos;m here for someone I care about</h2>

              <p className="sanctuary-card-desc">
                Create and personalize a loving companion experience. Prepare family stories,
                adapt conversational guidance, and stay gently connected with complete peace of mind.
              </p>

              <div className="sanctuary-tags-row" aria-label="Key caregiver capabilities">
                <span className="sanctuary-tag">🔒 Private &amp; Dignified</span>
                <span className="sanctuary-tag">📖 Memory Bank</span>
                <span className="sanctuary-tag">🌿 Stage-Adaptive</span>
              </div>

              <div className="sanctuary-cta-box">
                <Link
                  to="/caregiver"
                  className="btn-pill btn-secondary-pill"
                  id="caregiver-entry-button"
                  aria-label="Go to caregiver portal setup"
                >
                  Caregiver Portal &amp; Setup <span className="arrow-icon" aria-hidden="true">→</span>
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* The Three Foundations (Directly extracted from Stitch) */}
        <section className="foundations-section" aria-labelledby="foundations-title">
          <div className="foundations-header">
            <span className="section-eyebrow">ENGINEERED WITH REVERENCE</span>
            <h2 id="foundations-title" className="foundations-title">The Three Foundations</h2>
          </div>

          <div className="foundations-grid">
            <div className="foundation-card">
              <span className="foundation-num" aria-hidden="true">01</span>
              <h3 className="foundation-heading">Voice-First Calm</h3>
              <p className="foundation-body">
                Zero touchscreens or confusing menus to perplex aging hands. Pure, unhurried
                conversation designed for comfort.
              </p>
            </div>

            <div className="foundation-card">
              <span className="foundation-num" aria-hidden="true">02</span>
              <h3 className="foundation-heading">Family-Anchored</h3>
              <p className="foundation-body">
                Rooted in treasured personal stories, familiar memories, and cherished lineages
                that honor who they have always been.
              </p>
            </div>

            <div className="foundation-card">
              <span className="foundation-num" aria-hidden="true">03</span>
              <h3 className="foundation-heading">Infinite Patience</h3>
              <p className="foundation-body">
                Meets each individual wherever they are today, answering with warm cadence,
                untainted by fatigue or digital coldness.
              </p>
            </div>
          </div>
        </section>

        {/* Reassurance Heart Banner */}
        <section className="reassurance-banner" aria-label="Reassurance summary">
          <div className="heart-circle-icon" aria-hidden="true">
            ♥
          </div>
          <h2 className="reassurance-heading">Care that speaks like family.</h2>
          <p className="reassurance-text">
            Bring serenity, timeless companionship, and relief to your elders today.
          </p>
          <div className="reassurance-chips">
            <span className="chip-item">🛡️ 100% Private</span>
            <span className="chip-dot">•</span>
            <span className="chip-item">🕊️ Dignity First</span>
            <span className="chip-dot">•</span>
            <span className="chip-item">🌸 Zero Screen Barrier</span>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p className="disclaimer-text">
            <strong>Demonstration Notice:</strong> Kural is an assistive companion and memory support prototype for demonstration purposes. It is not a clinical medical device, does not provide medical advice or diagnostic screening, and does not independently monitor emergencies or alert caregivers.
          </p>
          <p className="copyright-text">
            &copy; {new Date().getFullYear()} Kural. Thoughtfully designed for dementia care &amp; family connection.
          </p>
        </div>
      </footer>
    </div>
  )
}
