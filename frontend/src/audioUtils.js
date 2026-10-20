/**
 * Kural Neural Audio Engine & Playback Utilities
 *
 * Provides a fault-tolerant, low-latency audio player supporting:
 * 1. Web Audio API (AudioContext) for zero-stall PCM decoding of neural speech streams
 * 2. Native Blob URL fallback (audio/mpeg)
 * 3. Mobile / iOS / Chromium audio gesture unlocking
 */

let sharedAudioContext = null

/**
 * Returns or initializes the shared AudioContext, ensuring it is resumed.
 * Must be called or touched during user gestures to bypass browser autoplay policies.
 * @returns {AudioContext | null}
 */
export function getSharedAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext
  if (!AudioCtxClass) return null

  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioCtxClass()
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {})
  }
  return sharedAudioContext
}

/**
 * Proactively unlocks the audio subsystem during a user interaction (click, tap, submit).
 */
export function unlockAudio() {
  try {
    const ctx = getSharedAudioContext()
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }
  } catch {
    // Graceful no-op
  }
}

/**
 * Safely converts a base64 encoded audio string into a native ArrayBuffer.
 * @param {string} base64Data
 * @returns {ArrayBuffer}
 */
export function base64ToArrayBuffer(base64Data) {
  if (!base64Data) return new ArrayBuffer(0)
  const clean = base64Data.replace(/^data:[^;]+;base64,/, '').replace(/\s/g, '')
  const binary = window.atob(clean)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Converts a base64 audio string into a native Blob URL using standard 'audio/mpeg'.
 * @param {string} base64Data
 * @param {string} [mimeType='audio/mpeg']
 * @returns {string} Blob URL or fallback data URI
 */
export function base64ToAudioUrl(base64Data, mimeType = 'audio/mpeg') {
  if (!base64Data) return ''
  if (base64Data.startsWith('blob:') || base64Data.startsWith('http') || base64Data.startsWith('data:')) {
    return base64Data
  }
  try {
    const arrayBuffer = base64ToArrayBuffer(base64Data)
    const blob = new Blob([arrayBuffer], { type: mimeType })
    return URL.createObjectURL(blob)
  } catch (err) {
    console.warn('[AudioUtils] Failed to create blob URL, falling back to data URI:', err)
    return `data:${mimeType};base64,${base64Data}`
  }
}

/**
 * Plays neural synthesized audio with dual-engine reliability:
 * Engine 1 (Primary): Native HTML5 Audio element with Blob URL / Data URI.
 *   - Works natively with MP3, WAV, WebM
 *   - Bypasses Web Audio API AudioContext 'suspended' state restrictions
 * Engine 2 (Secondary): Web Audio API (Hardware PCM Decoding) fallback
 *
 * @param {string | { audio_base64?: string, audio_mime?: string, content_type?: string }} audioPayload
 * @param {object} [options]
 * @param {() => void} [options.onStart] - Callback when playback begins
 * @param {() => void} [options.onEnded] - Callback when playback finishes
 * @param {(err: Error) => void} [options.onError] - Callback on fatal playback error
 * @returns {{ stop: () => void, isPlaying: () => boolean }}
 */
export function playClonedAudio(audioPayload, options = {}) {
  const { onStart, onEnded, onError } = options
  const base64Data = typeof audioPayload === 'string'
    ? audioPayload
    : audioPayload?.audio_base64

  if (!base64Data) {
    onError?.(new Error('No audio data provided'))
    return { stop: () => {}, isPlaying: () => false }
  }

  let isPlaying = false
  let activeAudioElement = null
  let activeSourceNode = null
  let createdBlobUrl = null

  const stop = () => {
    if (activeAudioElement) {
      try {
        activeAudioElement.pause()
        activeAudioElement.currentTime = 0
      } catch {}
      activeAudioElement = null
    }
    if (activeSourceNode) {
      try {
        activeSourceNode.stop()
        activeSourceNode.disconnect()
      } catch {}
      activeSourceNode = null
    }
    if (createdBlobUrl && createdBlobUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(createdBlobUrl)
      } catch {}
      createdBlobUrl = null
    }
    if (isPlaying) {
      isPlaying = false
      onEnded?.()
    }
  }

  // Engine 1 (Primary): Native HTML5 Audio element
  const tryHtml5Audio = () => {
    const mime = (typeof audioPayload === 'object' && (audioPayload.audio_mime || audioPayload.content_type)) || 'audio/mpeg'
    const audioUrl = base64ToAudioUrl(base64Data, mime)
    createdBlobUrl = audioUrl

    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl)
      activeAudioElement = audio

      audio.onplay = () => {
        isPlaying = true
        onStart?.()
        resolve(true)
      }

      audio.onended = () => {
        if (isPlaying) {
          isPlaying = false
          activeAudioElement = null
          if (createdBlobUrl && createdBlobUrl.startsWith('blob:')) {
            try { URL.revokeObjectURL(createdBlobUrl) } catch {}
            createdBlobUrl = null
          }
          onEnded?.()
        }
      }

      audio.onerror = () => {
        reject(new Error(audio.error?.message || 'HTML5 Audio playback error'))
      }

      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch((playErr) => {
          reject(playErr)
        })
      }
    })
  }

  // Engine 2 (Secondary): Web Audio API hardware decoding
  const tryWebAudio = async () => {
    const ctx = getSharedAudioContext()
    if (!ctx) throw new Error('Web Audio not supported')
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }

    const arrayBuffer = base64ToArrayBuffer(base64Data)
    const clonedBuffer = arrayBuffer.slice(0)

    return new Promise((resolve, reject) => {
      ctx.decodeAudioData(
        clonedBuffer,
        (decodedBuffer) => {
          try {
            const source = ctx.createBufferSource()
            source.buffer = decodedBuffer
            source.connect(ctx.destination)
            activeSourceNode = source

            source.onended = () => {
              if (isPlaying) {
                isPlaying = false
                activeSourceNode = null
                onEnded?.()
              }
            }

            source.start(0)
            isPlaying = true
            onStart?.()
            resolve(true)
          } catch (playErr) {
            reject(playErr)
          }
        },
        (decodeErr) => {
          reject(decodeErr || new Error('decodeAudioData failed'))
        }
      )
    })
  }

  // Execute playback: Try HTML5 Audio first, then Web Audio
  tryHtml5Audio()
    .catch((html5Err) => {
      console.warn('[AudioUtils] HTML5 audio engine failed, falling back to Web Audio:', html5Err)
      return tryWebAudio()
    })
    .catch((finalErr) => {
      console.error('[AudioUtils] All audio playback engines failed:', finalErr)
      stop()
      onError?.(finalErr)
    })

  return {
    stop,
    isPlaying: () => isPlaying,
  }
}
