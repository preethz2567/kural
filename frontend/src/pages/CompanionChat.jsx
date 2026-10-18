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
        const preferred = patient.preferred_name || patient.name || 'Amma'
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
    const preferred = patientData?.preferred_name || patientData?.name || 'Amma'
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

  const preferredName = patientData?.preferred_name || patientData?.name || 'Amma'
  const stageDisplay = patientData?.stage ? `${patientData.stage.charAt(0).toUpperCase() + patientData.stage.slice(1)} Stage` : 'Mild Cognitive Impairment'

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
          <span className="chat-header-sub">Family Connection</span>
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
            <img src="/amma_hero.png" alt="Amma" className="header-avatar-img" />
          </button>
        </div>
      </header>

      {/* Intergenerational Link Banner */}
      <div className="intergenerational-pill-row">
        <div className="intergenerational-left">
          <span className="heart-circle-dark">♥</span>
          <div>
            <div className="intergenerational-eyebrow">INTERGENERATIONAL LINK</div>
            <div className="intergenerational-names">Meera &amp; {preferredName}</div>
          </div>
        </div>
        <button
          type="button"
          className="btn-status-pill"
          onClick={() => navigate('/profiles')}
        >
          ● Switch Profile
        </button>
      </div>

      {/* Main Section Banner */}
      <section className="companion-hero-callout">
        <h1 className="companion-hero-title">Stay close, even from afar.</h1>
        <p className="companion-hero-sub">
          Small messages can become familiar, reassuring moments in their day.
        </p>

        {/* Hero Card Container */}
        <div className="hero-portrait-card">
          <img
            src="/amma_hero.png"
            alt="Family holding hands warmly"
            className="hero-portrait-image"
          />
          <div className="portrait-overlay-strip">
            <div className="overlay-person-badge">
              <img src="/amma_hero.png" alt="Amma" className="overlay-mini-avatar" />
              <div>
                <div className="overlay-name-row">
                  <span className="overlay-name">{preferredName}</span>
                  <span className="connected-chip">• Connected</span>
                </div>
                <div className="overlay-stage">{stageDisplay} (Stage Adaptive)</div>
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

      {/* Kural Suggestion Compass Card */}
      <section className="kural-suggestion-card">
        <div className="suggestion-top-row">
          <span className="suggestion-badge">✪ KURAL&apos;S SUGGESTION</span>
          <span className="compass-pill">Stage Compass</span>
        </div>
        <h2 className="suggestion-heading">A little guidance for today</h2>
        <p className="suggestion-body">
          &ldquo;A calm voice and familiar topics can make conversations feel easier. Mention today&apos;s weather, family names, or simple afternoon tea rituals.&rdquo;
        </p>
        <div className="suggestion-footer-row">
          <span className="suggestion-recap-text">Integrated into companion pacing</span>
          <button
            type="button"
            className="apply-prompt-btn"
            onClick={() => handleSend("Tell me about a peaceful morning, sipping warm tea and listening to gentle music.")}
          >
            Apply prompt ↗
          </button>
        </div>
      </section>

      {/* Emotional Anchors Grid (Direct from Stitch Reference 2) */}
      <section className="emotional-anchors-section">
        <div className="anchors-header-block">
          <span className="anchors-eyebrow">EMOTIONAL ANCHORS</span>
          <h2 className="anchors-title">Little things they know by heart.</h2>
          <p className="anchors-sub">
            Familiar anchors that comfort them. Tap any card to attach into conversation.
          </p>
        </div>

        <div className="anchors-grid">
          {/* Card 1: Morning Ritual */}
          <div
            className="anchor-card"
            onClick={() => handleSend("Tell me about listening to morning ragas and having warm breakfast together.")}
            role="button"
            tabIndex={0}
          >
            <div className="anchor-card-top">
              <img src="/amma_hero.png" alt="Morning" className="anchor-img-thumb" />
            </div>
            <div className="anchor-pill-tag">Sunday mornings</div>
            <p className="anchor-snippet">Listening to morning ragas with steamed idlis.</p>
            <div className="anchor-footer">
              <span className="anchor-category">Anchor</span>
              <span className="anchor-arrow">↑</span>
            </div>
          </div>

          {/* Card 2: Sensory Garden */}
          <div
            className="anchor-card"
            onClick={() => handleSend("Tell me about the white night-blooming jasmine flowers in the old garden.")}
            role="button"
            tabIndex={0}
          >
            <div className="anchor-card-top icon-top">
              <span className="anchor-icon-symbol">🌸</span>
              <div className="anchor-symbol-title">Mylapore Garden</div>
              <div className="anchor-symbol-sub">Est. 1974</div>
            </div>
            <div className="anchor-pill-tag">Your old garden</div>
            <p className="anchor-snippet">White night-blooming jasmine (Malligai)...</p>
            <div className="anchor-footer">
              <span className="anchor-category">Sensory</span>
              <span className="anchor-arrow">↑</span>
            </div>
          </div>

          {/* Card 3: Brass Davarah */}
          <div
            className="anchor-card"
            onClick={() => handleSend("I would love to remember the sound of brass tumblers and morning filter coffee.")}
            role="button"
            tabIndex={0}
          >
            <div className="anchor-card-top icon-top">
              <span className="anchor-icon-symbol">☕</span>
              <div className="anchor-symbol-title">Brass Davarah</div>
              <div className="anchor-symbol-sub">Morning Ritual</div>
            </div>
            <div className="anchor-pill-tag">Filter coffee at 7 AM</div>
            <p className="anchor-snippet">Rhythmic clinking of brass tumblers.</p>
            <div className="anchor-footer">
              <span className="anchor-category">Daily cadence</span>
              <span className="anchor-arrow">↑</span>
            </div>
          </div>

          {/* Card 4: Beloved Song */}
          <div
            className="anchor-card"
            onClick={() => handleSend("Can we think about that soothing devotional melody that brings warmth and peace?")}
            role="button"
            tabIndex={0}
          >
            <div className="anchor-card-top icon-top">
              <span className="anchor-icon-symbol">🎶</span>
              <div className="anchor-symbol-title">குறை ஒன்றும் இல்லை</div>
              <div className="anchor-symbol-sub">Ragam Sivaranjani</div>
            </div>
            <div className="anchor-pill-tag">Beloved song</div>
            <p className="anchor-snippet">Devotional melody bringing warmth and security.</p>
            <div className="anchor-footer">
              <span className="anchor-category">Auditory</span>
              <span className="anchor-arrow">↑</span>
            </div>
          </div>
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
                    {msg.sender === 'user' ? 'Meera (You)' : `Kural Companion`}
                    {msg.sender === 'companion' && msg.isMock && (
                      <span className="tag-mock-dark">mock</span>
                    )}
                  </span>
                  <span className="bubble-timestamp">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="bubble-text-content">{msg.text}</div>
                {msg.sender === 'companion' && (
                  <div className="bubble-reaction-note">
                    Reaction noted: <em>Gentle calm during tea</em>
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
            placeholder="Type a gentle memory or thought to Kural... (Enter to send)"
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
