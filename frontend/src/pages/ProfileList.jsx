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
    <div className="landing-page-shell">
      {/* Top Header */}
      <header className="landing-header">
        <div className="landing-header-inner">
          <Link to="/" className="landing-brand-link" aria-label="Kural Home">
            <span className="brand-tamil">குரல்</span>
            <span className="brand-capsule">KURAL</span>
            <span className="brand-dot">•</span>
            <span className="brand-sub">Profiles</span>
          </Link>
          <nav className="landing-header-nav">
            <Link to="/onboarding" className="btn-header-link">
              + New Profile
            </Link>
            <Link to="/companion" className="btn-header-link">
              Open Chat →
            </Link>
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <div className="profiles-wrapper">
          <div className="profiles-header-row">
            <div>
              <span className="section-eyebrow">FAMILY &amp; PERSON DIRECTORY</span>
              <h1 className="profiles-title">Select a Person&apos;s Profile</h1>
              <p className="profiles-subtitle">
                Choose whose personalized companion session you want to open, or add a loved one.
              </p>
            </div>

            <Link to="/onboarding" className="btn-pill btn-primary-pill">
              + Create New Profile
            </Link>
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
              <p>Create the first person profile to begin personalized, stage-adaptive companion conversations.</p>
              <Link to="/onboarding" className="btn-pill btn-primary-pill">
                Create First Profile →
              </Link>
            </div>
          ) : (
            <div className="profiles-grid">
              {patients.map((p) => {
                const isActive = p.patient_id === selectedId
                const preferred = p.preferred_name || p.name
                const stageLabel = p.stage ? `${p.stage.charAt(0).toUpperCase() + p.stage.slice(1)} Stage` : 'Stage Adaptive'

                return (
                  <article
                    key={p.patient_id}
                    className={`profile-card ${isActive ? 'profile-card-active' : ''}`}
                  >
                    <div className="profile-card-header">
                      <div className="profile-avatar">
                        {preferred.charAt(0).toUpperCase()}
                      </div>
                      <div className="profile-titles">
                        <h2 className="profile-name">{p.name}</h2>
                        {p.preferred_name && p.preferred_name !== p.name && (
                          <span className="profile-preferred">&ldquo;{p.preferred_name}&rdquo;</span>
                        )}
                        <span className="profile-stage-badge">{stageLabel}</span>
                      </div>
                    </div>

                    <div className="profile-card-details">
                      {p.profession && (
                        <div className="profile-detail-item">
                          <span className="detail-icon">🎓</span>
                          <span>{p.profession}</span>
                        </div>
                      )}
                      {p.preferences?.likes?.length > 0 && (
                        <div className="profile-detail-item">
                          <span className="detail-icon">🌸</span>
                          <span>{p.preferences.likes.slice(0, 3).join(', ')}</span>
                        </div>
                      )}
                      {p.cherished_memories?.length > 0 && (
                        <div className="profile-detail-item">
                          <span className="detail-icon">📖</span>
                          <span className="italic-memory">&ldquo;{p.cherished_memories[0]}&rdquo;</span>
                        </div>
                      )}
                    </div>

                    <div className="profile-card-footer">
                      <button
                        type="button"
                        className={`btn-pill ${isActive ? 'btn-primary-pill' : 'btn-secondary-pill'}`}
                        onClick={() => handleSelect(p.patient_id)}
                      >
                        {isActive ? 'Chat with ' + preferred + ' (Selected) →' : 'Select & Chat with ' + preferred}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p className="disclaimer-text">
            <strong>Caregiver Notice:</strong> Profile data is stored in the Kural prototype directory. No clinical medical records or passwords are required or collected.
          </p>
        </div>
      </footer>
    </div>
  )
}
