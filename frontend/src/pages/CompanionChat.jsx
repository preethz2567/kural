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
  
  // Selected patient ID from localStorage, defaults to patient_001
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
  const [patientContext, setPatientContext] = useState('Loading companion...')
  const [latestDistress, setLatestDistress] = useState({ level: 'none', reason: 'Awaiting user input' })
  const [isMockMode, setIsMockMode] = useState(false)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Initialize or reload when activePatientId changes
  useEffect(() => {
    const controller = new AbortController()
    let retryTimer = null

    async function init() {
      // 1. Health check
      try {
        const result = await checkBackendHealth({ signal: controller.signal })
        if (result.online) {
          setBackendStatus(true)
        } else if (result.retrying) {
          setBackendStatus('retrying')
          retryTimer = setTimeout(async () => {
            if (controller.signal.aborted) return
            const retry = await checkBackendHealth({ signal: controller.signal }).catch(() => ({ online: false, retrying: false }))
            if (!controller.signal.aborted) setBackendStatus(retry.online ? true : false)
          }, 8000)
        } else {
          setBackendStatus(false)
        }
      } catch {
        if (!controller.signal.aborted) setBackendStatus(false)
      }

      // 2. Fetch specific person's profile
      try {
        const patient = await fetchPatient(activePatientId, { signal: controller.signal })
        setPatientData(patient)
        const preferred = patient.preferred_name || patient.name || 'Friend'
        const stage = patient.stage && patient.stage !== 'unknown'
          ? `${patient.stage.charAt(0).toUpperCase() + patient.stage.slice(1)} Stage`
          : 'Stage Adaptive'
        setPatientContext(`${preferred} · ${stage}`)

        // Create warm personalized welcome message
        const welcomeText = patient.cherished_memories?.length > 0
          ? `Hello, ${preferred}. It is lovely to sit and talk with you. I am right here keeping you company. How are you feeling today?`
          : `Hello, ${preferred}. Take your time, and tell me whatever is on your mind. I am right here with you.`

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
        setPatientContext('Nell · Mid Stage')
        setMessages([
          {
            id: 'welcome_fallback',
            sender: 'companion',
            text: "Hello. It is wonderful to sit together today. Take your time, and tell me whatever is on your mind.",
            timestamp: new Date().toISOString(),
            isMock: false,
          },
        ])
      }
    }

    init()
    return () => {
      controller.abort()
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [activePatientId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Dynamic conversation starters based on the person's profile
  const conversationStarters = patientData?.preferences?.likes?.length > 0
    ? patientData.preferences.likes.slice(0, 4).map((like) => ({
        label: `🌸 ${like.charAt(0).toUpperCase() + like.slice(1)}`,
        prompt: `Tell me about ${like}. It always brings a quiet sense of comfort.`,
      }))
    : [
        { label: '🌸 The Garden', prompt: 'Tell me about the conservatory garden and flowers.' },
        { label: '☀️ Afternoon Sunshine', prompt: 'How is the afternoon sunshine today?' },
        { label: '☕ Quiet Tea Time', prompt: 'I would love to have a quiet cup of tea and chat.' },
        { label: '🎶 Gentle Music', prompt: 'What is a calming memory or song we can think about?' },
      ]

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
      setError(err.message || 'Unable to connect to companion service. Please check backend status.')
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
        text: `Hello, ${preferred}. A fresh conversation has started. Take your time, and tell me whatever is on your mind.`,
        timestamp: new Date().toISOString(),
        isMock: false,
      },
    ])
    setLatestDistress({ level: 'none', reason: 'Fresh session started' })
    setError(null)
  }

  return (
    <div className="kural-app-container">
      {/* Header Bar */}
      <header className="kural-header">
        <div className="header-brand">
          <Link to="/" className="btn-nav-home" title="Back to Kural home">
            ← Home
          </Link>
          <div className="logo-badge" aria-hidden="true">K</div>
          <div>
            <h1 className="header-title">Kural</h1>
            <p className="header-subtitle">Warm, Stage-Adaptive AI Companion</p>
          </div>
        </div>

        <div className="header-controls">
          <button
            type="button"
            className="patient-pill"
            onClick={() => navigate('/profiles')}
            title="Click to switch or manage person profiles"
          >
            <span className="dot dot-active"></span>
            {patientContext}
            <span className="switch-arrow">⇄</span>
          </button>

          <div
            className={`mode-badge ${isMockMode ? 'mode-mock' : 'mode-live'}`}
            title={isMockMode ? 'Running in offline prototype mock mode' : 'Connected to live Claude AI'}
          >
            {isMockMode ? 'Mock Mode' : 'Live Claude AI'}
          </div>

          <button
            className="btn-reset"
            onClick={handleResetConversation}
            title="Start a new conversation session"
            type="button"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="chat-viewport">
        {/* Backend status banners */}
        {backendStatus === 'retrying' && (
          <div className="banner banner-warning">
            The companion service is waking up — this may take a moment on first visit. Your message will send once it is ready.
          </div>
        )}
        {backendStatus === false && (
          <div className="banner banner-warning">
            Companion service is currently unreachable. Responses will use the offline prototype mode until the service reconnects.
          </div>
        )}

        {error && (
          <div className="banner banner-error">
            <span><strong>Notice:</strong> {error}</span>
            <button className="btn-dismiss" onClick={() => setError(null)} type="button">Dismiss</button>
          </div>
        )}

        <div className="messages-stream" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-row ${msg.sender === 'user' ? 'message-row-user' : 'message-row-companion'}`}
            >
              <div className="message-bubble">
                <div className="message-header">
                  <span className="message-sender">
                    {msg.sender === 'user' ? 'You' : 'Kural'}
                    {msg.sender === 'companion' && msg.isMock && (
                      <span className="tag-mock">mock</span>
                    )}
                  </span>
                  <span className="message-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="message-content">{msg.text}</div>
              </div>
            </div>
          ))}

          {/* Gentle Conversation Starters (displayed when conversation is at the welcome state) */}
          {messages.length <= 1 && (
            <div className="conversation-starters-card">
              <p className="starters-prompt">You can type below or choose a peaceful topic to begin:</p>
              <div className="starters-grid">
                {conversationStarters.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    className="starter-btn"
                    onClick={() => handleSend(starter.prompt)}
                    disabled={isLoading}
                  >
                    {starter.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isLoading && (
            <div className="message-row message-row-companion">
              <div className="message-bubble loading-bubble">
                <div className="typing-indicator" aria-label="Kural is thinking">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Status & Input Dock */}
      <footer className="chat-dock">
        <div className="triage-status-bar">
          <div className="triage-item">
            <span className="triage-label">Companion Status:</span>
            <span className={`distress-badge distress-${latestDistress.level || 'none'}`}>
              {latestDistress.level === 'high'
                ? 'High Support Needed'
                : latestDistress.level === 'medium'
                ? 'Gentle Care'
                : latestDistress.level === 'low'
                ? 'Attentive'
                : 'Calm & Listening'}
            </span>
          </div>

          {latestDistress.reason && latestDistress.level !== 'none' && (
            <div className="triage-explanation" title={latestDistress.reason}>
              {latestDistress.reason}
            </div>
          )}

          <div className="session-tag" title="Active session identifier">
            Session: <code>{sessionId}</code>
          </div>
        </div>

        <form
          className="input-row"
          onSubmit={(e) => {
            e.preventDefault()
            handleSend()
          }}
        >
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder="Type a gentle message to Kural... (Enter to send, Shift+Enter for newline)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isLoading}
            aria-label="Message to Kural"
          />

          <button
            type="submit"
            className="btn-send"
            disabled={!inputText.trim() || isLoading}
            aria-label="Send message"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </form>

        <p className="disclaimer-text">
          Assistive companion prototype for demonstration. Not a certified clinical diagnostic tool.
        </p>
      </footer>
    </div>
  )
}
