import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checkBackendHealth, fetchPatient, sendChatMessage } from '../api.js'
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

  const [sessionId, setSessionId] = useState(() => createSessionId(activePatientId))
  const [patientData, setPatientData] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState(null)
  const [latestDistress, setLatestDistress] = useState({ level: 'none', reason: 'Awaiting input' })
  const [isMockMode, setIsMockMode] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

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
        setMessages([
          {
            id: 'welcome_' + Date.now(),
            sender: 'companion',
            text: `Hello, ${preferred}. It is lovely to sit together today. Take your time, and tell me whatever is on your mind. I am right here with you.`,
            timestamp: new Date().toISOString(),
            isMock: false,
          },
        ])
      } catch {
        setMessages([
          {
            id: 'welcome_fallback',
            sender: 'companion',
            text: 'Hello. It is wonderful to sit together today. Take your time, and tell me whatever is on your mind.',
            timestamp: new Date().toISOString(),
            isMock: false,
          },
        ])
      }
    }

    init()
    return () => controller.abort()
  }, [activePatientId])

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
          <span className="chat-header-sub">Companion Session</span>
        </div>

        <div className="chat-header-person">
          <div className="person-header-info">
            <span className="person-header-name">{preferredName}</span>
            <span className="person-header-status">
              <span className="status-dot-green"></span> Active
            </span>
          </div>
          <button
            type="button"
            className="header-avatar-btn"
            onClick={() => navigate('/profiles')}
            title="Switch profile"
          >
            <div className="header-avatar-initial">
              {preferredName.charAt(0).toUpperCase()}
            </div>
          </button>
        </div>
      </header>

      {/* Intergenerational Link Banner (Dynamic) */}
      <div className="intergenerational-pill-row">
        <div className="intergenerational-left">
          <span className="heart-circle-dark">♥</span>
          <div>
            <div className="intergenerational-eyebrow">LINKED COMPANION SESSION</div>
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
          ● Switch Person
        </button>
      </div>

      {/* Main Section Banner */}
      <section className="companion-hero-callout">
        <h1 className="companion-hero-title">Stay close, even from afar.</h1>
        <p className="companion-hero-sub">
          Small messages can become familiar, reassuring moments in their day.
        </p>

        {/* Dynamic Portrait Hero Card */}
        <div className="hero-portrait-card">
          <div className="hero-portrait-placeholder">
            <span className="hero-giant-initial">{preferredName.charAt(0).toUpperCase()}</span>
            <span className="hero-person-fullname">{patientData?.name || preferredName}</span>
          </div>
          <div className="portrait-overlay-strip">
            <div className="overlay-person-badge">
              <div className="overlay-mini-avatar">
                {preferredName.charAt(0).toUpperCase()}
              </div>
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
                  <div className="bubble-reaction-note">
                    Reaction noted: <em>Gentle calm and attentive</em>
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

      {/* Floating Input Dock */}
      <footer className="stitch-chat-dock">
        <form
          className="dock-input-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <textarea
            ref={textareaRef}
            className="dock-textarea"
            placeholder={`Type a gentle message to ${preferredName}... (Enter to send)`}
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
            {isLoading ? '...' : 'Send'}
          </button>
        </form>
      </footer>
    </div>
  )
}
