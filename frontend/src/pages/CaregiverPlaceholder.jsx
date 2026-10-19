import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listPatients, getVoiceProfile, cloneCaregiverVoice, synthesizeVoiceSpeech } from '../api.js'
import { CADENCE_PRESETS } from '../cadencePresets.js'
import { base64ToAudioUrl, playClonedAudio, unlockAudio } from '../audioUtils.js'
import '../App.css'

const DEFAULT_OBSERVATION_LOGS = [
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
]

function getStorageKey(patientId) {
  return `kural_caregiver_notes_${patientId || 'patient_kalyani'}`
}

function loadNotesForPatient(patientId) {
  try {
    const key = getStorageKey(patientId)
    const stored = localStorage.getItem(key)
    if (!stored) return DEFAULT_OBSERVATION_LOGS
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed)) {
      return parsed
    }
    return DEFAULT_OBSERVATION_LOGS
  } catch (err) {
    console.warn('[Caregiver Notes] Failed to load from localStorage:', err)
    return DEFAULT_OBSERVATION_LOGS
  }
}

function saveNotesForPatient(patientId, notes) {
  try {
    const key = getStorageKey(patientId)
    localStorage.setItem(key, JSON.stringify(notes))
  } catch (err) {
    console.warn('[Caregiver Notes] Failed to persist to localStorage:', err)
  }
}

function computeTranquilityStats(patientId) {
  try {
    const key = `kural_session_distress_${patientId || 'patient_kalyani'}`
    const raw = localStorage.getItem(key)
    if (!raw) {
      return {
        score: 100,
        status: 'Serene & Grounded',
        turnsCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        calmCount: 0,
        triggers: [],
        subtitle: 'No distress signals recorded in recent sessions.',
      }
    }
    const data = JSON.parse(raw)
    const turns = Array.isArray(data.turns) ? data.turns : []
    if (turns.length === 0) {
      return {
        score: 100,
        status: 'Serene & Grounded',
        turnsCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        calmCount: 0,
        triggers: [],
        subtitle: 'No distress signals recorded in recent sessions.',
      }
    }

    let penalty = 0
    let highCount = 0
    let mediumCount = 0
    let lowCount = 0
    let calmCount = 0
    const triggersSet = new Set()

    turns.forEach((t) => {
      if (t.level === 'high') {
        penalty += 35
        highCount++
      } else if (t.level === 'medium') {
        penalty += 20
        mediumCount++
      } else if (t.level === 'low') {
        penalty += 10
        lowCount++
      } else {
        calmCount++
      }
      if (Array.isArray(t.matchedKeywords)) {
        t.matchedKeywords.forEach((kw) => triggersSet.add(kw))
      }
    })

    const avgPenalty = penalty / turns.length
    const score = Math.max(30, Math.min(100, Math.round(100 - avgPenalty)))

    let status = 'Serene & Grounded'
    if (score < 70) {
      status = 'Elevated Agitation (De-escalated)'
    } else if (score < 88) {
      status = 'Gentle Care / Mild Confusion'
    }

    const subtitle = `Based on ${turns.length} conversation turn${turns.length > 1 ? 's' : ''} with Kural. ${
      highCount > 0
        ? `${highCount} high-distress flag(s) soothingly addressed.`
        : 'All turns calm or gently reassured today.'
    }`

    return {
      score,
      status,
      turnsCount: turns.length,
      highCount,
      mediumCount,
      lowCount,
      calmCount,
      triggers: Array.from(triggersSet),
      subtitle,
    }
  } catch (err) {
    console.warn('[Tranquility Stats] Failed to parse:', err)
    return {
      score: 100,
      status: 'Serene & Grounded',
      turnsCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      calmCount: 0,
      triggers: [],
      subtitle: 'Session status normal.',
    }
  }
}

export default function CaregiverPortal() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('insights') // 'insights' | 'access'
  const [patientsList, setPatientsList] = useState([])
  const [email, setEmail] = useState(() => {
    return localStorage.getItem('kural_caregiver_email') || 'anita.raman@gmail.com'
  })
  const [emailSavedToast, setEmailSavedToast] = useState(false)
  const [activePatient, setActivePatient] = useState(null)
  const [selectedCadence, setSelectedCadence] = useState(() => {
    return localStorage.getItem('kural_voice_cadence') || 'maternal'
  })
  const [previewingId, setPreviewingId] = useState(null)

  // Familiar Caregiver Voice Recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(() => {
    const id = localStorage.getItem('kural_active_patient_id') || 'patient_kalyani'
    return localStorage.getItem(`kural_greeting_audio_${id}`) || null
  })
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const audioPlayerRef = useRef(null)

  // Voice Cloning Studio & Coqui XTTS-v2 Integration State
  const [voiceProfile, setVoiceProfile] = useState(null)
  const [cloneSpeakerName, setCloneSpeakerName] = useState('')
  const [cloneSpeakerRelation, setCloneSpeakerRelation] = useState('')
  const [isCloningVoice, setIsCloningVoice] = useState(false)
  const [cloneSuccessToast, setCloneSuccessToast] = useState(null)
  const [cloneErrorToast, setCloneErrorToast] = useState(null)
  const [isSynthesizingTest, setIsSynthesizingTest] = useState(false)
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState(false)
  const [testSynthesizeText, setTestSynthesizeText] = useState('')
  const testAudioPlayerRef = useRef(null)
  const fileInputRef = useRef(null)

  const [newNote, setNewNote] = useState('')
  const [copiedToast, setCopiedToast] = useState(false)
  const [logs, setLogs] = useState(() => {
    const id = localStorage.getItem('kural_active_patient_id') || 'patient_kalyani'
    return loadNotesForPatient(id)
  })

  useEffect(() => {
    listPatients()
      .then((patients) => {
        if (patients && patients.length > 0) {
          setPatientsList(patients)
          const storedId = localStorage.getItem('kural_active_patient_id')
          const isCustom = storedId && storedId !== 'patient_001' && storedId !== 'patient_kalyani'
          const targetId = isCustom ? storedId : 'patient_kalyani'
          const matched =
            patients.find((p) => p.patient_id === targetId) ||
            patients.find((p) => p.patient_id === 'patient_kalyani') ||
            patients[0]
          setActivePatient(matched)
        }
      })
      .catch(() => {})
  }, [])

  // Sync notes when active patient profile changes
  useEffect(() => {
    if (activePatient?.patient_id) {
      setLogs(loadNotesForPatient(activePatient.patient_id))
    }
  }, [activePatient?.patient_id])

  const activePatientId = activePatient?.patient_id || localStorage.getItem('kural_active_patient_id') || 'patient_kalyani'
  const tranquilityStats = computeTranquilityStats(activePatientId)

  const handleSaveCaregiverEmail = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    localStorage.setItem('kural_caregiver_email', email.trim())
    setEmailSavedToast(true)
    setTimeout(() => setEmailSavedToast(false), 2200)
  }

  const handleAddNote = (e) => {
    e.preventDefault()
    if (!newNote.trim()) return
    const now = new Date()
    const timeFormatted = `${now.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Caregiver Observation`
    const noteItem = {
      id: Date.now(),
      time: timeFormatted,
      text: newNote.trim(),
      tranquility: 'Calm',
      escalations: 0,
    }
    const updated = [noteItem, ...logs]
    setLogs(updated)
    const patientId = activePatient?.patient_id || localStorage.getItem('kural_active_patient_id') || 'patient_kalyani'
    saveNotesForPatient(patientId, updated)
    setNewNote('')
  }

  const handleDeleteNote = (noteId) => {
    const updated = logs.filter((log) => log.id !== noteId)
    setLogs(updated)
    const patientId = activePatient?.patient_id || localStorage.getItem('kural_active_patient_id') || 'patient_kalyani'
    saveNotesForPatient(patientId, updated)
  }

  const handleExportSummary = () => {
    const summary = `
=============================================
KURAL (குரல்) - DAILY TRANQUILITY & CARE SUMMARY
=============================================
Loved One: ${preferredName} (${activePatient?.name || ''})
Stage: ${stageDisplay}
Caregiver Linked: ${caregiverName}
Date: ${new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}

1. TRANQUILITY INDEX & OBSERVATIONS:
- Overall Score: ${tranquilityStats.score}% (${tranquilityStats.status})
- Evaluated Turns: ${tranquilityStats.turnsCount} turns
- Breakdown: ${tranquilityStats.calmCount} calm, ${tranquilityStats.lowCount} mild reassurance, ${tranquilityStats.mediumCount} disorientation, ${tranquilityStats.highCount} agitation flags
- Addressed Triggers: ${tranquilityStats.triggers.length > 0 ? tranquilityStats.triggers.join(', ') : 'None detected'}

2. ACTIVE EMOTIONAL ANCHORS & COMFORT ROUTINES:
${(activePatient?.preferences?.likes || ['Afternoon tea', 'Familiar songs']).map((l) => `- ${l}`).join('\n')}

3. RECENT OBSERVATIONS & NOTES:
${logs.length > 0 ? logs.map((l) => `[${l.time}] ${l.text}`).join('\n') : 'No recent caregiver observations recorded.'}

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
          const id = activePatient?.patient_id || 'patient_kalyani'
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
    const id = activePatient?.patient_id || 'patient_kalyani'
    localStorage.removeItem(`kural_greeting_audio_${id}`)
    setRecordedAudioUrl(null)
  }

  // Fetch active voice profile when patient changes
  useEffect(() => {
    if (!activePatientId) return
    getVoiceProfile(activePatientId)
      .then((profile) => {
        setVoiceProfile(profile)
        if (profile?.speaker_name) {
          setCloneSpeakerName(profile.speaker_name)
        }
      })
      .catch(() => {})
  }, [activePatientId])

  // Seed default speaker & test phrase based on active patient profile
  useEffect(() => {
    const defaultSpeaker = activePatient?.relationships?.[0]?.name || (activePatientId === 'patient_kalyani' ? 'Meera' : 'Clara')
    const defaultRelation = activePatient?.relationships?.[0]?.relation || 'Daughter'
    if (!cloneSpeakerName) setCloneSpeakerName(defaultSpeaker)
    if (!cloneSpeakerRelation) setCloneSpeakerRelation(defaultRelation)

    const defaultTest = activePatientId === 'patient_kalyani'
      ? 'வணக்கம் அம்மா, நான் மீரா பேசுறேன். இன்னைக்கு நல்லா ஓய்வெடுங்க, உங்க கூடவே இருக்கேன்.'
      : `Hello ${activePatient?.preferred_name || activePatient?.name || 'Nell'}, it is ${defaultSpeaker}. I am right here with you, and everything is calm and safe.`
    setTestSynthesizeText(defaultTest)
  }, [activePatient, activePatientId])

  const handleAudioFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64data = reader.result
      const id = activePatient?.patient_id || 'patient_kalyani'
      localStorage.setItem(`kural_greeting_audio_${id}`, base64data)
      setRecordedAudioUrl(base64data)
      setCloneSuccessToast(`Loaded voice sample "${file.name}". Ready to train with Coqui XTTS-v2!`)
      setTimeout(() => setCloneSuccessToast(null), 3500)
    }
    reader.readAsDataURL(file)
  }

  const handleCloneVoice = async () => {
    if (!recordedAudioUrl) {
      setCloneErrorToast('Please record a voice clip or upload an audio file first.')
      setTimeout(() => setCloneErrorToast(null), 3000)
      return
    }
    setIsCloningVoice(true)
    setCloneErrorToast(null)
    setCloneSuccessToast(null)

    try {
      const speaker = cloneSpeakerName.trim() || caregiverName
      const relation = cloneSpeakerRelation.trim() || 'Caregiver'
      const res = await cloneCaregiverVoice(activePatientId, {
        speaker_name: speaker,
        relation: relation,
        audio_base64: recordedAudioUrl,
        language: activePatient?.language || 'Tamil',
        cadence_preset: selectedCadence,
      })

      const refreshed = await getVoiceProfile(activePatientId).catch(() => res)
      setVoiceProfile(refreshed)
      setCloneSuccessToast(
        `✓ Voice model successfully trained for ${speaker}! Model: Coqui XTTS-v2. Companion Chat will now speak automatically in ${speaker}'s authentic voice.`
      )
      setTimeout(() => setCloneSuccessToast(null), 5000)
    } catch (err) {
      setCloneErrorToast(err.message || 'Failed to clone voice with model.')
      setTimeout(() => setCloneErrorToast(null), 4000)
    } finally {
      setIsCloningVoice(false)
    }
  }

  const speakFallbackSpeech = (textToSpeak) => {
    if (!('speechSynthesis' in window)) return
    speechSynthesis.cancel()
    const clean = textToSpeak.replace(/\[.*?\]/g, '').trim()
    const utterance = new SpeechSynthesisUtterance(clean)
    const preset = CADENCE_PRESETS[selectedCadence] || CADENCE_PRESETS.maternal
    utterance.rate = preset.rate
    utterance.pitch = preset.pitch

    const isTamil = activePatientId === 'patient_kalyani' || (activePatient?.language && activePatient.language.toLowerCase().includes('tamil'))
    const voices = speechSynthesis.getVoices()
    if (isTamil) {
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

    setIsPlayingTestVoice(true)
    utterance.onend = () => setIsPlayingTestVoice(false)
    utterance.onerror = () => setIsPlayingTestVoice(false)
    speechSynthesis.speak(utterance)
  }

  const handleTestClonedVoice = async () => {
    unlockAudio()
    if (isPlayingTestVoice) {
      if (testAudioPlayerRef.current) {
        testAudioPlayerRef.current.stop?.()
        testAudioPlayerRef.current.pause?.()
        testAudioPlayerRef.current = null
      }
      if ('speechSynthesis' in window) {
        speechSynthesis.cancel()
      }
      setIsPlayingTestVoice(false)
      return
    }

    setIsSynthesizingTest(true)
    const textToSynthesize = testSynthesizeText.trim() || `Hello, I am right here with you.`

    try {
      const isTamil = activePatientId === 'patient_kalyani' || (activePatient?.language && activePatient.language.toLowerCase().includes('tamil'))
      const res = await synthesizeVoiceSpeech({
        patient_id: activePatientId,
        text: textToSynthesize,
        language: isTamil ? 'ta' : 'en',
        audio_sample: recordedAudioUrl,
      })

      if (res?.audio_base64) {
        if (testAudioPlayerRef.current) {
          testAudioPlayerRef.current.stop?.()
          testAudioPlayerRef.current.pause?.()
          testAudioPlayerRef.current = null
        }

        const isAuthentic = res.model === 'coqui-xtts-v2-authentic'
        const speaker = cloneSpeakerName || caregiverName
        setCloneSuccessToast(
          isAuthentic
            ? `✓ Playing ${speaker}'s Authentic Voice Sample!`
            : `✓ Playing ${speaker}'s Cloned Voice (XTTS-v2 Calibrated)`
        )
        setTimeout(() => setCloneSuccessToast(null), 4000)

        const controller = playClonedAudio(res, {
          onStart: () => setIsPlayingTestVoice(true),
          onEnded: () => {
            setIsPlayingTestVoice(false)
            testAudioPlayerRef.current = null
          },
          onError: (err) => {
            console.warn('[Voice Studio] Neural audio playback failed:', err)
            setIsPlayingTestVoice(false)
            testAudioPlayerRef.current = null
            setCloneErrorToast('Voice playback failed: ' + (err.message || 'Check browser audio permissions'))
            setTimeout(() => setCloneErrorToast(null), 4000)
          },
        })
        testAudioPlayerRef.current = controller
      } else {
        setCloneErrorToast('Voice synthesis returned without audio data. Please try again.')
        setTimeout(() => setCloneErrorToast(null), 4000)
      }
    } catch (err) {
      console.warn('[Voice Studio] Backend synthesis error:', err)
      setCloneErrorToast('Speech synthesis failed: ' + (err.message || 'Backend unreachable'))
      setTimeout(() => setCloneErrorToast(null), 4000)
    } finally {
      setIsSynthesizingTest(false)
    }
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
          <span className="header-portal-label">DEMENTIA CAREGIVER COMMAND</span>
        </div>
      </header>

      {/* Dynamic Profile Avatar Hero */}
      <div className="portal-avatar-wrap">
        <div className="portal-avatar-ring">
          <img
            src={activePatient?.patient_id === 'patient_kalyani' ? '/avatar_amma.jpg' : '/avatar_nell.jpg'}
            alt={preferredName}
            className="portal-avatar-img"
          />
          <div className="avatar-heart-badge">♥</div>
        </div>
      </div>

      {/* Display Heading */}
      <section className="portal-heading-section">
        <h1 className="portal-display-title">
          {preferredName}&apos;s Dementia
          <span className="title-gradient"> Care Command</span>
        </h1>
        <p className="portal-lead">
          Linked with {caregiverName}. Real-time dementia tranquility monitoring, sundowning alerts, and neurologist reports.
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
                <h3 className="tranquility-score">
                  {tranquilityStats.score}% {tranquilityStats.status}
                </h3>
              </div>
              <span className={`tranquility-pill ${tranquilityStats.score >= 88 ? 'pill-calm' : 'pill-alert'}`}>
                {tranquilityStats.turnsCount > 0 ? `${tranquilityStats.turnsCount} Turns Evaluated` : 'Fresh Session'}
              </span>
            </div>
            <div className="tranquility-progress-track">
              <div
                className="tranquility-progress-fill"
                style={{
                  width: `${tranquilityStats.score}%`,
                  background:
                    tranquilityStats.score >= 88
                      ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                      : tranquilityStats.score >= 70
                      ? 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)'
                      : 'linear-gradient(90deg, #f43f5e 0%, #fb7185 100%)',
                }}
              ></div>
            </div>
            <p className="tranquility-sub">{tranquilityStats.subtitle}</p>
            {tranquilityStats.triggers.length > 0 && (
              <div className="tranquility-triggers-row">
                <span className="trigger-label">Active Triggers Addressed:</span>
                {tranquilityStats.triggers.slice(0, 4).map((trig, i) => (
                  <span key={i} className="trigger-chip">
                    {trig}
                  </span>
                ))}
              </div>
            )}
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

          {/* Caregiver Voice Cloning Studio (XTTS-v2 & LinuxONE Architecture) */}
          <div className="workspace-section-block voice-cloning-studio-block">
            <div className="workspace-section-header">
              <span className="anchors-eyebrow">VOICE CLONING STUDIO (XTTS-v2)</span>
              <span className="cadence-active-pill model-badge-pill">
                ● Model: Coqui XTTS-v2 (LinuxONE)
              </span>
            </div>
            <p className="workspace-section-sub">
              Train an open-source voice cloning model on {caregiverName}&apos;s voice. Every companion response for {preferredName} will speak automatically in this authentic loved one voice - no need to tap listen each time.
            </p>

            {/* Active Voice Model Status Bar */}
            <div className="voice-model-status-strip">
              <div className="model-strip-left">
                <span className="model-live-dot"></span>
                <div>
                  <span className="model-strip-title">
                    Active Cloned Voice: <strong>{voiceProfile?.speaker_name || cloneSpeakerName || caregiverName}</strong>
                  </span>
                  <span className="model-strip-sub">
                    {voiceProfile?.model === 'coqui-xtts-v2-linuxone'
                      ? 'IBM LinuxONE Microservice • Auto-Play Active'
                      : 'Calibrated Acoustic Embedding • Auto-Play Active'}
                  </span>
                </div>
              </div>
              <span className="model-strip-pill">
                {voiceProfile?.voice_cloned ? '✓ Cloned & Ready' : '● Default Cloned'}
              </span>
            </div>

            {cloneSuccessToast && (
              <div className="banner banner-success-cloned">
                {cloneSuccessToast}
              </div>
            )}

            {cloneErrorToast && (
              <div className="banner banner-error-cloned">
                {cloneErrorToast}
              </div>
            )}

            <div className="voice-cloning-card">
              {/* Step 1: Speaker Identity */}
              <div className="clone-step-row">
                <span className="step-number-tag">Step 1</span>
                <span className="step-label">Speaker Identity</span>
              </div>
              <div className="clone-inputs-grid">
                <div className="clone-field">
                  <label className="clone-label">Speaker Name (e.g. Meera, Clara)</label>
                  <input
                    type="text"
                    className="clone-input"
                    value={cloneSpeakerName}
                    onChange={(e) => setCloneSpeakerName(e.target.value)}
                    placeholder="Caregiver or loved one's name"
                  />
                </div>
                <div className="clone-field">
                  <label className="clone-label">Relationship to {preferredName}</label>
                  <input
                    type="text"
                    className="clone-input"
                    value={cloneSpeakerRelation}
                    onChange={(e) => setCloneSpeakerRelation(e.target.value)}
                    placeholder="e.g. Daughter, Son, Spouse"
                  />
                </div>
              </div>

              {/* Step 2: Voice Sample Input (Record or Upload) */}
              <div className="clone-step-row" style={{ marginTop: '14px' }}>
                <span className="step-number-tag">Step 2</span>
                <span className="step-label">Provide Voice Sample (10–30s)</span>
              </div>

              <div className="voice-recorder-status">
                <div className={`recorder-mic-circle ${isRecording ? 'recording-pulse' : ''}`}>
                  {isRecording ? '🔴' : '🎙️'}
                </div>
                <div className="recorder-info">
                  <h4 className="recorder-title">
                    {isRecording
                      ? 'Recording Voice Sample...'
                      : recordedAudioUrl
                      ? 'Voice Sample Loaded & Ready'
                      : 'Record or Upload Voice Sample'}
                  </h4>
                  <span className="recorder-timer">
                    {isRecording
                      ? `00:0${recordingSeconds} / 00:10 (Speak naturally and calmly)`
                      : recordedAudioUrl
                      ? 'Sample stored for XTTS-v2 acoustic cloning'
                      : 'Speak a few warm reassuring sentences or choose an audio file'}
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
                    🎙️ {recordedAudioUrl ? 'Re-Record Sample' : 'Record Voice (10s)'}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-stitch-primary btn-stop-action"
                    onClick={stopRecording}
                  >
                    ⏹ Stop &amp; Save Sample
                  </button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={handleAudioFileUpload}
                />

                <button
                  type="button"
                  className="btn-stitch-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload an existing WAV, MP3, or M4A audio clip"
                >
                  📁 Upload Audio File
                </button>

                <button
                  type="button"
                  className={`btn-stitch-secondary btn-play-sample ${isPlayingGreeting ? 'preview-playing' : ''}`}
                  onClick={handlePlayRecordedGreeting}
                >
                  {isPlayingGreeting ? '🔊 Playing Sample...' : '▶ Listen Sample'}
                </button>

                {recordedAudioUrl && !isRecording && (
                  <button
                    type="button"
                    className="btn-delete-audio"
                    onClick={handleDeleteGreeting}
                    title="Remove voice sample"
                  >
                    🗑️ Reset
                  </button>
                )}
              </div>

              {/* Step 3: Train Cloned Model Button */}
              <div className="clone-submit-strip">
                <button
                  type="button"
                  className="btn-stitch-primary btn-clone-model-action"
                  onClick={handleCloneVoice}
                  disabled={isCloningVoice || !recordedAudioUrl}
                >
                  {isCloningVoice ? '⏳ Extracting XTTS-v2 Speaker Embeddings...' : '🚀 Clone Voice with Coqui XTTS-v2'}
                </button>
                <span className="clone-auto-play-note">
                  ⚡ Auto-Play Enabled: Future Companion answers will play aloud immediately in this voice.
                </span>
              </div>

              {/* Step 3: Verification & Test Synthesis */}
              <div className="clone-test-section">
                <div className="clone-step-row">
                  <span className="step-number-tag">Step 3</span>
                  <span className="step-label">Test Cloned Speech Synthesis</span>
                </div>

                <div className="clone-active-voice-pill">
                  <span className="status-indicator-dot"></span>
                  <span className="badge-text">
                    Active Voice: <strong>{cloneSpeakerName || caregiverName}</strong> (
                    {recordedAudioUrl || voiceProfile?.voice_cloned
                      ? 'Conditioned on Caregiver Audio Sample'
                      : 'Default Family Profile'}
                    )
                  </span>
                </div>

                <div className="test-phrase-chips">
                  <button
                    type="button"
                    className={`test-chip ${testSynthesizeText.includes('வணக்கம்') ? 'active' : ''}`}
                    onClick={() => setTestSynthesizeText(
                      activePatientId === 'patient_kalyani'
                        ? 'வணக்கம் அம்மா, நான் மீரா பேசுறேன். இன்னைக்கு நல்லா ஓய்வெடுங்க, உங்க கூடவே இருக்கேன்.'
                        : `Hello ${activePatient?.preferred_name || 'Nell'}, I am right here with you.`
                    )}
                  >
                    🗣️ Tamil Script
                  </button>
                  <button
                    type="button"
                    className={`test-chip ${testSynthesizeText.toLowerCase().includes('vanakkam') ? 'active' : ''}`}
                    onClick={() => setTestSynthesizeText(
                      activePatientId === 'patient_kalyani'
                        ? 'Vanakkam Amma, naan Meera pesuren. Innaiku nalla oivedunga, unga koodave irukken.'
                        : `Good morning Mom, Clara here. Everything is safe and calm.`
                    )}
                  >
                    🔤 Phonetic Tanglish (Best XTTS Timbre)
                  </button>
                  <button
                    type="button"
                    className={`test-chip ${testSynthesizeText.toLowerCase().includes('hello') ? 'active' : ''}`}
                    onClick={() => setTestSynthesizeText(
                      activePatientId === 'patient_kalyani'
                        ? 'Hello Amma, this is your daughter Meera speaking. You are safe and warm at home with us.'
                        : `Hello ${activePatient?.preferred_name || 'Nell'}, this is your daughter speaking. You are safe and loved.`
                    )}
                  >
                    ✨ English (Authentic Voice)
                  </button>
                </div>

                <div className="test-synthesis-box">
                  <input
                    type="text"
                    className="test-phrase-input"
                    value={testSynthesizeText}
                    onChange={(e) => setTestSynthesizeText(e.target.value)}
                    placeholder="Enter sentence for cloned voice to speak..."
                  />
                  <div className="test-buttons-row">
                    <button
                      type="button"
                      className={`btn-test-synthesize ${isPlayingTestVoice ? 'playing-test' : ''}`}
                      onClick={handleTestClonedVoice}
                      disabled={isSynthesizingTest}
                    >
                      {isSynthesizingTest
                        ? 'Synthesizing...'
                        : isPlayingTestVoice
                        ? '⏹ Stop Playing'
                        : '▶ Test Cloned Voice'}
                    </button>
                    {recordedAudioUrl && (
                      <button
                        type="button"
                        className="btn-listen-sample-test"
                        onClick={handlePlayRecordedGreeting}
                        disabled={isPlayingGreeting}
                        title="Listen to your original recorded microphone voice"
                      >
                        {isPlayingGreeting ? '🔊 Playing Sample...' : '🎙️ Listen Sample'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Architecture Specifications */}
              <div className="linuxone-specs-grid">
                <div className="spec-item">
                  <span className="spec-label">Model Engine</span>
                  <span className="spec-value">Coqui XTTS-v2</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Host Infrastructure</span>
                  <span className="spec-value">LinuxONE s390x / Container</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Audio Auto-Play</span>
                  <span className="spec-value text-green">Always ON (Zero Click)</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Voice Cloning Status</span>
                  <span className="spec-value text-green">
                    {recordedAudioUrl || voiceProfile?.voice_cloned
                      ? '✓ Authentic Cloned Voice Active'
                      : 'Awaiting Voice Sample'}
                  </span>
                </div>
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
            <p className="workspace-section-sub">
              Observation notes stored in this browser to track daily reactions, mood changes, and reassurance responses.
            </p>

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
              {logs.length === 0 ? (
                <div className="reaction-log-empty">
                  No observation notes recorded yet for {preferredName}. Add your first observation above.
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="reaction-log-item">
                    <div className="reaction-log-header">
                      <div className="reaction-log-time">{log.time}</div>
                      <button
                        type="button"
                        className="btn-delete-log"
                        onClick={() => handleDeleteNote(log.id)}
                        aria-label={`Delete observation note: ${log.text.slice(0, 30)}`}
                        title="Delete note"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="reaction-log-text">
                      &ldquo;{log.text}&rdquo;
                    </div>
                    <div className="reaction-log-meta">
                      <span>Tranquility: {log.tranquility}</span> • <span>Stage: {stageDisplay}</span>
                    </div>
                  </div>
                ))
              )}
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
        <div className="portal-auth-card">
          {/* Portal Access & Identity Manager Tab */}
          <div className="caregiver-identity-box">
            <div className="identity-avatar-pill">
              <span className="identity-icon">👤</span>
              <div>
                <h3 className="identity-name">{caregiverName}</h3>
                <span className="identity-role">
                  {activePatient?.relationships?.[0]?.relation || 'Family Caregiver'} • Linked with {preferredName}
                </span>
              </div>
            </div>
            <div className="identity-passkey-badge">
              <span className="passkey-dot">●</span>
              <span>Passkey: KURAL-{activePatientId.toUpperCase().slice(-6)}</span>
            </div>
          </div>

          <form onSubmit={handleSaveCaregiverEmail} className="auth-email-form">
            <label className="input-field-label" htmlFor="caregiver-email">
              CAREGIVER NOTIFICATION &amp; CLINICAL REPORT EMAIL
            </label>
            <div className="input-with-icon">
              <span className="input-icon">✉</span>
              <input
                id="caregiver-email"
                type="email"
                placeholder="caregiver@example.com"
                className="dark-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-send-magic">
              {emailSavedToast ? 'EMAIL PREFERENCE SAVED ✓' : 'SAVE NOTIFICATION EMAIL'}
            </button>
          </form>

          {/* Quick Profile Switcher for Caregiver */}
          <div className="portal-profile-switcher-block">
            <span className="input-field-label">LINKED ELDER PROFILES</span>
            <div className="portal-profiles-grid">
              {patientsList.map((p) => {
                const isCurrent = p.patient_id === activePatientId
                return (
                  <button
                    key={p.patient_id}
                    type="button"
                    className={`portal-profile-chip ${isCurrent ? 'profile-chip-active' : ''}`}
                    onClick={() => {
                      localStorage.setItem('kural_active_patient_id', p.patient_id)
                      setActivePatient(p)
                    }}
                  >
                    <span>{isCurrent ? '● Active: ' : ''}{p.preferred_name || p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="portal-nav-links">
            <Link to="/onboarding" className="portal-sub-link">
              + Setup New Elder Profile
            </Link>
            <span className="dot-sep">•</span>
            <Link to="/profiles" className="portal-sub-link">
              Full Directory
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
          By continuing, you agree to Kural&apos;s privacy-first care principles. Audio memory and notes remain encrypted and stored locally in this browser.
        </p>
      </footer>
    </div>
  )
}
