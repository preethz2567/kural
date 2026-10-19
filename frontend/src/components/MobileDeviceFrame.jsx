import React, { useState, useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import MobileNavBar from './MobileNavBar'

/**
 * MobileDeviceFrame
 * =================
 * Renders an authentic, high-end smartphone device showcase on desktop views,
 * backed by an atmospheric studio backdrop with glowing ambient mesh orbs,
 * architectural dot patterns, and feature anchor cards.
 *
 * On mobile/tablet screens (<= 680px), the chassis gracefully disengages and
 * presents the application in full native mobile responsiveness.
 */
export default function MobileDeviceFrame({ children }) {
  const location = useLocation()
  const viewportRef = useRef(null)
  const [currentTime, setCurrentTime] = useState('')

  // Live status bar clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      let hours = now.getHours()
      const minutes = String(now.getMinutes()).padStart(2, '0')
      hours = hours % 12 || 12 // 12-hour format
      setCurrentTime(`${hours}:${minutes}`)
    }

    updateClock()
    const timer = setInterval(updateClock, 10000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll the phone screen to top on route change
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [location.pathname])

  return (
    <div className="web-device-wrapper">
      {/* Main Desktop Showcase Stage */}
      <div className="web-showcase-stage">
        {/* Left Side Feature Anchor Card (Visible on desktop screens) */}
        <aside className="web-showcase-sidebar sidebar-left" aria-hidden="true">
          <div className="showcase-card">
            <div className="showcase-card-header">
              <span className="showcase-tag-pill">✦ WHAT IS KURAL? • HACKATHON INNOVATION</span>
            </div>
            <h2 className="showcase-title">Zero-Agitation AI Voice Anchor</h2>
            <p className="showcase-desc">
              <strong>Not just a chatbot.</strong> Kural solves late-day dementia panic (sundowning) by synthesizing the real voices of family members, detecting agitation in real time, and soothing elders with culturally familiar memories.
            </p>
            <div className="showcase-feature-list">
              <div className="showcase-feature-item">
                <span className="feature-icon">🎙️</span>
                <div>
                  <strong>Cloned Family Voice (LinuxONE XTTS-v2)</strong>
                  <span>Elders hear their daughter or son&apos;s actual voice instead of an artificial bot, triggering deep neurological comfort.</span>
                </div>
              </div>
              <div className="showcase-feature-item">
                <span className="feature-icon">🧠</span>
                <div>
                  <strong>Agitation ML &amp; De-escalation (GoEmotions)</strong>
                  <span>Classifies distress and confusion live, pivoting instantly to soothing validation therapy before panic peaks.</span>
                </div>
              </div>
              <div className="showcase-feature-item">
                <span className="feature-icon">🌸</span>
                <div>
                  <strong>Bilingual Cultural Anchors (Tamil &amp; English)</strong>
                  <span>Re-grounds memory via familiar sensory cues: MS Subbulakshmi devotional hymns, morning filter coffee, and garden walks.</span>
                </div>
              </div>
            </div>
            <div className="showcase-jury-hint">
              <span className="jury-hint-badge">💡 Jury Test</span>
              <span>Tap <strong>Play Greeting</strong> inside the phone to hear daughter Meera&apos;s synthesized voice!</span>
            </div>
          </div>
        </aside>

        {/* Center Column: Phone Mockup & Preview Header */}
        <main className="web-device-center-column">
          {/* Top Orientation Bar */}
          <header className="web-preview-header-bar">
            <div className="web-preview-pill">
              <span className="preview-pulse-dot"></span>
              <span className="preview-label">Kural Companion</span>
              <span className="preview-divider">•</span>
              <span className="preview-sub">Interactive Mobile View</span>
              <span className="preview-hint-tag">↕ Scroll inside phone</span>
            </div>
          </header>

          {/* Physical Smartphone Chassis */}
          <div className="phone-device-chassis">
            {/* Hardware Side Buttons */}
            <div className="phone-hw-btn phone-hw-mute" title="Action Switch" aria-hidden="true"></div>
            <div className="phone-hw-btn phone-hw-vol-up" title="Volume Up" aria-hidden="true"></div>
            <div className="phone-hw-btn phone-hw-vol-down" title="Volume Down" aria-hidden="true"></div>
            <div className="phone-hw-btn phone-hw-power" title="Side Button" aria-hidden="true"></div>

            {/* Top Speaker Ear-piece */}
            <div className="phone-speaker-slit" aria-hidden="true"></div>

            {/* Inner Scrollable Phone Screen */}
            <div className="phone-screen-viewport" ref={viewportRef}>
              {/* iOS / Modern Status Bar with Dynamic Island */}
              <div className="phone-status-bar" aria-hidden="true">
                {/* Clock */}
                <span className="phone-status-time">{currentTime || '9:41'}</span>

                {/* Dynamic Island */}
                <div className="phone-dynamic-island">
                  <div className="island-lens-reflection"></div>
                  <div className="island-sensor-dot"></div>
                </div>

                {/* Signal, WiFi, Battery */}
                <div className="phone-status-icons">
                  {/* Cellular Signal (4 bars) */}
                  <svg className="phone-icon-svg" viewBox="0 0 17 12" width="15" height="11" fill="currentColor">
                    <rect x="0" y="8" width="2.5" height="4" rx="0.8" />
                    <rect x="4.5" y="5.5" width="2.5" height="6.5" rx="0.8" />
                    <rect x="9" y="3" width="2.5" height="9" rx="0.8" />
                    <rect x="13.5" y="0.5" width="2.5" height="11.5" rx="0.8" />
                  </svg>

                  {/* Wi-Fi Wave */}
                  <svg className="phone-icon-svg" viewBox="0 0 16 12" width="14" height="11" fill="currentColor">
                    <path d="M8 9.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zm-4.24-2.83a6 6 0 0 1 8.48 0 .8.8 0 1 1-1.13 1.13 4.4 4.4 0 0 0-6.22 0 .8.8 0 1 1-1.13-1.13zm-2.83-2.83a10 10 0 0 1 14.14 0 .8.8 0 1 1-1.13 1.13 8.4 8.4 0 0 0-11.88 0 .8.8 0 0 1-1.13-1.13z" />
                  </svg>

                  {/* Battery Indicator with 98% level */}
                  <div className="phone-battery-pill">
                    <div className="phone-battery-level"></div>
                    <div className="phone-battery-terminal"></div>
                  </div>
                </div>
              </div>

              {/* Actual Application Pages */}
              <div className="phone-app-content">
                {children}
              </div>

              {/* Persistent Mobile Bottom Navigation Bar */}
              <MobileNavBar />

              {/* Floating Home Indicator Bar */}
              <div className="phone-home-indicator-wrap" aria-hidden="true">
                <div className="phone-home-indicator"></div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Side Caregiver Sync Card (Visible on desktop screens) */}
        <aside className="web-showcase-sidebar sidebar-right" aria-hidden="true">
          <div className="showcase-card">
            <div className="showcase-card-header">
              <span className="showcase-tag-pill tag-purple">♥ CLINICAL &amp; CAREGIVER COMMAND</span>
            </div>
            <h2 className="showcase-title">Caregiver Remote Peace &amp; Telemetry</h2>
            <p className="showcase-desc">
              <strong>Closing the distance.</strong> While the elder has a comforting conversation, long-distance family and physicians receive continuous behavioral intelligence and peace-of-mind metrics.
            </p>
            <div className="showcase-feature-list">
              <div className="showcase-feature-item">
                <span className="feature-icon">🌿</span>
                <div>
                  <strong>Daily Tranquility Index</strong>
                  <span>Continuous serenity scoring with automatic tracking of late-afternoon sundowning triggers.</span>
                </div>
              </div>
              <div className="showcase-feature-item">
                <span className="feature-icon">🛡️</span>
                <div>
                  <strong>Safe Haven Geofence Verification</strong>
                  <span>Immediate perimeter reassurance to ease wandering anxiety without triggering disorientation or panic.</span>
                </div>
              </div>
              <div className="showcase-feature-item">
                <span className="feature-icon">📋</span>
                <div>
                  <strong>Doctor-Ready Clinical Export</strong>
                  <span>One-click clipboard export of emotional reactions, keyword triggers, and mood trends for geriatricians.</span>
                </div>
              </div>
            </div>
            <div className="showcase-jury-hint">
              <span className="jury-hint-badge">💡 Jury Test</span>
              <span>Open the <strong>Profiles</strong> tab to switch between Kalyani Amma (Tamil) and Eleanor &quot;Nell&quot; Vance (English)!</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
