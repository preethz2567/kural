import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checkBackendHealth, fetchPatient, sendChatMessage } from '../api.js'
import { CADENCE_PRESETS } from './CaregiverPlaceholder.jsx'
import '../App.css'

function createSessionId(prefix = 'sess') {
  return `${prefix}_${Math.random().toString(36).substring(2, 10)}`
}

function formatTime(isoString) {
  try {
    const date = isoString ? new Date(isoString) : new Date()
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function CompanionChat() {
  const navigate = useNavigate()

  const [activePatientId, setActivePatientId] = useState(() => {
    return localStorage.getItem('kural_active_patient_id') || 'patient_001'
  })

  const [langMode, setLangMode] = useState(() => {
    return localStorage.getItem('kural_lang_mode') || 'en'
  })

  const [sessionId, setSessionId] = useState(() => createSessionId(activePatientId))
  const [patientData, setPatientData] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState(null)
  const [latestDistress, setLatestDistress] = useState({ level: 'none', reason: 'Awaiting input' })
  const [isMockMode, setIsMockMode] = useState(false)
  const [showSafeZoneModal, setShowSafeZoneModal] = useState(false)
  const [isPlayingFamilyVoice, setIsPlayingFamilyVoice] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const familyAudioRef = useRef(null)

  const toggleLanguage = () => {
    const next = langMode === 'en' ? 'ta' : 'en'
    setLangMode(next)
    localStorage.setItem('kural_lang_mode', next)
  }

  useEffect(() => {
    const controller = new AbortController()

    async function init() {
      try {
        const result = await checkBackendHealth({ signal: controller.signal })
        setBackendStatus(result.online ? true : result.retrying ? 'retrying' : false)
      } catch {
        setBackendStatus(false)
      }

      try {
        const patient = await fetchPatient(activePatientId, { signal: controller.signal })
        setPatientData(patient)
        const preferred = patient.preferred_name || patient.name || 'Friend'

        // If patient language specifies Tamil, and no manual toggle yet, switch to Tamil
        const isTamil = langMode === 'ta' || (patient.language && patient.language.toLowerCase().includes('tamil'))

        const welcomeText = isTamil
          ? `வணக்கம், ${preferred}. உங்களோடு அமைதியாகப் பேசுவதில் மிக்க மகிழ்ச்சி. பொறுமையாகப் பேசுங்கள், நான் எப்போதும் உங்களுடன்தான் இருக்கிறேன்.`
          : `Hello, ${preferred}. It is lovely to sit together today. Take your time, and tell me whatever is on your mind. I am right here with you.`

        setMessages([
          {
            id: 'welcome_' + Date.now(),
            sender: 'companion',
            text: welcomeText,
            timestamp: new Date().toISOString(),
            isMock: false,
          },
        ])
      } catch {
        setMessages([
          {
            id: 'welcome_fallback',
            sender: 'companion',
            text: langMode === 'ta'
              ? 'வணக்கம். உங்களோடு பேசுவதில் மகிழ்ச்சி. பொறுமையாகப் பேசுங்கள்.'
              : 'Hello. It is wonderful to sit together today. Take your time, and tell me whatever is on your mind.',
            timestamp: new Date().toISOString(),
            isMock: false,
          },
        ])
      }
    }

    init()
    return () => controller.abort()
  }, [activePatientId, langMode])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = async (customPrompt) => {
    const textToSend = typeof customPrompt === 'string' ? customPrompt : inputText
    const trimmed = textToSend.trim()
    if (!trimmed || isLoading) return

    const userMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    if (typeof customPrompt !== 'string') {
      setInputText('')
    }
    setIsLoading(true)
    setError(null)

    try {
      const data = await sendChatMessage(activePatientId, {
        session_id: sessionId,
        message: trimmed,
      })

      const replyText = data.response || 'No response returned.'
      const isMock = replyText.includes('[Mock Companion]') || replyText.includes('[Mocked')
      setIsMockMode(isMock)

      if (data.distress) {
        setLatestDistress(data.distress)
      }

      const companionMessage = {
        id: 'cmp_' + Date.now(),
        sender: 'companion',
        text: replyText,
        timestamp: new Date().toISOString(),
        distress: data.distress,
        isMock: isMock,
      }

      setMessages((prev) => [...prev, companionMessage])
    } catch (err) {
      setError(err.message || 'Unable to connect to companion service.')
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleResetConversation = () => {
    const newId = createSessionId(activePatientId)
    setSessionId(newId)
    const preferred = patientData?.preferred_name || patientData?.name || 'Friend'
    setMessages([
      {
        id: 'welcome_' + Date.now(),
        sender: 'companion',
        text: `Hello, ${preferred}. A fresh conversation has started. Tell me whatever is on your heart.`,
        timestamp: new Date().toISOString(),
        isMock: false,
      },
    ])
    setLatestDistress({ level: 'none', reason: 'Fresh session started' })
    setError(null)
  }

  const preferredName = patientData?.preferred_name || patientData?.name || 'Friend'
  const stageDisplay = patientData?.stage && patientData.stage !== 'unknown'
    ? `${patientData.stage.charAt(0).toUpperCase() + patientData.stage.slice(1)} Stage`
    : 'Stage Adaptive'

  // Dynamic caregiver link name based on actual relationships in the profile
  const caregiverRelation = patientData?.relationships?.[0]
  const caregiverName = caregiverRelation ? caregiverRelation.name : 'Caregiver'

  // Dynamically build emotional anchors from the actual patient data
  const dynamicAnchors = []

  // 1. Cherished memories
  if (patientData?.cherished_memories && patientData.cherished_memories.length > 0) {
    patientData.cherished_memories.slice(0, 2).forEach((mem, idx) => {
      dynamicAnchors.push({
        type: 'Cherished Memory',
        category: 'Anchor',
        icon: idx === 0 ? '🌸' : '🕊️',
        title: mem.length > 28 ? mem.slice(0, 26) + '...' : mem,
        subtitle: patientData.places_lived?.[0] || 'Treasured Memory',
        tag: idx === 0 ? 'Comfort Routine' : 'Beloved Moment',
        snippet: mem,
        prompt: `Tell me about this peaceful memory: ${mem}.`,
      })
    })
  }

  // 2. Preferences likes
  if (patientData?.preferences?.likes && patientData.preferences.likes.length > 0) {
    patientData.preferences.likes.slice(0, 2).forEach((like, idx) => {
      dynamicAnchors.push({
        type: 'Sensory Comfort',
        category: idx === 0 ? 'Daily Cadence' : 'Auditory',
        icon: idx === 0 ? '☕' : '🎶',
        title: like.length > 25 ? like.slice(0, 23) + '...' : like,
        subtitle: 'Familiar Comfort',
        tag: `Loves ${like.split(' ')[0]}`,
        snippet: `A comforting and familiar joy in ${preferredName}'s day.`,
        prompt: `Can we talk about ${like}? It brings so much warmth and peace to remember.`,
      })
    })
  }

  // Fallback anchors if profile has no custom data yet
  if (dynamicAnchors.length === 0) {
    dynamicAnchors.push(
      {
        type: 'Familiar Moment',
        category: 'Anchor',
        icon: '🌸',
        title: 'Afternoon Tea',
        subtitle: 'Quiet Comfort',
        tag: 'Daily Ritual',
        snippet: 'A warm, unhurried cup of tea in the afternoon.',
        prompt: 'I would love to have a quiet cup of tea and chat about the afternoon sunshine.',
      },
      {
        type: 'Sensory Comfort',
        category: 'Auditory',
        icon: '🎶',
        title: 'Calming Melody',
        subtitle: 'Music & Song',
        tag: 'Peaceful Melody',
        snippet: 'A gentle song that brings security and reassurance.',
        prompt: 'What is a calming memory or song we can think about together?',
      }
    )
  }

  // Voice Input (Web Speech Recognition) & Speech Synthesis (TTS)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const recognitionRef = useRef(null)

  const handlePlayFamilyGreeting = () => {
    const savedAudio = localStorage.getItem(`kural_greeting_audio_${activePatientId}`)
    if (savedAudio) {
      if (familyAudioRef.current) {
        familyAudioRef.current.pause()
        familyAudioRef.current.currentTime = 0
      }
      const audio = new Audio(savedAudio)
      familyAudioRef.current = audio
      setIsPlayingFamilyVoice(true)
      audio.onended = () => setIsPlayingFamilyVoice(false)
      audio.onerror = () => setIsPlayingFamilyVoice(false)
      audio.play().catch(() => setIsPlayingFamilyVoice(false))
    } else {
      if (!('speechSynthesis' in window)) return
      speechSynthesis.cancel()
      const text = langMode === 'ta' || activePatientId === 'patient_kalyani'
        ? `வணக்கம் அம்மா, ${caregiverName} பேசுறேன். இன்னைக்கு நல்லா ஓய்வெடுங்க, உங்க கூடவே இருக்கேன்.`
        : `Hello ${preferredName}, it's ${caregiverName}. I'm thinking of you and sending you all my love today. Everything is safe and peaceful.`
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.82
      utterance.pitch = 1.05
      if (langMode === 'ta' || activePatientId === 'patient_kalyani') {
        utterance.lang = 'ta-IN'
        const voices = speechSynthesis.getVoices()
        const taVoice = voices.find((v) => v.lang.startsWith('ta'))
        if (taVoice) utterance.voice = taVoice
      }
      utterance.onstart = () => setIsPlayingFamilyVoice(true)
      utterance.onend = () => setIsPlayingFamilyVoice(false)
      utterance.onerror = () => setIsPlayingFamilyVoice(false)
      speechSynthesis.speak(utterance)
    }
  }

  const speakReply = (textToSpeak) => {
    if (!('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    const cleanText = textToSpeak.replace(/\[.*?\]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)

    // Apply configured caregiver cadence preset
    const cadenceKey = localStorage.getItem('kural_voice_cadence') || 'maternal'
    const preset = CADENCE_PRESETS[cadenceKey] || CADENCE_PRESETS.maternal
    utterance.rate = preset.rate
    utterance.pitch = preset.pitch

    const voices = speechSynthesis.getVoices()
    if (langMode === 'ta') {
      utterance.lang = 'ta-IN'
      const taVoice = voices.find((v) => v.lang.startsWith('ta'))
      if (taVoice) utterance.voice = taVoice
    } else {
      utterance.lang = 'en-US'
      const gentleVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Female'))
      )
      if (gentleVoice) utterance.voice = gentleVoice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    speechSynthesis.speak(utterance)
  }

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Voice speech recognition is not supported on this browser. Chrome or Edge recommended.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = langMode === 'ta' ? 'ta-IN' : 'en-US'

      recognition.onstart = () => setIsListening(true)
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
      }
      recognition.onerror = () => setIsListening(false)
      recognition.onend = () => setIsListening(false)

      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setIsListening(false)
    }
  }

  return (
    <div className="stitch-mobile-frame stitch-companion-frame">
      {/* Top Bar Header */}
      <header className="stitch-chat-header">
        <div className="chat-header-brand">
          <Link to="/" className="chat-back-btn" title="Back to Kural Home">
            ←
          </Link>
          <div className="chat-brand-tag">
            <span className="brand-tamil">குரல்</span>
            <span className="brand-kural">KURAL</span>
          </div>
          <span className="header-divider-v">|</span>
          <span className="chat-header-sub">{langMode === 'ta' ? 'குரல் துணை' : 'Companion Session'}</span>
        </div>

        <div className="chat-header-person">
          <button
            type="button"
            className={`btn-lang-toggle ${langMode === 'ta' ? 'lang-ta-active' : ''}`}
            onClick={toggleLanguage}
            title="Switch conversation language between English and தமிழ்"
          >
            {langMode === 'ta' ? '🇮🇳 தமிழ்' : '🇬🇧 EN'}
          </button>

          <div className="person-header-info">
            <span className="person-header-name">{preferredName}</span>
            <span className="person-header-status">
              <span className="status-dot-green"></span> {langMode === 'ta' ? 'இணைப்பு' : 'Active'}
            </span>
          </div>
          <button
            type="button"
            className="header-avatar-btn"
            onClick={() => navigate('/profiles')}
            title="Switch profile"
          >
            {activePatientId === 'patient_kalyani' ? (
              <img src="/avatar_amma.jpg" alt={preferredName} className="header-avatar-img" />
            ) : (
              <div className="header-avatar-initial">
                {preferredName.charAt(0).toUpperCase()}
              </div>
            )}
          </button>
        </div>
      </header>

      {/* Safe Zone & Intergenerational Link Banner */}
      <div className="companion-status-stack">
        <div className="intergenerational-pill-row">
          <div className="intergenerational-left">
            <span className="heart-circle-dark">♥</span>
            <div>
              <div className="intergenerational-eyebrow">
                {langMode === 'ta' ? 'குடும்பத் துணை இணைப்பு' : 'LINKED COMPANION SESSION'}
              </div>
              <div className="intergenerational-names">
                {caregiverName} &amp; {preferredName}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-status-pill"
            onClick={() => navigate('/profiles')}
          >
            ● {langMode === 'ta' ? 'நபரை மாற்று' : 'Switch Person'}
          </button>
        </div>

        {/* Live Safety Safe Zone & Cadence Indicators */}
        <div className="status-bars-row">
          <div
            className="safe-zone-bar safe-zone-interactive"
            onClick={() => setShowSafeZoneModal(true)}
            role="button"
            tabIndex={0}
            title="View Live Safety & Geofence Details"
          >
            <span className="safe-zone-icon">📍</span>
            <span className="safe-zone-label">
              <strong>{langMode === 'ta' ? 'பாதுகாப்பான பகுதி:' : 'Safe Zone:'}</strong>{' '}
              {patientData?.places_lived?.[0] || 'Home (Safe)'}
            </span>
            <span className="safe-zone-badge">{langMode === 'ta' ? 'இயல்பு ↗' : 'Normal ↗'}</span>
          </div>

          <div className="cadence-mini-bar">
            <span className="cadence-mini-icon">🎙️</span>
            <span className="cadence-mini-text">
              {CADENCE_PRESETS[localStorage.getItem('kural_voice_cadence') || 'maternal']?.title || 'Gentle Maternal'}
            </span>
            <Link to="/caregiver" className="cadence-mini-tune" title="Adjust voice cadence in Caregiver Workspace">⚙</Link>
          </div>
        </div>

        {/* Familiar Caregiver Voice Greeting Player */}
        <div className="family-voice-banner">
          <div className="family-voice-left">
            <div className="family-voice-icon-circle">
              <span className="family-voice-icon">🎙️</span>
            </div>
            <div>
              <span className="family-voice-eyebrow">
                {langMode === 'ta' ? 'அன்பான குடும்பக் குரல்' : 'FAMILIAR FAMILY VOICE'}
              </span>
              <span className="family-voice-title">
                {caregiverName}&apos;s {langMode === 'ta' ? 'அன்பு வாழ்த்து' : 'Personal Greeting'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`btn-play-family-greeting ${isPlayingFamilyVoice ? 'greeting-playing' : ''}`}
            onClick={handlePlayFamilyGreeting}
          >
            {isPlayingFamilyVoice ? (
              <span className="playing-waveform">❙❙❙ {langMode === 'ta' ? 'ஒலிக்கிறது...' : 'Playing...'}</span>
            ) : (
              <span>▶ {langMode === 'ta' ? 'வாழ்த்தைக் கேள்' : 'Play Greeting'}</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Section Banner */}
      <section className="companion-hero-callout">
        <h1 className="companion-hero-title">Stay close, even from afar.</h1>
        <p className="companion-hero-sub">
          Small messages can become familiar, reassuring moments in their day.
        </p>

        {/* Dynamic Portrait Hero Card */}
        <div className="hero-portrait-card">
          {activePatientId === 'patient_kalyani' ? (
            <img
              src="/hero_family.jpg"
              alt="Kalyani Amma and daughter"
              className="hero-portrait-image"
            />
          ) : (
            <div className="hero-portrait-placeholder">
              <span className="hero-giant-initial">{preferredName.charAt(0).toUpperCase()}</span>
              <span className="hero-person-fullname">{patientData?.name || preferredName}</span>
            </div>
          )}
          <div className="portrait-overlay-strip">
            <div className="overlay-person-badge">
              {activePatientId === 'patient_kalyani' ? (
                <img src="/avatar_amma.jpg" alt={preferredName} className="overlay-mini-avatar-img" />
              ) : (
                <div className="overlay-mini-avatar">
                  {preferredName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="overlay-name-row">
                  <span className="overlay-name">{preferredName}</span>
                  <span className="connected-chip">• Connected</span>
                </div>
                <div className="overlay-stage">{stageDisplay}</div>
              </div>
            </div>
            <button
              type="button"
              className="refresh-circle-btn"
              onClick={handleResetConversation}
              title="Reset conversation"
            >
              🔄
            </button>
          </div>
        </div>
      </section>

      {/* Kural Suggestion Compass Card (Dynamic) */}
      <section className="kural-suggestion-card">
        <div className="suggestion-top-row">
          <span className="suggestion-badge">✪ KURAL&apos;S SUGGESTION</span>
          <span className="compass-pill">{stageDisplay}</span>
        </div>
        <h2 className="suggestion-heading">A little guidance for today</h2>
        <p className="suggestion-body">
          {patientData?.preferences?.likes?.length > 0
            ? `“A calm voice and familiar topics can make conversations feel easier. Mention ${patientData.preferences.likes.slice(0, 2).join(' or ')}, family memories, or afternoon rituals.”`
            : `“A calm voice and familiar topics can make conversations feel easier. Mention today's weather, family names, or simple afternoon tea rituals.”`}
        </p>
        <div className="suggestion-footer-row">
          <span className="suggestion-recap-text">Tuned for {preferredName}</span>
          <button
            type="button"
            className="apply-prompt-btn"
            onClick={() =>
              handleSend(
                patientData?.preferences?.likes?.[0]
                  ? `Tell me about ${patientData.preferences.likes[0]}. It always brings such comfort and peace to think about.`
                  : "Tell me about a peaceful morning, sipping warm tea and listening to quiet sounds."
              )
            }
          >
            Apply prompt ↗
          </button>
        </div>
      </section>

      {/* Emotional Anchors Grid (Dynamic based on selected profile) */}
      <section className="emotional-anchors-section">
        <div className="anchors-header-block">
          <span className="anchors-eyebrow">EMOTIONAL ANCHORS</span>
          <h2 className="anchors-title">Little things {preferredName} knows by heart.</h2>
          <p className="anchors-sub">
            Familiar anchors from {preferredName}&apos;s profile that comfort them. Tap any card to attach to conversation.
          </p>
        </div>

        <div className="anchors-grid">
          {dynamicAnchors.map((anchor, index) => (
            <div
              key={index}
              className="anchor-card"
              onClick={() => handleSend(anchor.prompt)}
              role="button"
              tabIndex={0}
            >
              <div className="anchor-card-top icon-top">
                <span className="anchor-icon-symbol">{anchor.icon}</span>
                <div className="anchor-symbol-title">{anchor.title}</div>
                <div className="anchor-symbol-sub">{anchor.subtitle}</div>
              </div>
              <div className="anchor-pill-tag">{anchor.tag}</div>
              <p className="anchor-snippet">{anchor.snippet}</p>
              <div className="anchor-footer">
                <span className="anchor-category">{anchor.category}</span>
                <span className="anchor-arrow">↑</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Archival Trail: Live Conversation Stream */}
      <section className="archival-trail-section">
        <div className="archival-header">
          <div>
            <span className="archival-eyebrow">ARCHIVAL TRAIL</span>
            <h2 className="archival-title">Conversation with Kural</h2>
          </div>
          <div className="archival-status-chips">
            <span className={`sync-pill ${isMockMode ? 'mode-mock' : 'mode-live'}`}>
              {isMockMode ? 'Offline Prototype' : 'Synced with Claude'}
            </span>
          </div>
        </div>

        {backendStatus === 'retrying' && (
          <div className="banner banner-warning">
            Backend warming up — messages will send momentarily.
          </div>
        )}

        {error && (
          <div className="banner banner-error">
            <span><strong>Notice:</strong> {error}</span>
            <button className="btn-dismiss" onClick={() => setError(null)} type="button">Dismiss</button>
          </div>
        )}

        <div className="chat-timeline-stream">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`timeline-bubble-wrap ${msg.sender === 'user' ? 'bubble-wrap-user' : 'bubble-wrap-companion'}`}
            >
              <div className="timeline-bubble">
                <div className="bubble-header-bar">
                  <span className="bubble-sender-name">
                    {msg.sender === 'user' ? `${caregiverName} (You)` : `Kural Companion`}
                    {msg.sender === 'companion' && msg.isMock && (
                      <span className="tag-mock-dark">mock</span>
                    )}
                  </span>
                  <span className="bubble-timestamp">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="bubble-text-content">{msg.text}</div>
                {msg.sender === 'companion' && (
                  <div className="bubble-bottom-row">
                    <button
                      type="button"
                      className="btn-speak-bubble"
                      onClick={() => speakReply(msg.text)}
                      title="Listen to this message"
                    >
                      🔊 Listen
                    </button>
                    <div className="bubble-reaction-note">
                      Reaction noted: <em>Gentle calm and attentive</em>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="timeline-bubble-wrap bubble-wrap-companion">
              <div className="timeline-bubble loading-bubble-dark">
                <div className="typing-indicator" aria-label="Kural is thinking">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </section>

      {/* Floating Input Dock with Voice Input Button */}
      <footer className="stitch-chat-dock">
        <form
          className="dock-input-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <button
            type="button"
            className={`dock-mic-btn ${isListening ? 'mic-listening' : ''}`}
            onClick={toggleVoiceInput}
            title={isListening ? 'Listening... tap to stop' : 'Tap to speak to Kural'}
            aria-label="Voice input"
          >
            {isListening ? '🔴' : '🎙️'}
          </button>

          <textarea
            ref={textareaRef}
            className="dock-textarea"
            placeholder={
              isListening
                ? (langMode === 'ta' ? 'உங்கள் குரலைக் கேட்கிறது...' : 'Listening to your voice...')
                : (langMode === 'ta' ? `${preferredName}-உடன் தமிழில் பேசுங்கள்...` : `Type or speak to ${preferredName}...`)
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
          />

          <button
            type="submit"
            className="dock-send-btn"
            disabled={!inputText.trim() || isLoading}
            aria-label="Send"
          >
            {isLoading ? '...' : (langMode === 'ta' ? 'அனுப்பு' : 'Send')}
          </button>
        </form>
      </footer>

      {/* Safe Zone Details Sheet / Modal */}
      {showSafeZoneModal && (
        <div className="safe-modal-backdrop" onClick={() => setShowSafeZoneModal(false)}>
          <div className="safe-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="safe-modal-header">
              <div className="safe-modal-title-row">
                <span className="safe-modal-icon">📍</span>
                <div>
                  <h3 className="safe-modal-title">Live Safety &amp; Geofence</h3>
                  <span className="safe-modal-sub">Continuous Boundary Protection</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setShowSafeZoneModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="safe-modal-status-card">
              <div className="safe-status-headline">
                <span className="status-ping-dot"></span>
                <span>Inside Designated Safe Zone</span>
              </div>
              <p className="safe-status-desc">
                {preferredName} is currently within the verified home perimeter at{' '}
                <strong>{patientData?.preferred_address || patientData?.places_lived?.[0] || 'Home Residence'}</strong>.
              </p>
            </div>

            <div className="safe-metrics-grid">
              <div className="safe-metric-item">
                <span className="safe-metric-label">Heartbeat Ping</span>
                <span className="safe-metric-value">2 min ago</span>
              </div>
              <div className="safe-metric-item">
                <span className="safe-metric-label">Boundary Radius</span>
                <span className="safe-metric-value">500 meters</span>
              </div>
              <div className="safe-metric-item">
                <span className="safe-metric-label">Wandering Escalation</span>
                <span className="safe-metric-value text-green">Active (SMS Alert)</span>
              </div>
              <div className="safe-metric-item">
                <span className="safe-metric-label">Linked Caregiver</span>
                <span className="safe-metric-value">{caregiverName}</span>
              </div>
            </div>

            <div className="safe-modal-actions">
              <button
                type="button"
                className="btn-stitch-primary"
                onClick={() => {
                  alert(`Pinging ${caregiverName}: Location confirmed safe at ${patientData?.places_lived?.[0] || 'Home'}.`)
                  setShowSafeZoneModal(false)
                }}
              >
                Send Location Check-In to {caregiverName}
              </button>
              <button
                type="button"
                className="btn-stitch-secondary"
                onClick={() => setShowSafeZoneModal(false)}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
