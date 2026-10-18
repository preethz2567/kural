import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listPatients } from '../api.js'
import '../App.css'

export default function ProfileList() {
  const navigate = useNavigate()
  const [patients, setPatients] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(() => {
    return localStorage.getItem('kural_active_patient_id') || 'patient_001'
  })

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    listPatients()
      .then((data) => {
        if (!isMounted) return
        setPatients(data || [])
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err.message || 'Unable to load profiles.')
      })
      .finally(() => {
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSelect = (patientId) => {
    setSelectedId(patientId)
    localStorage.setItem('kural_active_patient_id', patientId)
    navigate('/companion')
  }

  return (
    <div className="stitch-mobile-frame">
      {/* Top Capsule Header */}
      <header className="stitch-header">
        <div className="header-pill-badge">
          <span className="wave-icon">❙❙•</span>
          <span className="tamil-logo">குரல்</span>
          <span className="kural-tag">KURAL</span>
          <span className="header-dot">•</span>
          <span className="header-portal-label">PERSON DIRECTORY</span>
        </div>
      </header>

      <div className="profiles-page-head">
        <span className="anchors-eyebrow">FAMILY PROFILES</span>
        <h1 className="portal-display-title">
          Choose a loved one&apos;s
          <span className="title-gradient"> companion session</span>
        </h1>
        <p className="portal-lead">
          Each person has their own cherished memories, familiar cadence, and stage-adaptive pacing.
        </p>

        <div className="profiles-top-actions">
          <Link to="/onboarding" className="btn-stitch-primary">
            + Create New Profile
          </Link>
          <Link to="/" className="btn-stitch-secondary">
            ← Home
          </Link>
        </div>
      </div>

      {error && (
        <div className="banner banner-error" role="alert">
          <span><strong>Notice:</strong> {error}</span>
          <button className="btn-dismiss" onClick={() => setError(null)} type="button">Dismiss</button>
        </div>
      )}

      {isLoading ? (
        <div className="profiles-loading">
          <div className="typing-indicator" aria-label="Loading profiles">
            <span></span><span></span><span></span>
          </div>
          <p>Loading person profiles...</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="empty-profiles-card">
          <div className="empty-icon" aria-hidden="true">🌱</div>
          <h2>No Profiles Yet</h2>
          <p>Create the first person profile to begin personalized companion conversations.</p>
          <Link to="/onboarding" className="btn-stitch-primary">
            Create First Profile →
          </Link>
        </div>
      ) : (
        <div className="profiles-grid-column">
          {patients.map((p) => {
            const isActive = p.patient_id === selectedId
            const preferred = p.preferred_name || p.name
            const stageLabel = p.stage && p.stage !== 'unknown'
              ? `${p.stage.charAt(0).toUpperCase() + p.stage.slice(1)} Stage`
              : 'Stage Adaptive'

            return (
              <article
                key={p.patient_id}
                className={`stitch-profile-card ${isActive ? 'stitch-profile-card-active' : ''}`}
                onClick={() => handleSelect(p.patient_id)}
                role="button"
                tabIndex={0}
              >
                <div className="profile-card-top-row">
                  <div className="portal-avatar-ring-small">
                    <div className="portal-avatar-circle-small">
                      <span className="avatar-initial-small">{preferred.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="profile-meta-block">
                    <div className="profile-title-row">
                      <h2 className="profile-card-name">{p.name}</h2>
                      {isActive && <span className="active-tag-chip">● Selected</span>}
                    </div>
                    {p.preferred_name && p.preferred_name !== p.name && (
                      <span className="profile-call-name">Loves to be called &ldquo;{p.preferred_name}&rdquo;</span>
                    )}
                    <span className="profile-stage-pill">{stageLabel}</span>
                  </div>
                </div>

                <div className="profile-card-body-details">
                  {p.profession && (
                    <div className="profile-row-info">
                      <span className="row-info-icon">🎓</span>
                      <span>{p.profession}</span>
                    </div>
                  )}
                  {p.places_lived?.length > 0 && (
                    <div className="profile-row-info">
                      <span className="row-info-icon">🏡</span>
                      <span>{p.places_lived.join(', ')}</span>
                    </div>
                  )}
                  {p.preferences?.likes?.length > 0 && (
                    <div className="profile-row-info">
                      <span className="row-info-icon">🌸</span>
                      <span>Likes: {p.preferences.likes.slice(0, 3).join(', ')}</span>
                    </div>
                  )}
                  {p.cherished_memories?.length > 0 && (
                    <div className="profile-row-info">
                      <span className="row-info-icon">📖</span>
                      <span className="memory-quote">&ldquo;{p.cherished_memories[0]}&rdquo;</span>
                    </div>
                  )}
                </div>

                <div className="profile-card-action-bar">
                  <span className="profile-card-cta-text">
                    {isActive ? `Chatting with ${preferred}` : `Switch to ${preferred}`}
                  </span>
                  <span className="profile-card-cta-arrow">→</span>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Trust Badges */}
      <div className="trust-grid-row" style={{ marginTop: '28px' }}>
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

      {/* Footer */}
      <footer className="portal-legal-footer">
        <p>
          Profiles are stored locally for companion sessions. No clinical or financial data is collected.
        </p>
      </footer>
    </div>
  )
}
