import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { checkBackendHealth, fetchPatient, sendChatMessage, listPatients } from '../api.js'
import { CADENCE_PRESETS } from '../cadencePresets.js'
import { playClonedAudio, unlockAudio } from '../audioUtils.js'
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

function recordDistressTurn(patientId, sessionId, userText, distress) {
  try {
    const key = `kural_session_distress_${patientId || 'patient_kalyani'}`
    const raw = localStorage.getItem(key)
    const existing = raw ? JSON.parse(raw) : { turns: [] }
    const updatedTurns = [
      ...(Array.isArray(existing.turns) ? existing.turns : []),
      {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        userMessage: userText,
        level: distress?.level || 'none',
        matchedKeywords: distress?.matched_keywords || [],
        reason: distress?.reason || '',
        escalated: !!distress?.escalated,
      },
    ].slice(-40)
    localStorage.setItem(
      key,
      JSON.stringify({
        lastUpdated: new Date().toISOString(),
        sessionId,
        turns: updatedTurns,
      })
    )
  } catch (err) {
    console.warn('[Session Distress] Failed to record turn:', err)
  }
}

function formatReactionNote(distress) {
  if (!distress || distress.level === 'none') {
    return 'Reaction: Gentle calm & attentive'
  }
  if (distress.level === 'low') {
    return 'Reaction: Mild reassurance applied'
  }
  if (distress.level === 'medium') {
    return 'Reaction: Grounding cadence applied (confusion noted)'
  }
  if (distress.level === 'high') {
    return 'Reaction: Urgent de-escalation soothe (high distress flagged)'
  }
  return 'Reaction: Calm & attentive'
}

function loadSavedMessages(patientId) {
  try {
    const raw = localStorage.getItem(`kural_chat_messages_${patientId || 'patient_kalyani'}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (err) {
    console.warn('[Session] Failed to load messages:', err)
  }
  return null
}

function saveSavedMessages(patientId, msgs) {
  try {
    localStorage.setItem(`kural_chat_messages_${patientId || 'patient_kalyani'}`, JSON.stringify(msgs))
  } catch (err) {
    console.warn('[Session] Failed to save messages:', err)
  }
}

const COMFORT_CHIPS = {
  patient_kalyani: [
    { label: '🌸 மல்லிகைத் தோட்டம்', prompt: 'அம்மா, காலையில மல்லிகைப் பூ பறிச்ச வாசனை ஞாபகம் இருக்கா? தோட்டம் எவ்வளவு அமைதியா இருந்தது!' },
    { label: '☕ டிகிரி காபி', prompt: 'அம்மா, பித்தளை டம்ளரில் நுரை பொங்க மணக்க மணக்க டிகிரி காபி குடித்த ஞாபகம் இருக்கா?' },
    { label: '📻 எம்.எஸ். அம்மா பாடல்', prompt: 'அம்மா, விடியற்காலையில் வானொலியில் ஒலித்த எம்.எஸ். சுப்புலட்சுமியின் வெங்கடேச சுப்ரபாதம் எவ்வளவு அமைதி தரும்!' },
    { label: '🌿 துளசி மாட பூஜை', prompt: 'அம்மா, மாலை விளக்கேற்றி துளசி மாடத்தை வலம் வந்த அந்த அழகான நினைவுகளைப் பேசுவோமா?' },
    { label: '🛕 மயிலாப்பூர் கபாலி', prompt: 'அம்மா, மயிலாப்பூர் கபாலீஸ்வரர் கோவில் குளக்கரை தென்றல் காற்று எவ்வளவு மன அமைதி தந்தது!' },
  ],
  patient_001: [
    { label: '🌸 Camellia Blooms', prompt: 'Nell, do you remember the winter camellias blooming in the glass conservatory? They were so vibrant.' },
    { label: '🍵 Afternoon Tea', prompt: 'Nell, let us sit and imagine having a warm cup of Earl Grey tea with shortbread biscuits.' },
    { label: '📖 Herbarium Journal', prompt: 'Nell, tell me about your botanical sketches of pressed mountain ferns and wildflowers.' },
    { label: '🐱 Barnaby the Cat', prompt: 'Nell, do you remember sweet Barnaby sleeping in the sunlit greenhouse beside the terra cotta pots?' },
    { label: '🌿 Lavender Walk', prompt: 'Nell, remember the sweet calming scent of lavender along the garden pathway in early summer?' },
  ],
}

export default function CompanionChat() {
  const navigate = useNavigate()

  // Default to Kalyani Amma (patient_kalyani)
  const [activePatientId, setActivePatientId] = useState(() => {
    const stored = localStorage.getItem('kural_active_patient_id')
    const isCustom = stored && stored !== 'patient_001' && stored !== 'patient_kalyani'
    return isCustom ? stored : 'patient_kalyani'
  })

  // Default to Tamil for Kalyani, English for Nell
  const [langMode, setLangMode] = useState(() => {
    const stored = localStorage.getItem('kural_lang_mode')
    if (stored) return stored
    const patientId = localStorage.getItem('kural_active_patient_id') || 'patient_kalyani'
    return patientId === 'patient_kalyani' ? 'ta' : 'en'
  })

  // View mode: 'chat' (active focused conversation) or 'overview' (memories & anchors)
  const [activeViewMode, setActiveViewMode] = useState(() => {
    return 'chat'
  })

  const [sessionId, setSessionId] = useState(() => createSessionId(activePatientId))
  const [patientData, setPatientData] = useState(null)
  const [messages, setMessages] = useState(() => {
    const saved = loadSavedMessages(activePatientId)
    return saved || []
  })
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState(null)
  const [latestDistress, setLatestDistress] = useState({ level: 'none', reason: 'Awaiting input' })
  const [isMockMode, setIsMockMode] = useState(false)
  const [showSafeZoneModal, setShowSafeZoneModal] = useState(false)
  const [isPlayingFamilyVoice, setIsPlayingFamilyVoice] = useState(false)
  const [checkInSent, setCheckInSent] = useState(false)
  const [autoVoiceEnabled, setAutoVoiceEnabled] = useState(() => {
    return localStorage.getItem('kural_auto_voice') !== 'false'
  })
  const [isClonedAudio, setIsClonedAudio] = useState(false)
  const [currentSpeaker, setCurrentSpeaker] = useState('Caregiver')
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const [allPatients, setAllPatients] = useState([])
  const [speakingMessageId, setSpeakingMessageId] = useState(null)

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const familyAudioRef = useRef(null)
  const clonedAudioRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    return () => {
      if (clonedAudioRef.current) {
        clonedAudioRef.current.pause()
        clonedAudioRef.current = null
      }
      if (familyAudioRef.current) {
        familyAudioRef.current.pause()
        familyAudioRef.current = null
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
    }
  }, [])

  // Load available elder profiles for 1-tap switcher
  useEffect(() => {
    listPatients()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllPatients(data)
        }
      })
      .catch(() => {
        setAllPatients([
          { patient_id: 'patient_kalyani', name: 'Kalyani', preferred_name: 'Amma', language: 'Tamil', stage: 'moderate' },
          { patient_id: 'patient_001', name: 'Eleanor Vance', preferred_name: 'Nell', language: 'English', stage: 'mild' },
        ])
      })
  }, [])

  // Close patient dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) && !e.target.closest('.person-header-pill')) {
        setShowPatientDropdown(false)
      }
    }
    if (showPatientDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPatientDropdown])

  const handleSwitchPatient = (newId, defaultLang) => {
    if (newId === activePatientId) {
      setShowPatientDropdown(false)
      return
    }
    stopSpeaking()
    setActivePatientId(newId)
    localStorage.setItem('kural_active_patient_id', newId)
    setSessionId(createSessionId(newId))
    const nextLang = defaultLang || (newId === 'patient_kalyani' ? 'ta' : 'en')
    setLangMode(nextLang)
    localStorage.setItem('kural_lang_mode', nextLang)
    setShowPatientDropdown(false)

    // Load preserved conversation for switched patient
    const saved = loadSavedMessages(newId)
    if (saved && saved.length > 0) {
      setMessages(saved)
    } else {
      setMessages([])
    }
  }

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

        const isTamil = langMode === 'ta' || (patient.language && patient.language.toLowerCase().includes('tamil'))

        const welcomeText = isTamil
          ? `வணக்கம், ${preferred}. உங்களோடு அமைதியாகப் பேசுவதில் மிக்க மகிழ்ச்சி. பொறுமையாகப் பேசுங்கள், நான் எப்போதும் உங்களுடன்தான் இருக்கிறேன்.`
          : `Hello, ${preferred}. It is lovely to sit together today. Take your time, and tell me whatever is on your mind. I am right here with you.`

        // Check if there is an existing preserved conversation
        const saved = loadSavedMessages(activePatientId)
        if (saved && saved.length > 0) {
          setMessages(saved)
        } else {
          const initial = [
            {
              id: 'welcome_' + Date.now(),
              sender: 'companion',
              text: welcomeText,
              timestamp: new Date().toISOString(),
              isMock: false,
            },
          ]
          setMessages(initial)
          saveSavedMessages(activePatientId, initial)
        }
      } catch {
        const saved = loadSavedMessages(activePatientId)
        if (saved && saved.length > 0) {
          setMessages(saved)
        } else {
          const fallback = [
            {
              id: 'welcome_fallback',
              sender: 'companion',
              text: langMode === 'ta'
                ? 'வணக்கம். உங்களோடு பேசுவதில் மகிழ்ச்சி. பொறுமையாகப் பேசுங்கள்.'
                : 'Hello. It is wonderful to sit together today. Take your time, and tell me whatever is on your mind.',
              timestamp: new Date().toISOString(),
              isMock: false,
            },
          ]
          setMessages(fallback)
          saveSavedMessages(activePatientId, fallback)
        }
      }
    }

    init()
    return () => controller.abort()
  }, [activePatientId, langMode])

  useEffect(() => {
    if (activeViewMode === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading, activeViewMode])

  const handleSend = async (customPrompt) => {
    unlockAudio()
    const textToSend = typeof customPrompt === 'string' ? customPrompt : inputText
    const trimmed = textToSend.trim()
    if (!trimmed || isLoading) return

    // Automatically transition to chat view when a message is sent
    setActiveViewMode('chat')

    const userMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => {
      const updated = [...prev, userMessage]
      saveSavedMessages(activePatientId, updated)
      return updated
    })

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
      recordDistressTurn(activePatientId, sessionId, trimmed, data.distress || { level: 'none' })

      const companionMessage = {
        id: 'cmp_' + Date.now(),
        sender: 'companion',
        text: replyText,
        timestamp: new Date().toISOString(),
        distress: data.distress,
        isMock: isMock,
        audio: data.audio || null,
      }

      setMessages((prev) => {
        const updated = [...prev, companionMessage]
        saveSavedMessages(activePatientId, updated)
        return updated
      })

      // Automatic Voice Cloning Playback: immediately speaks in caregiver's voice
      if (autoVoiceEnabled) {
        playAudioResponse(data.audio, replyText, companionMessage.id)
      }
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
    try {
      localStorage.removeItem(`kural_session_distress_${activePatientId}`)
      localStorage.removeItem(`kural_chat_messages_${activePatientId}`)
    } catch {}
    const preferred = patientData?.preferred_name || patientData?.name || 'Friend'
    const isTamil = langMode === 'ta' || (patientData?.language && patientData.language.toLowerCase().includes('tamil'))
    const welcomeText = isTamil
      ? `வணக்கம், ${preferred}. இன்றைய புதிய உரையாடல் தொடங்கியது. அமைதியாகப் பேசுங்கள், நான் உங்களுடன்தான் இருக்கிறேன்.`
      : `Hello, ${preferred}. A fresh conversation has started. Tell me whatever is on your heart. I am right here with you.`
    const freshMessages = [
      {
        id: 'welcome_' + Date.now(),
        sender: 'companion',
        text: welcomeText,
        timestamp: new Date().toISOString(),
        isMock: false,
      },
    ]
    setMessages(freshMessages)
    saveSavedMessages(activePatientId, freshMessages)
    setLatestDistress({ level: 'none', reason: 'Fresh session started' })
    setError(null)
  }

  const preferredName = patientData?.preferred_name || patientData?.name || 'Friend'
  const stageDisplay = patientData?.stage && patientData.stage !== 'unknown'
    ? `${patientData.stage.charAt(0).toUpperCase() + patientData.stage.slice(1)} Stage Dementia`
    : 'Dementia Care'

  // Dynamic caregiver link name based on actual relationships in the profile
  const caregiverRelation = patientData?.relationships?.[0]
  const caregiverName = caregiverRelation ? caregiverRelation.name : (activePatientId === 'patient_kalyani' ? 'Meera' : 'Clara')

  // Dynamically build emotional anchors from the actual patient data
  const dynamicAnchors = []

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

  const stopSpeaking = () => {
    if (clonedAudioRef.current) {
      clonedAudioRef.current.stop?.()
      clonedAudioRef.current.pause?.()
      clonedAudioRef.current = null
    }
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
    setIsSpeaking(false)
    setIsClonedAudio(false)
    setSpeakingMessageId(null)
  }

  const toggleAutoVoice = () => {
    const next = !autoVoiceEnabled
    setAutoVoiceEnabled(next)
    localStorage.setItem('kural_auto_voice', String(next))
    if (!next) {
      stopSpeaking()
    }
  }

  const speakReply = (textToSpeak, msgId = null) => {
    if (!('speechSynthesis' in window)) return
    stopSpeaking()
    if (msgId) setSpeakingMessageId(msgId)
    const cleanText = textToSpeak.replace(/\[.*?\]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(cleanText)

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

    utterance.onstart = () => {
      setIsSpeaking(true)
      setIsClonedAudio(false)
      if (msgId) setSpeakingMessageId(msgId)
    }
    utterance.onend = () => {
      setIsSpeaking(false)
      setIsClonedAudio(false)
      setSpeakingMessageId(null)
    }
    utterance.onerror = () => {
      setIsSpeaking(false)
      setIsClonedAudio(false)
      setSpeakingMessageId(null)
    }
    speechSynthesis.speak(utterance)
  }

  const playAudioResponse = (audioData, textFallback, msgId = null) => {
    stopSpeaking()

    if (audioData?.audio_base64) {
      const speaker = audioData.speaker_name || caregiverName
      setCurrentSpeaker(speaker)
      setIsSpeaking(true)
      setIsClonedAudio(true)
      if (msgId) setSpeakingMessageId(msgId)

      const controller = playClonedAudio(audioData, {
        onStart: () => {
          setIsSpeaking(true)
          setIsClonedAudio(true)
          if (msgId) setSpeakingMessageId(msgId)
        },
        onEnded: () => {
          setIsSpeaking(false)
          setIsClonedAudio(false)
          setSpeakingMessageId(null)
          clonedAudioRef.current = null
        },
        onError: (err) => {
          console.warn('[Auto-Voice] Cloned neural playback error, falling back to local speech:', err)
          setIsSpeaking(false)
          setIsClonedAudio(false)
          setSpeakingMessageId(null)
          clonedAudioRef.current = null
          if (textFallback) speakReply(textFallback, msgId)
        },
      })
      clonedAudioRef.current = controller
      return
    }

    if (textFallback) {
      speakReply(textFallback, msgId)
    }
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
          <span className="chat-header-sub">{langMode === 'ta' ? 'நினைவுப் பராமரிப்பு' : 'Dementia Memory Care'}</span>
        </div>

        <div className="chat-header-person">
          <button
            type="button"
            className={`btn-auto-voice-toggle ${autoVoiceEnabled ? 'auto-voice-on' : 'auto-voice-off'}`}
            onClick={toggleAutoVoice}
            title={
              autoVoiceEnabled
                ? 'Auto-Voice ON: Cloned caregiver voice plays automatically for each reply. Tap to mute.'
                : 'Auto-Voice MUTED: Tap to enable automatic cloned speech.'
            }
            aria-label="Toggle auto voice playback"
          >
            {autoVoiceEnabled ? '🔊 Auto' : '🔇 Mute'}
          </button>

          <button
            type="button"
            className={`btn-lang-toggle ${langMode === 'ta' ? 'lang-ta-active' : ''}`}
            onClick={toggleLanguage}
            title="Switch conversation language between English and தமிழ்"
          >
            {langMode === 'ta' ? '🇮🇳 தமிழ்' : '🇬🇧 EN'}
          </button>

          {/* Quick Patient Switcher Pill with Chevron */}
          <div
            className={`person-header-pill ${showPatientDropdown ? 'pill-open' : ''}`}
            onClick={() => setShowPatientDropdown((prev) => !prev)}
            role="button"
            tabIndex={0}
            title="Switch between Kalyani Amma and Nell"
          >
            <div className="person-header-info">
              <span className="person-header-name">
                {preferredName} <span className="chevron-pill">{showPatientDropdown ? '▴' : '▾'}</span>
              </span>
              <span className="person-header-status">
                <span className="status-dot-green"></span> {langMode === 'ta' ? 'இணைப்பு' : 'Active'}
              </span>
            </div>
            <div className={`header-avatar-btn ${isSpeaking ? 'avatar-speaking-aura' : ''}`}>
              <img
                src={activePatientId === 'patient_kalyani' ? '/avatar_amma.jpg' : '/avatar_nell.jpg'}
                alt={preferredName}
                className="header-avatar-img"
              />
            </div>
          </div>
        </div>

        {/* Floating Patient Switcher Dropdown */}
        {showPatientDropdown && (
          <div className="patient-quick-dropdown" ref={dropdownRef}>
            <div className="dropdown-header-bar">
              <span className="dropdown-header-title">Switch Active Elder Profile</span>
              <span className="dropdown-current-tag">1-Tap Switch</span>
            </div>
            <div className="dropdown-patient-list">
              {allPatients.map((p) => {
                const isCurrent = p.patient_id === activePatientId
                const isTamil = p.patient_id === 'patient_kalyani' || (p.language && p.language.toLowerCase().includes('tamil'))
                return (
                  <button
                    key={p.patient_id}
                    type="button"
                    className={`dropdown-patient-card ${isCurrent ? 'current-patient' : ''}`}
                    onClick={() => handleSwitchPatient(p.patient_id, isTamil ? 'ta' : 'en')}
                  >
                    <div className="dropdown-avatar-wrap">
                      <img
                        src={p.patient_id === 'patient_kalyani' ? '/avatar_amma.jpg' : '/avatar_nell.jpg'}
                        alt={p.preferred_name || p.name}
                        className="dropdown-avatar-img"
                      />
                      {isCurrent && <span className="dropdown-active-dot" />}
                    </div>
                    <div className="dropdown-patient-meta">
                      <span className="dropdown-patient-name">
                        {p.preferred_name || p.name}
                        {isCurrent && <span className="badge-active-tag">Active</span>}
                      </span>
                      <span className="dropdown-patient-sub">
                        {isTamil ? '🇮🇳 Tamil Voice • Meera' : '🇬🇧 English Voice • Clara'}
                      </span>
                    </div>
                    <span className="dropdown-arrow">{isCurrent ? '✓' : '→'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
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
      </div>

      {/* View Mode Segmented Tab Switcher */}
      <div className="companion-view-tab-bar">
        <button
          type="button"
          className={`view-tab-pill ${activeViewMode === 'chat' ? 'view-tab-active' : ''}`}
          onClick={() => setActiveViewMode('chat')}
        >
          💬 {langMode === 'ta' ? 'உரையாடல்' : 'Conversation'}
          {messages.length > 0 && <span className="tab-count-badge">{messages.length}</span>}
        </button>
        <button
          type="button"
          className={`view-tab-pill ${activeViewMode === 'overview' ? 'view-tab-active' : ''}`}
          onClick={() => setActiveViewMode('overview')}
        >
          🌿 {langMode === 'ta' ? 'நினைவுகள் & சுவடுகள்' : 'Memories & Anchors'}
        </button>
      </div>

      {/* =========================================================================
          VIEW MODE 1: CHAT (Active, focused conversation stream)
          ========================================================================= */}
      {activeViewMode === 'chat' && (
        <div className="chat-focused-container">
          {/* Compact Elder Session Header */}
          <div className="chat-compact-bar">
            <div className="chat-compact-elder">
              <img
                src={activePatientId === 'patient_kalyani' ? '/avatar_amma.jpg' : '/avatar_nell.jpg'}
                alt={preferredName}
                className="chat-compact-avatar"
              />
              <div>
                <div className="chat-compact-name-row">
                  <span className="chat-compact-name">{preferredName}</span>
                  <span className="status-dot-green"></span>
                  <span className="chat-compact-status">{langMode === 'ta' ? 'இணைப்பு' : 'Connected'}</span>
                </div>
                <div className="chat-compact-sub">
                  🎙️ {caregiverName}&apos;s Cloned Voice • {stageDisplay}
                </div>
              </div>
            </div>
            <div className="chat-compact-actions">
              <button
                type="button"
                className={`chat-compact-play-btn ${isPlayingFamilyVoice ? 'greeting-playing' : ''}`}
                onClick={handlePlayFamilyGreeting}
                title="Play familiar family voice greeting"
              >
                {isPlayingFamilyVoice ? '❙❙ Playing' : '▶ Greeting'}
              </button>
              <button
                type="button"
                className="chat-compact-reset-btn"
                onClick={handleResetConversation}
                title="Start a fresh conversation and baseline tranquility for today"
              >
                🔄 Fresh Day
              </button>
            </div>
          </div>

          {/* Conversation Stream */}
          <section className="archival-trail-section chat-trail-focused">
            {backendStatus === 'retrying' && (
              <div className="banner banner-warning">
                Backend warming up - messages will send momentarily.
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
                  <div className={`timeline-bubble ${speakingMessageId === msg.id ? 'bubble-currently-speaking' : ''}`}>
                    <div className="bubble-header-bar">
                      <span className="bubble-sender-name">
                        {msg.sender === 'user' ? `${caregiverName} (You)` : `${preferredName}'s Kural`}
                        {msg.sender === 'companion' && msg.isMock && (
                          <span className="tag-mock-dark">mock</span>
                        )}
                        {speakingMessageId === msg.id && (
                          <span className="bubble-speaking-badge">
                            <span className="mini-bars">
                              <span className="m-bar mb-1"></span>
                              <span className="m-bar mb-2"></span>
                              <span className="m-bar mb-3"></span>
                            </span>
                            Speaking
                          </span>
                        )}
                      </span>
                      <span className="bubble-timestamp">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="bubble-text-content">{msg.text}</div>
                    {msg.sender === 'companion' && (
                      <div className="bubble-bottom-row">
                        <button
                          type="button"
                          className={`btn-speak-bubble ${speakingMessageId === msg.id ? 'bubble-is-playing' : ''}`}
                          onClick={() => {
                            if (speakingMessageId === msg.id) {
                              stopSpeaking()
                            } else if (msg.audio?.audio_base64) {
                              playAudioResponse(msg.audio, msg.text, msg.id)
                            } else {
                              speakReply(msg.text, msg.id)
                            }
                          }}
                          title={speakingMessageId === msg.id ? 'Stop audio' : 'Replay in voice'}
                        >
                          {speakingMessageId === msg.id ? '⏹ Stop' : isSpeaking ? '🔊 Replay' : '▶ Replay'}
                        </button>
                        {msg.audio?.speaker_name && (
                          <span className="cloned-voice-bubble-badge" title="Synthesized with open-source Coqui XTTS-v2 voice model">
                            🎙️ {msg.audio.speaker_name}&apos;s Cloned Voice
                          </span>
                        )}
                        <div className={`bubble-reaction-note reaction-level-${msg.distress?.level || 'none'}`}>
                          <span>{formatReactionNote(msg.distress)}</span>
                          {msg.distress?.matched_keywords?.length > 0 && (
                            <span className="reaction-trigger-tag">
                              Triggers: {msg.distress.matched_keywords.join(', ')}
                            </span>
                          )}
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

          {/* Live Cloned Speech Waveform Player Banner */}
          {isSpeaking && (
            <div className="live-speech-dock-banner">
              <div className="live-speech-content">
                <div className="speech-wave-anim" aria-label="Live audio frequency waveform">
                  <span className="wave-bar bar-1"></span>
                  <span className="wave-bar bar-2"></span>
                  <span className="wave-bar bar-3"></span>
                  <span className="wave-bar bar-4"></span>
                  <span className="wave-bar bar-5"></span>
                  <span className="wave-bar bar-6"></span>
                  <span className="wave-bar bar-7"></span>
                  <span className="wave-bar bar-8"></span>
                  <span className="wave-bar bar-9"></span>
                  <span className="wave-bar bar-10"></span>
                </div>
                <div className="live-speech-meta">
                  <span className="live-speech-speaker">
                    {isClonedAudio ? `🎙️ Speaking in ${currentSpeaker}'s Cloned Voice` : '🎙️ Speaking Companion Reply'}
                  </span>
                  <span className="live-speech-engine">
                    <span className="engine-pulse-dot" />
                    {isClonedAudio ? 'Coqui XTTS-v2 Active • LinuxONE Microservice' : 'Gentle Maternal Cadence'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn-live-speech-stop"
                onClick={stopSpeaking}
                title="Stop audio playback"
              >
                ⏹ Stop
              </button>
            </div>
          )}

          {/* Quick Comfort Anchor Topic Chips */}
          <div className="comfort-chips-strip">
            <span className="comfort-chips-label">
              {langMode === 'ta' ? 'அமைதி தரும் நினைவுகள்:' : 'Comfort Anchors:'}
            </span>
            <div className="comfort-chips-scroll">
              {(COMFORT_CHIPS[activePatientId] || COMFORT_CHIPS.patient_kalyani).map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="comfort-chip-btn"
                  onClick={() => handleSend(chip.prompt)}
                  disabled={isLoading}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sticky Docked Chat Input (Never scrolls away) */}
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
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: OVERVIEW (Memories, Anchors, Hero Photo, Guidance)
          ========================================================================= */}
      {activeViewMode === 'overview' && (
        <div className="overview-focused-container">
          {/* Familiar Caregiver Voice Greeting Player Banner */}
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

          {/* Main Section Banner */}
          <section className="companion-hero-callout">
            <h1 className="companion-hero-title">Voice Reassurance for Alzheimer&apos;s &amp; Dementia</h1>
            <p className="companion-hero-sub">
              Calming memory loss, sundowning anxiety, and disorientation with familiar family voice anchors.
            </p>

            {/* Dynamic Portrait Hero Card */}
            <div className="hero-portrait-card">
              <img
                src={activePatientId === 'patient_kalyani' ? '/hero_family.jpg' : '/hero_nell.jpg'}
                alt={activePatientId === 'patient_kalyani' ? 'Kalyani Amma and family' : 'Nell Vance and daughter'}
                className="hero-portrait-image"
              />
              <div className="portrait-overlay-strip">
                <div className="overlay-person-badge">
                  <img
                    src={activePatientId === 'patient_kalyani' ? '/avatar_amma.jpg' : '/avatar_nell.jpg'}
                    alt={preferredName}
                    className="overlay-mini-avatar-img"
                  />
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

          {/* In this page, let typing be there here also */}
          <div className="overview-typing-dock">
            <div className="overview-dock-title">
              <span>💬 {langMode === 'ta' ? 'உரையாடலைத் தொடங்குங்கள்' : `Start a message with ${preferredName}`}</span>
              <span className="overview-dock-hint">{langMode === 'ta' ? 'தட்டச்சு அல்லது குரல்' : 'Type or Speak'}</span>
            </div>
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
                title={isListening ? 'Listening... tap to stop' : 'Tap to speak'}
              >
                {isListening ? '🔴' : '🎙️'}
              </button>
              <input
                type="text"
                className="dock-textarea overview-input-field"
                placeholder={
                  isListening
                    ? (langMode === 'ta' ? 'கேட்கிறது...' : 'Listening...')
                    : (langMode === 'ta' ? `${preferredName}-இடம் பேச விரும்பும் செய்தியை தட்டச்சு செய்யுங்கள்...` : `Type a comforting message for ${preferredName}...`)
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="submit"
                className="dock-send-btn"
                disabled={!inputText.trim() || isLoading}
              >
                {isLoading ? '...' : (langMode === 'ta' ? 'அனுப்பு' : 'Send')} ↑
              </button>
            </form>
          </div>
        </div>
      )}

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
                <span className="safe-metric-label">Verified Location</span>
                <span className="safe-metric-value">
                  {patientData?.places_lived?.[0] || patientData?.preferred_address || 'Home Residence'}
                </span>
              </div>
              <div className="safe-metric-item">
                <span className="safe-metric-label">Safety Status</span>
                <span className="safe-metric-value text-green">
                  {backendStatus ? 'Monitored & Active' : 'Active Local Mode'}
                </span>
              </div>
              <div className="safe-metric-item">
                <span className="safe-metric-label">Wandering Escalation</span>
                <span className={`safe-metric-value ${latestDistress?.level === 'high' ? 'text-amber' : 'text-green'}`}>
                  {latestDistress?.level === 'high' ? 'High Agitation Flagged' : 'Normal Peace Rhythm'}
                </span>
              </div>
              <div className="safe-metric-item">
                <span className="safe-metric-label">Linked Caregiver</span>
                <span className="safe-metric-value">
                  {caregiverName} {caregiverRelation?.relation ? `(${caregiverRelation.relation})` : ''}
                </span>
              </div>
            </div>

            {checkInSent ? (
              <div className="safe-checkin-toast">
                ✓ Check-in dispatched: Location and peace status confirmed for {caregiverName}.
              </div>
            ) : (
              <div className="safe-modal-actions">
                <button
                  type="button"
                  className="btn-stitch-primary"
                  onClick={() => {
                    setCheckInSent(true)
                    setTimeout(() => {
                      setCheckInSent(false)
                      setShowSafeZoneModal(false)
                    }, 1600)
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}
