import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listPatients } from '../api.js'
import '../App.css'

export default function CaregiverPortal() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [isSent, setIsSent] = useState(false)
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

  const handleMagicLink = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setIsSent(true)
    setTimeout(() => {
      navigate('/profiles')
    }, 1200)
  }

  const preferredName = activePatient?.preferred_name || activePatient?.name || 'Loved One'
  const initialLetter = preferredName.charAt(0).toUpperCase()

  return (
    <div className="stitch-mobile-frame">
      {/* Top Capsule Header */}
      <header className="stitch-header">
        <div className="header-pill-badge">
          <span className="wave-icon">❙❙•</span>
          <span className="tamil-logo">குரல்</span>
          <span className="kural-tag">KURAL</span>
          <span className="header-dot">•</span>
          <span className="header-portal-label">CAREGIVER PORTAL</span>
        </div>
      </header>

      {/* Dynamic Profile Avatar Hero */}
      <div className="portal-avatar-wrap">
        <div className="portal-avatar-ring">
          {activePatient?.patient_id === 'patient_kalyani' ? (
            <img src="/avatar_amma.jpg" alt={preferredName} className="portal-avatar-img" />
          ) : (
            <div className="portal-avatar-circle">
              <span className="portal-avatar-letter">{initialLetter}</span>
            </div>
          )}
          <div className="avatar-heart-badge">♥</div>
        </div>
      </div>

      {/* Display Heading */}
      <section className="portal-heading-section">
        <h1 className="portal-display-title">
          Welcome, let&apos;s
          <span className="title-gradient"> set things up</span>
        </h1>
        <p className="portal-lead">
          Preserving cherished memories, familiar cadence, and who they are.
        </p>
      </section>

      {/* Main Action Card Container */}
      <div className="portal-auth-card">
        {/* Google Continue Button */}
        <button
          type="button"
          className="btn-google-auth"
          onClick={() => navigate('/profiles')}
        >
          <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Quick Link Pills */}
        <div className="pills-quick-row">
          <Link to="/profiles" className="pill-tag test-branch-pill">
            <span className="icon-fork">⑂</span> DIRECTORY
          </Link>
          <Link to="/profiles" className="pill-tag linked-profile-pill">
            <span className="dot-rose">•</span> Linked Profile ({preferredName})
          </Link>
        </div>

        {/* Divider */}
        <div className="auth-divider">
          <span className="divider-line"></span>
          <span className="divider-text">OR CONTINUE WITH EMAIL</span>
          <span className="divider-line"></span>
        </div>

        {/* Email Magic Link Form */}
        <form onSubmit={handleMagicLink} className="auth-email-form">
          <label className="input-field-label" htmlFor="caregiver-email">
            CAREGIVER WORK OR FAMILY EMAIL
          </label>
          <div className="input-with-icon">
            <span className="input-icon">✉</span>
            <input
              id="caregiver-email"
              type="email"
              placeholder="e.g. anita.raman@gmail.com"
              className="dark-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-send-magic">
            {isSent ? 'LINK VERIFIED ✓ OPENING...' : 'SEND SECURE MAGIC LINK →'}
          </button>
        </form>

        <div className="portal-nav-links">
          <Link to="/onboarding" className="portal-sub-link">
            + Start Guided Setup for New Person
          </Link>
          <span className="dot-sep">•</span>
          <Link to="/companion" className="portal-sub-link">
            Open Chat
          </Link>
        </div>
      </div>

      {/* Three Trust Footers */}
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

      {/* Footer Legal Terms */}
      <footer className="portal-legal-footer">
        <p>
          By continuing, you agree to Kural&apos;s <Link to="#">Terms of Care</Link> and{' '}
          <Link to="#">Privacy Charter</Link>. Audio memory data remains encrypted at rest.
        </p>
      </footer>
    </div>
  )
}
