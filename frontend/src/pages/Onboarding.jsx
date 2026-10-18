import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createPatient } from '../api.js'
import '../App.css'

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Profile Form State
  const [formData, setFormData] = useState({
    name: '',
    preferred_name: '',
    age_range: '',
    preferred_address: '',
    stage: 'unknown',
    language: 'English',
    communication_style: 'gentle and reassuring',
    profession: '',
    places_lived_str: '',
    likes_str: '',
    dislikes_str: '',
    calming_strategies_str: '',
    cherished_memories_str: '',
    caregiver_notes: '',
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = (currentStep) => {
    setError(null)
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError('Please enter a full or familiar name.')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleBack = () => {
    setError(null)
    setStep((s) => Math.max(1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const generateStableId = (name) => {
    const clean = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15)
    return `person_${clean}_${Date.now().toString(36).slice(-4)}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const patient_id = generateStableId(formData.name)

    const payload = {
      patient_id,
      name: formData.name.trim(),
      preferred_name: formData.preferred_name.trim() || formData.name.trim(),
      age_range: formData.age_range || null,
      preferred_address: formData.preferred_address || null,
      stage: formData.stage,
      language: formData.language,
      communication_style: formData.communication_style,
      profession: formData.profession.trim() || null,
      places_lived: formData.places_lived_str.split(',').map((s) => s.trim()).filter(Boolean),
      preferences: {
        likes: formData.likes_str.split(',').map((s) => s.trim()).filter(Boolean),
        dislikes: formData.dislikes_str.split(',').map((s) => s.trim()).filter(Boolean),
      },
      calming_strategies: formData.calming_strategies_str.split('\n').map((s) => s.trim()).filter(Boolean),
      cherished_memories: formData.cherished_memories_str.split('\n').map((s) => s.trim()).filter(Boolean),
      caregiver_notes: formData.caregiver_notes.trim() || null,
    }

    try {
      await createPatient(payload)
      // Save selected profile in localStorage for session convenience
      localStorage.setItem('kural_active_patient_id', patient_id)
      setStep(7) // Success completion step
    } catch (err) {
      setError(err.message || 'Unable to save profile. Please check connection.')
    } finally {
      setIsSubmitting(false)
    }
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
          <span className="header-portal-label">PROFILE ONBOARDING</span>
        </div>
      </header>

      <div className="onboarding-container">
        <div className="portal-heading-section" style={{ marginBottom: '12px' }}>
          <span className="anchors-eyebrow">GUIDED SETUP</span>
          <h1 className="portal-display-title" style={{ fontSize: '26px' }}>
            Personalize their
            <span className="title-gradient"> companion care</span>
          </h1>
        </div>
          {step <= 6 && (
            <div className="step-progress-bar" aria-label="Onboarding Progress">
              <div className="step-indicators">
                {[1, 2, 3, 4, 5, 6].map((idx) => (
                  <div
                    key={idx}
                    className={`step-dot ${step === idx ? 'step-active' : step > idx ? 'step-complete' : ''}`}
                    title={`Step ${idx}`}
                  >
                    {step > idx ? '✓' : idx}
                  </div>
                ))}
              </div>
              <span className="step-counter-text">Step {step} of 6</span>
            </div>
          )}

          {error && (
            <div className="banner banner-error" role="alert">
              <span><strong>Notice:</strong> {error}</span>
              <button className="btn-dismiss" onClick={() => setError(null)} type="button">Dismiss</button>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {step === 1 && (
            <div className="onboarding-card">
              <span className="section-eyebrow">STEP 1 OF 6</span>
              <h2 className="onboarding-title">Basic Information</h2>
              <p className="onboarding-desc">
                Help us get to know who we will be keeping company. Only their name is required; all other details are optional.
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="name">
                  Full or Familiar Name <span className="required-star">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Eleanor Vance"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="preferred_name">
                  Preferred Name or Nickname
                </label>
                <input
                  id="preferred_name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Nell (what they love to be called)"
                  value={formData.preferred_name}
                  onChange={(e) => handleChange('preferred_name', e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="age_range">
                    Approximate Age Range (Optional)
                  </label>
                  <select
                    id="age_range"
                    className="form-select"
                    value={formData.age_range}
                    onChange={(e) => handleChange('age_range', e.target.value)}
                  >
                    <option value="">Select age range...</option>
                    <option value="60-69">60–69</option>
                    <option value="70-79">70–79</option>
                    <option value="80-89">80–89</option>
                    <option value="90+">90 and above</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="profession">
                    Former Profession or Calling (Optional)
                  </label>
                  <input
                    id="profession"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Botanist, High school teacher"
                    value={formData.profession}
                    onChange={(e) => handleChange('profession', e.target.value)}
                  />
                </div>
              </div>

              <div className="onboarding-actions">
                <Link to="/" className="btn-secondary-pill">Cancel</Link>
                <button type="button" className="btn-pill btn-primary-pill" onClick={handleNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Care Context */}
          {step === 2 && (
            <div className="onboarding-card">
              <span className="section-eyebrow">STEP 2 OF 6</span>
              <h2 className="onboarding-title">Care &amp; Memory Context</h2>
              <p className="onboarding-desc">
                Select the care stage that best reflects how they communicate today. Kural adapts its response pace, memory grounding, and phrasing accordingly.
              </p>

              <div className="radio-cards-group" role="radiogroup" aria-label="Care stage">
                <label className={`radio-card ${formData.stage === 'early' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="stage"
                    value="early"
                    checked={formData.stage === 'early'}
                    onChange={(e) => handleChange('stage', e.target.value)}
                  />
                  <div className="radio-card-content">
                    <span className="radio-card-title">Early Stage</span>
                    <span className="radio-card-sub">
                      Engages in fluid conversations. Appreciates gentle reminders, memory games, and discussing current interests.
                    </span>
                  </div>
                </label>

                <label className={`radio-card ${formData.stage === 'mid' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="stage"
                    value="mid"
                    checked={formData.stage === 'mid'}
                    onChange={(e) => handleChange('stage', e.target.value)}
                  />
                  <div className="radio-card-content">
                    <span className="radio-card-title">Mid Stage (Recommended Default)</span>
                    <span className="radio-card-sub">
                      Benefits from shorter sentences, patient validation, familiar nostalgic references, and reassuring repetition.
                    </span>
                  </div>
                </label>

                <label className={`radio-card ${formData.stage === 'late' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="stage"
                    value="late"
                    checked={formData.stage === 'late'}
                    onChange={(e) => handleChange('stage', e.target.value)}
                  />
                  <div className="radio-card-content">
                    <span className="radio-card-title">Late Stage</span>
                    <span className="radio-card-sub">
                      Soft, calming presence. Focused on soothing cadence, familiar peaceful affirmations, and sensory reassurance.
                    </span>
                  </div>
                </label>

                <label className={`radio-card ${formData.stage === 'unknown' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="stage"
                    value="unknown"
                    checked={formData.stage === 'unknown'}
                    onChange={(e) => handleChange('stage', e.target.value)}
                  />
                  <div className="radio-card-content">
                    <span className="radio-card-title">Unknown / Not Yet Assessed</span>
                    <span className="radio-card-sub">
                      Kural will start with a gentle, patient, adaptive demeanor and adjust warmly.
                    </span>
                  </div>
                </label>
              </div>

              <div className="disclaimer-callout">
                ℹ️ <strong>Note:</strong> Kural does not diagnose dementia or determine medical stages. This setting simply tunes conversational pacing.
              </div>

              <div className="onboarding-actions">
                <button type="button" className="btn-secondary-pill" onClick={handleBack}>
                  ← Back
                </button>
                <button type="button" className="btn-pill btn-primary-pill" onClick={handleNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Communication Preferences */}
          {step === 3 && (
            <div className="onboarding-card">
              <span className="section-eyebrow">STEP 3 OF 6</span>
              <h2 className="onboarding-title">Communication Preferences</h2>
              <p className="onboarding-desc">
                How should Kural speak with them? Tailoring cadence makes conversations feel comforting rather than demanding.
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="language">
                  Primary Language
                </label>
                <select
                  id="language"
                  className="form-select"
                  value={formData.language}
                  onChange={(e) => handleChange('language', e.target.value)}
                >
                  <option value="English">English</option>
                </select>
                <small className="form-hint">English is actively supported for companion conversation.</small>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="communication_style">
                  Desired Conversational Style
                </label>
                <select
                  id="communication_style"
                  className="form-select"
                  value={formData.communication_style}
                  onChange={(e) => handleChange('communication_style', e.target.value)}
                >
                  <option value="gentle and reassuring">Gentle &amp; Reassuring (Soft, warm, infinite patience)</option>
                  <option value="short and direct">Short Sentences (Simple, uncluttered ideas)</option>
                  <option value="storyteller">Warm Storyteller (Nostalgic, vivid, descriptive)</option>
                  <option value="active listener">Quiet Companion (Short affirmations, listens attentively)</option>
                </select>
              </div>

              <div className="onboarding-actions">
                <button type="button" className="btn-secondary-pill" onClick={handleBack}>
                  ← Back
                </button>
                <button type="button" className="btn-pill btn-primary-pill" onClick={handleNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Personal Interests & Familiarity */}
          {step === 4 && (
            <div className="onboarding-card">
              <span className="section-eyebrow">STEP 4 OF 6</span>
              <h2 className="onboarding-title">Treasured Interests &amp; Places</h2>
              <p className="onboarding-desc">
                These topics act as conversational anchors. When they feel tired or adrift, Kural can gently bring up these beloved subjects.
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="likes_str">
                  Favourite Things &amp; Topics (comma-separated)
                </label>
                <div className="onboarding-suggested-anchors">
                  <span className="suggested-anchors-label">Quick Suggestions (tap to add):</span>
                  <div className="suggested-chips-grid">
                    {['🌸 Gardening & Flowers', '☕ Afternoon Tea / Coffee', '🎶 Classical Music / Songs', '☀️ Morning Sunshine', '📖 Treasured Old Stories', '🐾 Pets & Birds'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="btn-suggested-chip"
                        onClick={() => {
                          const cleanItem = item.replace(/^[^\w]+/, '').trim()
                          setFormData((prev) => {
                            const existing = prev.likes_str ? prev.likes_str.split(',').map((s) => s.trim()) : []
                            if (existing.includes(cleanItem)) return prev
                            return {
                              ...prev,
                              likes_str: existing.length > 0 ? `${prev.likes_str}, ${cleanItem}` : cleanItem,
                            }
                          })
                        }}
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  id="likes_str"
                  type="text"
                  className="form-input"
                  placeholder="e.g. camellia flowers, earl grey tea, cello music, afternoon sunshine"
                  value={formData.likes_str}
                  onChange={(e) => handleChange('likes_str', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="places_lived_str">
                  Familiar Towns or Places Lived (comma-separated)
                </label>
                <input
                  id="places_lived_str"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Maplewood Valley, Oakhaven Grove"
                  value={formData.places_lived_str}
                  onChange={(e) => handleChange('places_lived_str', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="cherished_memories_str">
                  Cherished Memories (one per line)
                </label>
                <textarea
                  id="cherished_memories_str"
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Planting the community garden with Arthur&#10;Walking through the arboretum in spring"
                  value={formData.cherished_memories_str}
                  onChange={(e) => handleChange('cherished_memories_str', e.target.value)}
                />
              </div>

              <div className="onboarding-actions">
                <button type="button" className="btn-secondary-pill" onClick={handleBack}>
                  ← Back
                </button>
                <button type="button" className="btn-pill btn-primary-pill" onClick={handleNext}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: Support Preferences */}
          {step === 5 && (
            <div className="onboarding-card">
              <span className="section-eyebrow">STEP 5 OF 6</span>
              <h2 className="onboarding-title">Support &amp; Calming Strategies</h2>
              <p className="onboarding-desc">
                What soothes them when they feel unsettled? Knowing what to steer away from helps Kural preserve dignity and peace.
              </p>

              <div className="form-group">
                <label className="form-label" htmlFor="dislikes_str">
                  Dislikes or Sensitive Topics (comma-separated)
                </label>
                <input
                  id="dislikes_str"
                  type="text"
                  className="form-input"
                  placeholder="e.g. loud noises, crowded spaces, cold drafty rooms"
                  value={formData.dislikes_str}
                  onChange={(e) => handleChange('dislikes_str', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="calming_strategies_str">
                  Calming Strategies (one per line)
                </label>
                <div className="onboarding-suggested-anchors">
                  <span className="suggested-anchors-label">Quick Soothing Suggestions:</span>
                  <div className="suggested-chips-grid">
                    {['Take three slow gentle breaths together', 'Remind them of afternoon tea', 'Mention a beloved garden', 'Assure them that they are safe and loved'].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="btn-suggested-chip"
                        onClick={() => {
                          setFormData((prev) => {
                            const existing = prev.calming_strategies_str ? prev.calming_strategies_str.split('\n').map((s) => s.trim()) : []
                            if (existing.includes(item)) return prev
                            return {
                              ...prev,
                              calming_strategies_str: existing.length > 0 ? `${prev.calming_strategies_str}\n${item}` : item,
                            }
                          })
                        }}
                      >
                        + {item}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  id="calming_strategies_str"
                  className="form-textarea"
                  rows={3}
                  placeholder="e.g. Remind them of afternoon tea&#10;Take three slow gentle breaths together&#10;Mention their garden"
                  value={formData.calming_strategies_str}
                  onChange={(e) => handleChange('calming_strategies_str', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="caregiver_notes">
                  Caregiver Notes (Optional)
                </label>
                <textarea
                  id="caregiver_notes"
                  className="form-textarea"
                  rows={2}
                  placeholder="Any special notes or guidance for supportive conversation..."
                  value={formData.caregiver_notes}
                  onChange={(e) => handleChange('caregiver_notes', e.target.value)}
                />
              </div>

              <div className="onboarding-actions">
                <button type="button" className="btn-secondary-pill" onClick={handleBack}>
                  ← Back
                </button>
                <button type="button" className="btn-pill btn-primary-pill" onClick={handleNext}>
                  Review Summary →
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: Review & Save */}
          {step === 6 && (
            <div className="onboarding-card">
              <span className="section-eyebrow">STEP 6 OF 6</span>
              <h2 className="onboarding-title">Review Profile Summary</h2>
              <p className="onboarding-desc">
                Please verify the details below. You can return to any step to make updates before saving.
              </p>

              <div className="review-summary-box">
                <div className="review-row">
                  <span className="review-label">Full Name:</span>
                  <span className="review-value font-bold">{formData.name}</span>
                </div>
                {formData.preferred_name && (
                  <div className="review-row">
                    <span className="review-label">Preferred Name:</span>
                    <span className="review-value">{formData.preferred_name}</span>
                  </div>
                )}
                <div className="review-row">
                  <span className="review-label">Care Stage:</span>
                  <span className="review-value capitalize">{formData.stage} Stage</span>
                </div>
                <div className="review-row">
                  <span className="review-label">Communication:</span>
                  <span className="review-value capitalize">{formData.communication_style} ({formData.language})</span>
                </div>
                {formData.profession && (
                  <div className="review-row">
                    <span className="review-label">Profession:</span>
                    <span className="review-value">{formData.profession}</span>
                  </div>
                )}
                {formData.likes_str && (
                  <div className="review-row">
                    <span className="review-label">Likes:</span>
                    <span className="review-value">{formData.likes_str}</span>
                  </div>
                )}
                {formData.dislikes_str && (
                  <div className="review-row">
                    <span className="review-label">Sensitive Topics:</span>
                    <span className="review-value">{formData.dislikes_str}</span>
                  </div>
                )}
              </div>

              <div className="privacy-reassurance">
                🔒 <strong>Privacy Assurance:</strong> This profile is stored for your companion session. No credentials or medical records are requested.
              </div>

              <div className="onboarding-actions">
                <button
                  type="button"
                  className="btn-secondary-pill"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  ← Edit Details
                </button>
                <button
                  type="button"
                  className="btn-pill btn-primary-pill"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving Profile...' : 'Save & Create Profile ✓'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 7: Success Screen */}
          {step === 7 && (
            <div className="onboarding-card text-center">
              <div className="success-icon" aria-hidden="true">🌸</div>
              <h2 className="onboarding-title">Profile Created with Care</h2>
              <p className="onboarding-desc">
                {formData.preferred_name || formData.name}&apos;s profile is ready. Kural will warmly converse using their favorite memories, topics, and comforting cadence.
              </p>

              <div className="success-actions">
                <button
                  type="button"
                  className="btn-stitch-primary"
                  onClick={() => navigate('/companion')}
                >
                  Open Companion Chat with {formData.preferred_name || formData.name} →
                </button>
                <Link to="/profiles" className="btn-stitch-secondary">
                  View All Profiles
                </Link>
              </div>
            </div>
          )}
        </div>
    </div>
  )
}
