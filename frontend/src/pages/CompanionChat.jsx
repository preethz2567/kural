import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import '../App.css'

function createSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2, 10)
}

function formatTime(isoString) {
  try {
    const date = isoString ? new Date(isoString) : new Date()
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

const CONVERSATION_STARTERS = [
  { label: '🌸 The Garden', prompt: 'Tell me about the conservatory garden and flowers.' },
  { label: '☀️ Afternoon Sunshine', prompt: 'How is the afternoon sunshine today?' },
  { label: '☕ Quiet Tea Time', prompt: 'I would love to have a quiet cup of tea and chat.' },
  { label: '🎶 Gentle Music', prompt: 'What is a calming memory or song we can think about?' },
]

export default function CompanionChat() {
  const [sessionId, setSessionId] = useState(createSessionId)
  const [messages, setMessages] = useState([
    {
      id: 'welcome_1',
      sender: 'companion',
      text: "Hello, Nell. It is wonderful to sit together today. Take your time, and tell me whatever is on your mind. I am right here with you.",
      timestamp: new Date().toISOString(),
      isMock: true,
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendOnline, setBackendOnline] = useState(null)
  const [patientContext, setPatientContext] = useState('Nell · Mid Stage')
  const [latestDistress, setLatestDistress] = useState({ level: 'none', reason: 'Awaiting user input' })
  const [isMockMode, setIsMockMode] = useState(true)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    // Check backend health and load non-sensitive patient header context
    fetch('/ping')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'ok') setBackendOnline(true)
      })
      .catch(() => setBackendOnline(false))

    fetch('/patient/patient_001')
      .then((res) => {
        if (!res.ok) throw new Error('Patient record unavailable')
        return res.json()
      })
      .then((patient) => {
        const preferred = patient.preferred_name || patient.name || 'Nell'
        const stage = patient.stage ? `${patient.stage.charAt(0).toUpperCase() + patient.stage.slice(1)} Stage` : 'Stage Adaptive'
        setPatientContext(`${preferred} · ${stage}`)
      })
      .catch(() => {
        setPatientContext('Nell · Mid Stage')
      })
  }, [])

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
      const response = await fetch('/chat/patient_001', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: trimmed,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Server returned status ${response.status}`)
      }

      const data = await response.json()
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
    const newId = createSessionId()
    setSessionId(newId)
    setMessages([
      {
        id: 'welcome_' + Date.now(),
        sender: 'companion',
        text: "Hello, Nell. A fresh conversation has started. Take your time, and tell me whatever is on your mind.",
        timestamp: new Date().toISOString(),
        isMock: true,
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
          <div className="patient-pill" title="Current Patient Context (Synthetic Fixture)">
            <span className="dot dot-active"></span>
            {patientContext}
          </div>

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
            Reset Session
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="chat-viewport">
        {backendOnline === false && (
          <div className="banner banner-warning">
            Backend is currently unreachable at <code>http://127.0.0.1:8000</code>. Please start the backend service.
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
                {CONVERSATION_STARTERS.map((starter) => (
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
