import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listPatients } from '../api.js'
import '../App.css'

export default function LandingPage() {
  const navigate = useNavigate()
  const [activePatient, setActivePatient] = useState(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)

  useEffect(() => {
    listPatients()
      .then((patients) => {
        if (patients && patients.length > 0) {
          const storedId = localStorage.getItem('kural_active_patient_id')
          const matched =
            patients.find((p) => p.patient_id === storedId) ||
            patients.find((p) => p.patient_id === 'patient_kalyani') ||
            patients[0]
          setActivePatient(matched)
        }
      })
      .catch(() => {})
  }, [])

  const preferredName = activePatient?.preferred_name || activePatient?.name || 'Loved One'
  const caregiverName = activePatient?.relationships?.[0]?.name || 'Caregiver'

  // Voice Preview simulation using Web Speech Synthesis
  const handlePlayVoicePreview = () => {
    if ('speechSynthesis' in window) {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel()
        setIsPlayingAudio(false)
        return
      }

      setIsPlayingAudio(true)
      const text = `Hello, ${preferredName}. I am right here keeping you company. Take your time, everything is peaceful and calm today.`
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.85 // Warm, unhurried, reassuring pace
      utterance.pitch = 1.05

      // Select gentle voice if available
      const voices = speechSynthesis.getVoices()
      const gentleVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Female') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google')))
      if (gentleVoice) utterance.voice = gentleVoice

      utterance.onend = () => setIsPlayingAudio(false)
      utterance.onerror = () => setIsPlayingAudio(false)
      speechSynthesis.speak(utterance)
    } else {
      alert('Speech synthesis is not supported on this browser.')
    }
  }

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

      {/* Hero Family Image & Intergenerational Link */}
      <div className="landing-hero-center">
        <div className="landing-portrait-card">
          <img
            src={activePatient?.patient_id === 'patient_kalyani' ? '/hero_family.jpg' : '/hero_nell.jpg'}
            alt="Family holding hands warmly"
            className="landing-family-img"
          />
          <div className="landing-avatar-overlap">
            <img
              src={activePatient?.patient_id === 'patient_kalyani' ? '/avatar_amma.jpg' : '/avatar_nell.jpg'}
              alt={preferredName}
              className="landing-mini-avatar"
            />
            <div className="avatar-heart-badge">♥</div>
          </div>
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
          Small messages become familiar, reassuring moments in their day. Preserving cherished memories, maternal cadence, and who they are.
        </p>

        {/* Audio Sample Preview Button */}
        <button
          type="button"
          className={`btn-voice-preview ${isPlayingAudio ? 'voice-playing' : ''}`}
          onClick={handlePlayVoicePreview}
          title="Listen to a voice sample of Kural"
        >
          <span className="voice-icon">{isPlayingAudio ? '⏹' : '▶'}</span>
          <span>{isPlayingAudio ? 'Playing gentle voice sample...' : 'Listen to Kural’s gentle cadence'}</span>
        </button>
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
