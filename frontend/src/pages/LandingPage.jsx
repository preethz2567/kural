import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listPatients } from '../api.js'
import '../App.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const [activePatient, setActivePatient] = useState(null)

  useEffect(() => {
    listPatients()
      .then((patients) => {
        if (patients && patients.length > 0) {
          const storedId = localStorage.getItem('kural_active_patient_id')
          const matched = patients.find((p) => p.patient_id === storedId) || patients[0]
          setActivePatient(matched)
        }
      })
      .catch(() => {})
  }, [])

  const preferredName = activePatient?.preferred_name || activePatient?.name || 'Loved One'
  const caregiverName = activePatient?.relationships?.[0]?.name || 'Caregiver'

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

      {/* Hero Avatar & Intergenerational Link */}
      <div className="landing-hero-center">
        <div className="portal-avatar-ring">
          <div className="portal-avatar-circle">
            <span className="portal-avatar-letter">{preferredName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="avatar-heart-badge">♥</div>
        </div>

        <div className="intergenerational-names-pill">
          <span>{caregiverName} &amp; {preferredName}</span>
          <span className="status-dot-green"></span>
        </div>

        <h1 className="landing-display-headline">
          Stay close,
          <span className="title-gradient"> even from afar.</span>
        </h1>

        <p className="landing-body-lead">
          Small messages can become familiar, reassuring moments in their day. Preserving cherished memories, familiar cadence, and who they are.
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
            Anchor treasured family stories, adapt stage-aware pacing, and stay gently connected with complete peace of mind.
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
            Unhurried conversation grounded in {preferredName}&apos;s favorite memories, comfortable cadence, and infinite patience.
          </p>

          <div className="card-actions-row">
            <Link to="/companion" className="btn-stitch-primary">
              Begin Chat with {preferredName} →
            </Link>
            <Link to="/profiles" className="btn-stitch-secondary">
              Switch Person
            </Link>
          </div>
        </article>
      </div>

      {/* Dynamic Emotional Anchors Highlight */}
      <section className="landing-anchors-preview">
        <div className="anchors-header-block">
          <span className="anchors-eyebrow">EMOTIONAL ANCHORS</span>
          <h2 className="anchors-title">Little things they know by heart.</h2>
          <p className="anchors-sub">
            {activePatient?.preferences?.likes?.length > 0
              ? `Tuned with ${preferredName}'s favorite comforts: ${activePatient.preferences.likes.slice(0, 3).join(', ')}.`
              : 'Familiar anchors that comfort them and bring timeless peace.'}
          </p>
        </div>

        <div className="anchors-mini-pills">
          {activePatient?.preferences?.likes?.length > 0 ? (
            activePatient.preferences.likes.slice(0, 4).map((like, i) => (
              <span key={i} className="mini-pill">
                🌸 {like}
              </span>
            ))
          ) : (
            <>
              <span className="mini-pill">🌸 Peaceful Memories</span>
              <span className="mini-pill">☕ Afternoon Tea</span>
              <span className="mini-pill">🎶 Quiet Songs</span>
              <span className="mini-pill">🌿 Stage Compass</span>
            </>
          )}
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
