import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listPatients, updatePatient, synthesizeVoiceSpeech } from '../api.js'
import KuralLogo from '../components/KuralLogo.jsx'
import {
  getPatientAvatar,
  getPatientHero,
  getCaregiverName,
  getElderDisplayName,
  DEFAULT_AVATARS,
} from '../avatarUtils.js'
import '../App.css'

// Default Kalyani Amma fallback object: Ensures on fresh open, Amma is always shown first
const DEFAULT_KALYANI = {
  patient_id: 'patient_kalyani',
  name: 'Kalyani Raman',
  preferred_name: 'Amma',
  language: 'Tamil',
  stage: 'mid',
  photo_url: '/avatar_amma.jpg',
  hero_url: '/hero_family.jpg',
  relationships: [{ name: 'Meera', relation: 'daughter', status: 'living' }],
  preferences: {
    likes: [
      'Mylapore garden white jasmine (Malligai)',
      'Brass davarah filter coffee at 7 AM',
      'Morning ragas with steamed idlis',
      'Kurai Onrum Illai song in Ragam Sivaranjani',
    ],
  },
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [allPatients, setAllPatients] = useState([DEFAULT_KALYANI])
  // Initialize with Kalyani Amma by default; only Nell if someone previously selected patient_001
  const [activePatient, setActivePatient] = useState(() => {
    const stored = localStorage.getItem('kural_active_patient_id')
    if (stored === 'patient_001') {
      return {
        patient_id: 'patient_001',
        name: 'Eleanor Vance',
        preferred_name: 'Nell',
        language: 'English',
        stage: 'mid',
        photo_url: '/avatar_nell.jpg',
        hero_url: '/hero_nell.jpg',
        relationships: [{ name: 'Clara', relation: 'daughter', status: 'living' }],
        preferences: { likes: ['camellia flowers', 'earl grey tea with honey', 'listening to cello music'] },
      }
    }
    return DEFAULT_KALYANI
  })

  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessToast, setSaveSuccessToast] = useState('')
  const [saveError, setSaveError] = useState('')
  const audioRef = useRef(null)
  const fileInputRef = useRef(null)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    preferred_name: '',
    caregiver_name: '',
    caregiver_relation: 'daughter',
    photo_url: '',
    hero_url: '',
  })

  useEffect(() => {
    let isMounted = true
    listPatients()
      .then((patients) => {
        if (!isMounted || !patients || patients.length === 0) return
        setAllPatients(patients)

        const storedId = localStorage.getItem('kural_active_patient_id')
        // Default target is strictly Kalyani Amma unless user previously selected another profile
        const targetId = storedId || 'patient_kalyani'
        const matched =
          patients.find((p) => p.patient_id === targetId) ||
          patients.find((p) => p.patient_id === 'patient_kalyani') ||
          patients[0]

        setActivePatient(matched)
      })
      .catch(() => {})

    return () => {
      isMounted = false
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
    }
  }, [])

  const preferredName = getElderDisplayName(activePatient)
  const caregiverName = getCaregiverName(activePatient)
  const avatarUrl = getPatientAvatar(activePatient)
  const heroUrl = getPatientHero(activePatient)

  // Switch active profile directly from Home page
  const handleSelectProfile = (patientId) => {
    const found = allPatients.find((p) => p.patient_id === patientId)
    if (found) {
      setActivePatient(found)
      localStorage.setItem('kural_active_patient_id', patientId)
    }
  }

  // Open Quick Edit modal prefilled with current patient
  const handleOpenEdit = () => {
    setSaveError('')
    setEditForm({
      name: activePatient?.name || '',
      preferred_name: activePatient?.preferred_name || activePatient?.name || '',
      caregiver_name: activePatient?.relationships?.[0]?.name || '',
      caregiver_relation: activePatient?.relationships?.[0]?.relation || 'daughter',
      photo_url: activePatient?.photo_url || activePatient?.avatar_url || (activePatient?.patient_id === 'patient_001' ? '/avatar_nell.jpg' : '/avatar_amma.jpg'),
      hero_url: activePatient?.hero_url || (activePatient?.patient_id === 'patient_001' ? '/hero_nell.jpg' : '/hero_family.jpg'),
    })
    setShowEditModal(true)
  }

  // Handle uploading image from device
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Data = event.target?.result
      if (base64Data) {
        setEditForm((prev) => ({
          ...prev,
          photo_url: base64Data,
          hero_url: base64Data, // Also use photo as hero background if custom
        }))
      }
    }
    reader.readAsDataURL(file)
  }

  // Save quick edits directly to backend and local state
  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editForm.name.trim()) {
      setSaveError('Please enter a name for the elder.')
      return
    }

    setIsSaving(true)
    setSaveError('')

    const updatedRelationships = editForm.caregiver_name.trim()
      ? [
          {
            name: editForm.caregiver_name.trim(),
            relation: editForm.caregiver_relation.trim() || 'caregiver',
            status: 'living',
            notes: 'Primary family caregiver',
          },
          ...(activePatient?.relationships?.slice(1) || []),
        ]
      : activePatient?.relationships || []

    const updatedPayload = {
      ...activePatient,
      name: editForm.name.trim(),
      preferred_name: editForm.preferred_name.trim() || editForm.name.trim(),
      relationships: updatedRelationships,
      photo_url: editForm.photo_url || null,
      hero_url: editForm.hero_url || null,
    }

    try {
      const res = await updatePatient(activePatient.patient_id, updatedPayload)
      const freshPatient = res || updatedPayload
      setActivePatient(freshPatient)
      setAllPatients((prev) =>
        prev.map((p) => (p.patient_id === freshPatient.patient_id ? freshPatient : p))
      )
      localStorage.setItem('kural_active_patient_id', freshPatient.patient_id)
      setShowEditModal(false)
      setSaveSuccessToast(`Saved profile for ${freshPatient.preferred_name || freshPatient.name}!`)
      setTimeout(() => setSaveSuccessToast(''), 3000)
    } catch (err) {
      setSaveError(err.message || 'Unable to save profile changes.')
    } finally {
      setIsSaving(false)
    }
  }

  // Dynamic voice preview: Speaks warm reassuring cadence customized for whoever is active
  const handlePlayVoicePreview = async () => {
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
      setIsPlayingAudio(false)
      return
    }

    setIsPlayingAudio(true)

    const isTamil =
      activePatient?.language?.toLowerCase().includes('tamil') ||
      activePatient?.patient_id === 'patient_kalyani'

    const previewText = isTamil
      ? `வணக்கம் ${preferredName}, நான் உங்களுடன்தான் இருக்கிறேன். உங்கள் மனம் அமைதியாகவும் சந்தோஷமாகவும் இருக்கட்டும். மெதுவாக மூச்சு விடுங்கள்.`
      : `Hello, ${preferredName}. ${caregiverName} and Kural are right here keeping you company. Take your time, everything is peaceful and calm today.`

    // 1. Try backend neural synthesis (XTTS / EdgeTTS)
    try {
      const data = await synthesizeVoiceSpeech({
        patient_id: activePatient?.patient_id || 'patient_kalyani',
        text: previewText,
        language: isTamil ? 'ta' : 'en',
      })
      if (data?.audio_base64) {
        const audio = new Audio(`data:${data.content_type || 'audio/mp3'};base64,${data.audio_base64}`)
        audioRef.current = audio
        audio.onended = () => {
          setIsPlayingAudio(false)
          audioRef.current = null
        }
        audio.onerror = () => {
          fallbackWebSpeech(previewText, isTamil)
        }
        await audio.play()
        return
      }
    } catch {
      // Fallback smoothly to browser Web Speech Synthesis
    }

    fallbackWebSpeech(previewText, isTamil)
  }

  const fallbackWebSpeech = (text, isTamil) => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.82 // Unhurried, soothing cadence
      utterance.pitch = 1.05

      const voices = speechSynthesis.getVoices()
      let preferredVoice = null
      if (isTamil) {
        preferredVoice = voices.find((v) => v.lang.startsWith('ta'))
      }
      if (!preferredVoice) {
        preferredVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Female') ||
              v.name.includes('Natural') ||
              v.name.includes('Samantha') ||
              v.name.includes('Google') ||
              v.name.includes('Pallavi'))
        )
      }
      if (preferredVoice) utterance.voice = preferredVoice

      utterance.onend = () => setIsPlayingAudio(false)
      utterance.onerror = () => setIsPlayingAudio(false)
      speechSynthesis.speak(utterance)
    } else {
      setIsPlayingAudio(false)
      alert('Speech synthesis is not supported on this browser.')
    }
  }

  return (
    <div className="stitch-mobile-frame stitch-landing-frame">
      {/* Top Capsule Header */}
      <header className="stitch-header">
        <div className="header-pill-badge">
          <KuralLogo size={22} />
          <span className="tamil-logo">குரல்</span>
          <span className="kural-tag">KURAL</span>
          <span className="header-dot">•</span>
          <span className="header-portal-label">ALZHEIMER’S &amp; DEMENTIA CARE</span>
        </div>
      </header>

      {saveSuccessToast && (
        <div className="banner banner-success toast-floating" role="status">
          <span>✨ {saveSuccessToast}</span>
        </div>
      )}

      {/* Hero Family Image & Intergenerational Link */}
      <div className="landing-hero-center">
        <div className="landing-portrait-card">
          <img
            src={heroUrl}
            alt={`${preferredName} and family holding hands warmly`}
            className="landing-family-img"
          />
          <div className="landing-avatar-overlap">
            <img
              src={avatarUrl}
              alt={preferredName}
              className="landing-mini-avatar"
            />
            <div className="avatar-heart-badge">♥</div>
          </div>
        </div>

        {/* Dynamic Green Button: Shows caregiver & elder names for whoever is selected */}
        <button
          type="button"
          className="intergenerational-names-pill clickable-names-pill"
          onClick={handleOpenEdit}
          title="Click to edit name, caregiver, or photo"
        >
          <span>{caregiverName} &amp; {preferredName}</span>
          <span className="status-dot-green"></span>
          <span className="pill-edit-icon" title="Edit Profile">✏️ Edit</span>
        </button>

        {/* Home Page Profile Switcher & Options Bar */}
        <div className="home-profile-control-bar">
          <div className="profile-select-wrapper">
            <span className="profile-select-label">Elder Profile:</span>
            <select
              className="home-profile-select"
              value={activePatient?.patient_id || 'patient_kalyani'}
              onChange={(e) => handleSelectProfile(e.target.value)}
              aria-label="Select active person profile"
            >
              {allPatients.map((p) => (
                <option key={p.patient_id} value={p.patient_id}>
                  {p.preferred_name || p.name} ({p.name})
                </option>
              ))}
            </select>
          </div>

          <div className="home-profile-actions">
            <button
              type="button"
              className="btn-home-quick-edit"
              onClick={handleOpenEdit}
              title="Change name, photo, or caregiver details"
            >
              ✏️ Edit Name &amp; Photo
            </button>
            <Link to="/onboarding" className="btn-home-new-person" title="Create a new person profile">
              + New Person
            </Link>
          </div>
        </div>

        <div className="landing-dementia-pill">
          Alzheimer’s &amp; Dementia Memory Care
        </div>

        <h1 className="landing-display-headline">
          Reassuring voice,
          <span className="title-gradient"> when memory fades.</span>
        </h1>

        <p className="landing-body-lead">
          An AI memory care companion calming Alzheimer’s confusion, memory loops, and sundowning anxiety using family voice therapy and cherished cultural anchors.
        </p>

        {/* Dynamic Audio Sample Preview Button */}
        <button
          type="button"
          className={`btn-voice-preview ${isPlayingAudio ? 'voice-playing' : ''}`}
          onClick={handlePlayVoicePreview}
          title={`Listen to Kural's soothing voice sample for ${preferredName}`}
        >
          <span className="voice-icon">{isPlayingAudio ? '⏹' : '▶'}</span>
          <span>
            {isPlayingAudio
              ? `Speaking gentle cadence for ${preferredName}...`
              : `Listen to Kural’s gentle cadence for ${preferredName}`}
          </span>
        </button>
      </div>

      {/* Main Choice Cards Grid */}
      <div className="landing-choice-container">
        {/* Caregiver Portal & Setup Card */}
        <article className="landing-stitch-card caregiver-feature-card">
          <div className="card-top-tag">
            <span>DEMENTIA CAREGIVER COMMAND</span>
          </div>

          <h2 className="card-headline">Dementia Telemetry &amp; Caregiver Command</h2>
          <p className="card-description">
            Track circadian sundowning, anchor treasured memories, and monitor real-time tranquility scores with doctor-ready clinical logs.
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
            <span>🌸 ALZHEIMER’S MEMORY COMPANION</span>
          </div>

          <h2 className="card-headline">Voice Reassurance for {preferredName}</h2>
          <p className="card-description">
            Unhurried conversation using validation therapy in {caregiverName}&apos;s cloned voice - calming distress, memory loss confusion, and repetitive loops.
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

      {/* Quick Edit Name & Photo Modal right on Home Page */}
      {showEditModal && (
        <div className="safe-modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="safe-modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="safe-modal-header">
              <div className="safe-modal-title-row">
                <span className="safe-modal-icon">✏️</span>
                <div>
                  <h3 className="safe-modal-title">Edit Name &amp; Photos</h3>
                  <span className="safe-modal-sub">Update profile details shown on Home</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-dismiss"
                onClick={() => setShowEditModal(false)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {saveError && (
              <div className="banner banner-error" role="alert" style={{ margin: '12px 16px 0' }}>
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="quick-edit-form">
              {/* Photo Preview & Selection */}
              <div className="quick-edit-photo-section">
                <div className="quick-edit-avatar-preview">
                  <img
                    src={editForm.photo_url || '/avatar_amma.jpg'}
                    alt="Preview"
                    className="quick-avatar-img"
                  />
                </div>
                <div className="quick-photo-meta">
                  <span className="quick-photo-label">Elder Profile Photo</span>
                  <div className="quick-photo-presets">
                    {DEFAULT_AVATARS.map((av) => (
                      <button
                        key={av.id}
                        type="button"
                        className={`btn-avatar-choice ${editForm.photo_url === av.url ? 'active-choice' : ''}`}
                        onClick={() => setEditForm((prev) => ({ ...prev, photo_url: av.url, hero_url: av.id === 'nell' ? '/hero_nell.jpg' : '/hero_family.jpg' }))}
                        title={av.label}
                      >
                        <img src={av.url} alt={av.label} />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn-upload-trigger"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 Upload Photo from Device
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                </div>
              </div>

              {/* Names Fields */}
              <div className="quick-field-group">
                <label className="quick-label" htmlFor="edit-elder-name">
                  Elder Full Name
                </label>
                <input
                  id="edit-elder-name"
                  type="text"
                  className="quick-input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="e.g. Kalyani Raman"
                  required
                />
              </div>

              <div className="quick-field-group">
                <label className="quick-label" htmlFor="edit-preferred-name">
                  Preferred Call Name (shown in greetings)
                </label>
                <input
                  id="edit-preferred-name"
                  type="text"
                  className="quick-input"
                  value={editForm.preferred_name}
                  onChange={(e) => setEditForm({ ...editForm, preferred_name: e.target.value })}
                  placeholder="e.g. Amma, Nell, Nana"
                  required
                />
              </div>

              <div className="quick-field-row">
                <div className="quick-field-group" style={{ flex: 1 }}>
                  <label className="quick-label" htmlFor="edit-caregiver-name">
                    Caregiver Name
                  </label>
                  <input
                    id="edit-caregiver-name"
                    type="text"
                    className="quick-input"
                    value={editForm.caregiver_name}
                    onChange={(e) => setEditForm({ ...editForm, caregiver_name: e.target.value })}
                    placeholder="e.g. Meera, Clara"
                  />
                </div>

                <div className="quick-field-group" style={{ width: '130px' }}>
                  <label className="quick-label" htmlFor="edit-caregiver-rel">
                    Relation
                  </label>
                  <select
                    id="edit-caregiver-rel"
                    className="quick-input"
                    value={editForm.caregiver_relation}
                    onChange={(e) => setEditForm({ ...editForm, caregiver_relation: e.target.value })}
                  >
                    <option value="daughter">Daughter</option>
                    <option value="son">Son</option>
                    <option value="spouse">Spouse</option>
                    <option value="grandchild">Grandchild</option>
                    <option value="caregiver">Caregiver</option>
                  </select>
                </div>
              </div>

              <div className="quick-field-group">
                <label className="quick-label" htmlFor="edit-photo-url">
                  Custom Image URL (optional)
                </label>
                <input
                  id="edit-photo-url"
                  type="url"
                  className="quick-input"
                  value={editForm.photo_url.startsWith('data:') ? '' : editForm.photo_url}
                  onChange={(e) => setEditForm({ ...editForm, photo_url: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>

              <div className="safe-modal-actions" style={{ marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn-stitch-secondary"
                  onClick={() => setShowEditModal(false)}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-stitch-primary"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
