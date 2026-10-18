/**
 * Kural API Client
 *
 * Resolves the backend base URL from the Vite environment variable VITE_API_BASE_URL.
 * - In production (Vercel), set VITE_API_BASE_URL=https://kural-7m0o.onrender.com in
 *   the Vercel project's Environment Variables dashboard.
 * - In local development, leave VITE_API_BASE_URL unset. Vite's dev proxy (vite.config.js)
 *   transparently forwards /ping, /patient/*, and /chat/* to http://127.0.0.1:8000, so the
 *   empty-string base URL keeps relative paths working as they did before.
 *
 * DO NOT put Anthropic keys or any secrets here. Secrets live on the backend only.
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Builds a full backend URL.
 * @param {string} path - e.g. '/ping', '/patient/patient_001', '/chat/patient_001'
 * @returns {string}
 */
export function apiUrl(path) {
  return `${API_BASE}${path}`
}

/**
 * Check backend health via GET /ping.
 * Returns { online: true } if the server responds with { status: "ok" },
 * or { online: false, retrying: boolean, error: string } otherwise.
 *
 * Handles Render cold-start: on a 502/503 or network error, sets retrying=true so
 * the UI can show a "waking up" message instead of a permanent failure banner.
 *
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ online: boolean, retrying?: boolean, error?: string }>}
 */
export async function checkBackendHealth({ signal } = {}) {
  try {
    const res = await fetch(apiUrl('/ping'), { signal })
    if (res.ok) {
      const data = await res.json()
      if (data.status === 'ok') return { online: true }
      return { online: false, error: `Unexpected ping response: ${JSON.stringify(data)}` }
    }
    // 5xx from Render likely means cold-start; treat as retrying rather than permanently offline
    if (res.status >= 500) return { online: false, retrying: true, error: `Backend warming up (HTTP ${res.status})` }
    return { online: false, error: `Ping returned HTTP ${res.status}` }
  } catch (err) {
    if (err.name === 'AbortError') throw err
    // Network error — could be Render cold-start, CORS failure, or server genuinely down
    return { online: false, retrying: true, error: err.message }
  }
}

/**
 * Fetch patient context from GET /patient/:patientId
 * @param {string} patientId
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<object>} Patient JSON
 */
export async function fetchPatient(patientId, { signal } = {}) {
  const res = await fetch(apiUrl(`/patient/${patientId}`), { signal })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Patient fetch failed with HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Send a chat message via POST /chat/:patientId
 * @param {string} patientId
 * @param {{ session_id: string, message: string }} payload
 * @param {object} [opts]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ response: string, distress?: object }>}
 */
export async function sendChatMessage(patientId, payload, { signal } = {}) {
  const res = await fetch(apiUrl(`/chat/${patientId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `Server returned status ${res.status}`)
  }
  return res.json()
}
