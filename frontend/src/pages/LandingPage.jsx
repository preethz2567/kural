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
            <Link to="/profiles" className="btn-header-link" title="View existing profiles">
              Person Profiles
            </Link>
            <Link to="/onboarding" className="btn-header-link" title="Set up a new person">
              + New Profile
            </Link>
            <Link to="/companion" className="btn-header-link primary-nav-cta" title="Open companion chat">
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

        {/* Choice Sanctuary: Patient Direct Entry + Caregiver Onboarding / Profile Setup */}
        <section className="sanctuary-section" aria-label="Choose how you wish to experience Kural">
          <div className="sanctuary-cards-grid">
            {/* Primary Action: Caregiver Guided Onboarding & Setup */}
            <article className="sanctuary-card caregiver-card-refined">
              <div className="card-top-pill caregiver-pill-label">
                <span className="pill-sparkle" aria-hidden="true">🌱</span>
                <span>FOR FAMILIES &amp; CAREGIVERS</span>
              </div>

              <h2 className="sanctuary-card-title">Set up a loved one&apos;s companion</h2>

              <p className="sanctuary-card-desc">
                In a few guided steps, share their preferred name, care context, comforting routines,
                and beloved memories so Kural converses with deep familiarity.
              </p>

              <div className="sanctuary-tags-row" aria-label="Key caregiver capabilities">
                <span className="sanctuary-tag">🌱 Guided Onboarding</span>
                <span className="sanctuary-tag">📖 Memory Anchors</span>
                <span className="sanctuary-tag">🌿 Stage-Adaptive</span>
              </div>

              <div className="sanctuary-cta-box">
                <Link
                  to="/onboarding"
                  className="btn-pill btn-primary-pill"
                  id="caregiver-onboarding-button"
                  aria-label="Begin guided profile onboarding"
                >
                  Start Guided Setup <span className="arrow-icon" aria-hidden="true">→</span>
                </Link>
                <Link
                  to="/profiles"
                  className="btn-pill btn-secondary-pill"
                  id="profiles-directory-button"
                  aria-label="Manage existing person profiles"
                >
                  View Existing Profiles
                </Link>
              </div>
            </article>

            {/* Direct Entry: Older Adult Companion Chat */}
            <article className="sanctuary-card patient-card-refined">
              <div className="card-top-pill patient-pill-label">
                <span className="pill-sparkle" aria-hidden="true">🌸</span>
                <span>FOR OLDER ADULTS</span>
              </div>

              <h2 className="sanctuary-card-title">Sit down and chat with Kural</h2>

              <p className="sanctuary-card-desc">
                Step directly into a peaceful, reassuring space to chat, reminisce over favorite stories,
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
                <Link
                  to="/profiles"
                  className="btn-pill btn-secondary-pill"
                  aria-label="Switch selected person"
                >
                  Switch Person Profile
                </Link>
              </div>
            </article>
          </div>
        </section>

        {/* How Personalization & Companion Work */}
        <section className="foundations-section" aria-labelledby="how-it-works-title">
          <div className="foundations-header">
            <span className="section-eyebrow">HOW KURAL WORKS</span>
            <h2 id="how-it-works-title" className="foundations-title">Companion Care, Personalized</h2>
          </div>

          <div className="foundations-grid">
            <div className="foundation-card">
              <span className="foundation-num" aria-hidden="true">01</span>
              <h3 className="foundation-heading">Caregiver Anchors</h3>
              <p className="foundation-body">
                Caregivers provide familiar topics—cherished stories, childhood hometowns, beloved hobbies, and calming tea-time memories.
              </p>
            </div>

            <div className="foundation-card">
              <span className="foundation-num" aria-hidden="true">02</span>
              <h3 className="foundation-heading">Stage-Adaptive Rhythm</h3>
              <p className="foundation-body">
                Kural dynamically adjusts sentence simplicity, emotional reassurance, and memory reinforcement to match their current stage.
              </p>
            </div>

            <div className="foundation-card">
              <span className="foundation-num" aria-hidden="true">03</span>
              <h3 className="foundation-heading">Infinite Patience</h3>
              <p className="foundation-body">
                Meets each individual wherever they are today, answering with warm cadence, untainted by digital fatigue or clinical coldness.
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
            <strong>Demonstration &amp; Ethical Care Notice:</strong> Kural is an assistive companion and memory support prototype for demonstration purposes. It complements human care and is not a clinical diagnostic, emergency-response, or medical monitoring device.
          </p>
          <p className="copyright-text">
            &copy; {new Date().getFullYear()} Kural. Thoughtfully designed for dementia care &amp; family connection.
          </p>
        </div>
      </footer>
    </div>
  )
}
