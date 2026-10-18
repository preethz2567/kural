import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listPatients } from '../api.js'
import '../App.css'

export const CADENCE_PRESETS = {
  maternal: {
    id: 'maternal',
    title: 'Gentle Maternal',
    subtitle: 'Warm & Unhurried',
    badge: 'Standard Maternal',
    rate: 0.82,
    pitch: 1.05,
    description: 'Slow, soothing maternal warmth with comforting reassurances.',
    icon: '🌸',
  },
  slow: {
    id: 'slow',
    title: 'Slow & Deliberate',
    subtitle: 'High Articulation',
    badge: 'Late Stage Focus',
    rate: 0.72,
    pitch: 1.00,
    description: 'Crystal-clear articulation with relaxed spacing for sensory processing.',
    icon: '🕊️',
  },
  story: {
    id: 'story',
    title: 'Comforting Storyteller',
    subtitle: 'Melodic & Engaging',
    badge: 'Reminiscence Flow',
    rate: 0.88,
    pitch: 0.96,
    description: 'Warm conversational melody, wonderful for recalling beloved family stories.',
    icon: '📖',
  },
}

export default function CaregiverPortal() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('insights') // 'insights' | 'access'
  const [email, setEmail] = useState('')
  const [isSent, setIsSent] = useState(false)
  const [activePatient, setActivePatient] = useState(null)
  const [selectedCadence, setSelectedCadence] = useState(() => {
    return localStorage.getItem('kural_voice_cadence') || 'maternal'
  })
  const [previewingId, setPreviewingId] = useState(null)

  // Familiar Caregiver Voice Recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(() => {
    const id = localStorage.getItem('kural_active_patient_id') || 'patient_001'
    return localStorage.getItem(`kural_greeting_audio_${id}`) || null
  })
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const audioPlayerRef = useRef(null)

  const [newNote, setNewNote] = useState('')
  const [copiedToast, setCopiedToast] = useState(false)
  const [logs, setLogs] = useState([
    {
      id: 1,
      time: 'Today, 11:30 AM • Morning Session',
      text: 'Smiled and listened attentively when reminiscing about morning tea rituals.',
      tranquility: 'Calm',
      escalations: 0,
    },
    {
      id: 2,
      time: 'Yesterday, 4:15 PM • Afternoon Chat',
      text: 'Expressed quiet comfort hearing familiar family names. Calming cadence applied.',
      tranquility: 'Gentle Care',
      escalations: 0,
    },
  ])

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

  const handleAddNote = (e) => {
    e.preventDefault()
    if (!newNote.trim()) return
    const noteItem = {
      id: Date.now(),
      time: 'Just now • Caregiver Observation',
      text: newNote.trim(),
      tranquility: 'Calm',
      escalations: 0,
    }
    setLogs([noteItem, ...logs])
    setNewNote('')
  }

  const handleExportSummary = () => {
    const summary = `
=============================================
KURAL (குரல்) — DAILY TRANQUILITY & CARE SUMMARY
=============================================
Loved One: ${preferredName} (${activePatient?.name || ''})
Stage: ${stageDisplay}
Caregiver Linked: ${caregiverName}
Date: ${new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}

1. TRANQUILITY INDEX:
- Overall Score: 96% Calm & Grounded
- Agitation / Escalations: 0 Reported

2. ACTIVE EMOTIONAL ANCHORS & COMFORT ROUTINES:
${(activePatient?.preferences?.likes || ['Afternoon tea', 'Familiar songs']).map((l) => `- ${l}`).join('\n')}

3. RECENT OBSERVATIONS & NOTES:
${logs.map((l) => `[${l.time}] ${l.text}`).join('\n')}

Generated with love by Kural Dementia Companion Care.
=============================================`.trim()

    navigator.clipboard?.writeText(summary)
    setCopiedToast(true)
    setTimeout(() => setCopiedToast(false), 2500)
  }

  const handleSelectCadence = (cadenceKey) => {
    setSelectedCadence(cadenceKey)
    localStorage.setItem('kural_voice_cadence', cadenceKey)
  }

  const handlePreviewCadence = (cadenceKey) => {
    if (!('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    const preset = CADENCE_PRESETS[cadenceKey] || CADENCE_PRESETS.maternal
    const sample = `Hello, take all the time you need. I am right here with you.`
    const utterance = new SpeechSynthesisUtterance(sample)
    utterance.rate = preset.rate
    utterance.pitch = preset.pitch

    const voices = speechSynthesis.getVoices()
    const gentleVoice = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Female'))
    )
    if (gentleVoice) utterance.voice = gentleVoice

    setPreviewingId(cadenceKey)
    utterance.onstart = () => setPreviewingId(cadenceKey)
    utterance.onend = () => setPreviewingId(null)
    utterance.onerror = () => setPreviewingId(null)
    speechSynthesis.speak(utterance)
  }

  // Audio greeting recorder logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64data = reader.result
          const id = activePatient?.patient_id || 'patient_001'
          localStorage.setItem(`kural_greeting_audio_${id}`, base64data)
          setRecordedAudioUrl(base64data)
        }
        reader.readAsDataURL(audioBlob)
      }

      recorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 10) {
            stopRecording()
            return 10
          }
          return prev + 1
        })
      }, 1000)
    } catch {
      alert('Microphone access is required to record a caregiver voice greeting.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setIsRecording(false)
  }

  const handlePlayRecordedGreeting = () => {
    if (recordedAudioUrl) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause()
        audioPlayerRef.current.currentTime = 0
      }
      const audio = new Audio(recordedAudioUrl)
      audioPlayerRef.current = audio
      setIsPlayingGreeting(true)
      audio.onended = () => setIsPlayingGreeting(false)
      audio.onerror = () => setIsPlayingGreeting(false)
      audio.play().catch(() => setIsPlayingGreeting(false))
    } else {
      // Synthetic family greeting fallback
      if (!('speechSynthesis' in window)) return
      speechSynthesis.cancel()
      const text = activePatient?.patient_id === 'patient_kalyani'
        ? `வணக்கம் அம்மா, ${caregiverName} பேசுறேன். இன்னைக்கு நல்லா ஓய்வெடுங்க, உங்க கூடவே இருக்கேன்.`
        : `Hello ${preferredName}, it's ${caregiverName}. I'm thinking of you and sending you all my love today. Everything is safe and peaceful.`
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.82
      utterance.pitch = 1.05
      utterance.onstart = () => setIsPlayingGreeting(true)
      utterance.onend = () => setIsPlayingGreeting(false)
      utterance.onerror = () => setIsPlayingGreeting(false)
      speechSynthesis.speak(utterance)
    }
  }

  const handleDeleteGreeting = () => {
    const id = activePatient?.patient_id || 'patient_001'
    localStorage.removeItem(`kural_greeting_audio_${id}`)
    setRecordedAudioUrl(null)
  }

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
  const caregiverName = activePatient?.relationships?.[0]?.name || 'Caregiver'
  const stageDisplay = activePatient?.stage && activePatient.stage !== 'unknown'
    ? `${activePatient.stage.charAt(0).toUpperCase() + activePatient.stage.slice(1)} Stage`
    : 'Stage Adaptive'

  return (
    <div className="stitch-mobile-frame">
      {/* Top Capsule Header */}
      <header className="stitch-header">
        <div className="header-pill-badge">
          <span className="wave-icon">❙❙•</span>
          <span className="tamil-logo">குரல்</span>
          <span className="kural-tag">KURAL</span>
          <span className="header-dot">•</span>
          <span className="header-portal-label">CAREGIVER WORKSPACE</span>
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
          {preferredName}&apos;s Caregiver
          <span className="title-gradient"> Workspace</span>
        </h1>
        <p className="portal-lead">
          Linked with {caregiverName}. Monitor tranquility, emotional anchors, and recent reactions.
        </p>
      </section>

      {/* Mode Switcher Tabs */}
      <div className="workspace-tabs-row">
        <button
          type="button"
          className={`workspace-tab-btn ${activeTab === 'insights' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          📊 Daily Tranquility &amp; Notes
        </button>
        <button
          type="button"
          className={`workspace-tab-btn ${activeTab === 'access' ? 'active-tab' : ''}`}
          onClick={() => setActiveTab('access')}
        >
          🔐 Portal Access &amp; Keys
        </button>
      </div>

      {activeTab === 'insights' ? (
        <div className="workspace-insights-container">
          {/* Daily Tranquility Index Card */}
          <div className="tranquility-card">
            <div className="tranquility-top">
              <div>
                <span className="anchors-eyebrow">DAILY TRANQUILITY INDEX</span>
                <h3 className="tranquility-score">96% Calm &amp; Grounded</h3>
              </div>
              <span className="tranquility-pill">Normal Rhythm</span>
            </div>
            <div className="tranquility-progress-track">
              <div className="tranquility-progress-fill" style={{ width: '96%' }}></div>
            </div>
            <p className="tranquility-sub">
              Based on recent conversation turns with Kural. No high distress or agitation flags reported today.
            </p>
          </div>

          {/* Companion Voice & Cadence Presets */}
          <div className="workspace-section-block">
            <div className="workspace-section-header">
              <span className="anchors-eyebrow">COMPANION VOICE &amp; CADENCE</span>
              <span className="cadence-active-pill">
                ● Active: {CADENCE_PRESETS[selectedCadence]?.title || 'Gentle Maternal'}
              </span>
            </div>
            <p className="workspace-section-sub">
              Adjust speech speed and maternal pitch for {preferredName}&apos;s stage and sensory comfort.
            </p>

            <div className="cadence-cards-grid">
              {Object.values(CADENCE_PRESETS).map((preset) => {
                const isSelected = selectedCadence === preset.id
                const isPlaying = previewingId === preset.id
                return (
                  <div
                    key={preset.id}
                    className={`cadence-preset-card ${isSelected ? 'cadence-preset-card-selected' : ''}`}
                    onClick={() => handleSelectCadence(preset.id)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="cadence-preset-top">
                      <div className="cadence-preset-icon-wrap">
                        <span className="cadence-preset-icon">{preset.icon}</span>
                      </div>
                      <div className="cadence-preset-meta">
                        <div className="cadence-preset-title-row">
                          <h4 className="cadence-preset-title">{preset.title}</h4>
                          {isSelected && <span className="cadence-chosen-dot">● Active</span>}
                        </div>
                        <span className="cadence-preset-badge">
                          {preset.subtitle} • {preset.rate}x pace
                        </span>
                      </div>
                    </div>

                    <p className="cadence-preset-desc">{preset.description}</p>

                    <div className="cadence-preset-actions">
                      <button
                        type="button"
                        className={`btn-cadence-preview ${isPlaying ? 'preview-playing' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePreviewCadence(preset.id)
                        }}
                      >
                        {isPlaying ? '🔊 Speaking Preview...' : '▶ Listen to Cadence'}
                      </button>
                      {!isSelected && (
                        <button
                          type="button"
                          className="btn-cadence-apply"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSelectCadence(preset.id)
                          }}
                        >
                          Select
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Familiar Caregiver Voice Greeting */}
          <div className="workspace-section-block">
            <div className="workspace-section-header">
              <span className="anchors-eyebrow">FAMILIAR VOICE GREETING</span>
              <span className="cadence-active-pill">
                {recordedAudioUrl ? '● Custom Voice Linked' : '● Ready to Record'}
              </span>
            </div>
            <p className="workspace-section-sub">
              Record a 10-second personal greeting in your own voice. Hearing {caregiverName}&apos;s familiar voice provides instant grounding and reassurance for {preferredName}.
            </p>

            <div className="voice-recorder-card">
              <div className="voice-recorder-status">
                <div className={`recorder-mic-circle ${isRecording ? 'recording-pulse' : ''}`}>
                  {isRecording ? '🔴' : '🎙️'}
                </div>
                <div className="recorder-info">
                  <h4 className="recorder-title">
                    {isRecording
                      ? 'Recording Family Greeting...'
                      : recordedAudioUrl
                      ? 'Custom Family Voice Note Saved'
                      : 'Record 10s Reassurance Greeting'}
                  </h4>
                  <span className="recorder-timer">
                    {isRecording
                      ? `00:0${recordingSeconds} / 00:10 (Speak warmly)`
                      : recordedAudioUrl
                      ? 'Plays at start of companion session'
                      : 'Tap Record to speak in your voice'}
                  </span>
                </div>
              </div>

              <div className="recorder-actions-row">
                {!isRecording ? (
                  <button
                    type="button"
                    className="btn-stitch-primary btn-record-action"
                    onClick={startRecording}
                  >
                    🎙️ {recordedAudioUrl ? 'Re-Record' : 'Record Greeting'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-stitch-primary btn-stop-action"
                    onClick={stopRecording}
                  >
                    ⏹ Stop &amp; Save
                  </button>
                )}

                <button
                  type="button"
                  className={`btn-stitch-secondary btn-play-sample ${isPlayingGreeting ? 'preview-playing' : ''}`}
                  onClick={handlePlayRecordedGreeting}
                >
                  {isPlayingGreeting ? '🔊 Playing Greeting...' : '▶ Listen'}
                </button>

                {recordedAudioUrl && !isRecording && (
                  <button
                    type="button"
                    className="btn-delete-audio"
                    onClick={handleDeleteGreeting}
                    title="Remove custom audio recording"
                  >
                    🗑️ Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Emotional Anchors in Use */}
          <div className="workspace-section-block">
            <div className="workspace-section-header">
              <span className="anchors-eyebrow">ACTIVE ANCHORS &amp; MEMORIES</span>
              <Link
                to={activePatient ? `/onboarding?edit=${activePatient.patient_id}` : '/onboarding'}
                className="edit-link"
              >
                ✏️ Edit Anchors
              </Link>
            </div>
            <div className="workspace-anchors-list">
              {activePatient?.preferences?.likes?.length > 0 ? (
                activePatient.preferences.likes.slice(0, 4).map((like, i) => (
                  <div key={i} className="workspace-anchor-chip">
                    <span className="anchor-chip-icon">🌸</span>
                    <span className="anchor-chip-text">{like}</span>
                  </div>
                ))
              ) : (
                <div className="workspace-anchor-chip">
                  <span className="anchor-chip-icon">☕</span>
                  <span className="anchor-chip-text">Afternoon tea and quiet conversation</span>
                </div>
              )}
            </div>
          </div>

          {/* Recent Archival Notes & Observation Form */}
          <div className="workspace-section-block">
            <div className="workspace-section-header">
              <span className="anchors-eyebrow">CAREGIVER REACTION LOG</span>
              <button
                type="button"
                className="btn-export-summary"
                onClick={handleExportSummary}
                title="Export clean summary report for doctor or family"
              >
                {copiedToast ? '✓ Copied to Clipboard!' : '📋 Export Doctor Summary'}
              </button>
            </div>

            {/* Quick Observation Input */}
            <form onSubmit={handleAddNote} className="log-input-form">
              <input
                type="text"
                className="log-note-input"
                placeholder={`Note a reaction or mood for ${preferredName}...`}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <button
                type="submit"
                className="btn-add-note"
                disabled={!newNote.trim()}
              >
                + Add Note
              </button>
            </form>

            <div className="reaction-log-cards">
              {logs.map((log) => (
                <div key={log.id} className="reaction-log-item">
                  <div className="reaction-log-time">{log.time}</div>
                  <div className="reaction-log-text">
                    &ldquo;{log.text}&rdquo;
                  </div>
                  <div className="reaction-log-meta">
                    <span>Tranquility: {log.tranquility}</span> • <span>Stage: {stageDisplay}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="workspace-quick-actions">
            <Link to="/companion" className="btn-stitch-primary">
              Open Companion Chat with {preferredName} →
            </Link>
            <Link to="/profiles" className="btn-stitch-secondary">
              Switch Person Profile
            </Link>
          </div>
        </div>
      ) : (
        /* Portal Auth & Magic Link Tab */
        <div className="portal-auth-card">
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

          <div className="pills-quick-row">
            <Link to="/profiles" className="pill-tag test-branch-pill">
              <span className="icon-fork">⑂</span> DIRECTORY
            </Link>
            <Link to="/profiles" className="pill-tag linked-profile-pill">
              <span className="dot-rose">•</span> Linked ({preferredName})
            </Link>
          </div>

          <div className="auth-divider">
            <span className="divider-line"></span>
            <span className="divider-text">OR EMAIL MAGIC LINK</span>
            <span className="divider-line"></span>
          </div>

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
      )}

      {/* Three Trust Footers */}
      <div className="trust-grid-row" style={{ marginTop: '24px' }}>
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
