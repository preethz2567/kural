import { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState('loading...')

  useEffect(() => {
    fetch('/ping')
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(err => setStatus('error: ' + err.message))
  }, [])

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Kural</h1>
      <p>Backend status: <strong>{status}</strong></p>
    </div>
  )
}

export default App
