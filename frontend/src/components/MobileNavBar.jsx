import React from 'react'
import { Link, useLocation } from 'react-router-dom'

/**
 * MobileNavBar
 * ============
 * Persistent, iOS/Calm-style bottom navigation bar anchored inside the mobile frame.
 * Provides instant 1-tap switching between:
 *  - Home (/)
 *  - Companion Chat (/companion)
 *  - Caregiver Studio (/caregiver)
 *  - Profiles (/profiles)
 */
export default function MobileNavBar() {
  const location = useLocation()
  const currentPath = location.pathname

  // Check if voice is cloned in local storage
  const hasClonedVoice = () => {
    try {
      const p1 = localStorage.getItem('kural_greeting_audio_patient_kalyani')
      const p2 = localStorage.getItem('kural_greeting_audio_patient_001')
      return Boolean(p1 || p2)
    } catch {
      return false
    }
  }

  const isCloned = hasClonedVoice()

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      path: '/',
      exact: true,
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          width="21"
          height="21"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={active ? '1.5' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 14 20v-4.5a1.5 1.5 0 0 0-1.5-1.5h-1a1.5 1.5 0 0 0-1.5 1.5V20a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 3 20v-9.5z" />
        </svg>
      ),
    },
    {
      id: 'companion',
      label: 'Companion',
      path: '/companion',
      badge: 'Live',
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          width="21"
          height="21"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={active ? '1.5' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      ),
    },
    {
      id: 'caregiver',
      label: 'Caregiver',
      path: '/caregiver',
      badge: isCloned ? 'XTTS' : null,
      badgeColor: 'emerald',
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          width="21"
          height="21"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={active ? '1.5' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
          <line x1="8" y1="22" x2="16" y2="22" />
        </svg>
      ),
    },
    {
      id: 'profiles',
      label: 'Profiles',
      path: '/profiles',
      icon: (active) => (
        <svg
          viewBox="0 0 24 24"
          width="21"
          height="21"
          fill={active ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={active ? '1.5' : '2'}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
  ]

  return (
    <nav className="mobile-bottom-nav" aria-label="Main Navigation">
      <div className="mobile-nav-pill-wrapper">
        {navItems.map((item) => {
          const isActive = item.exact
            ? currentPath === item.path
            : currentPath.startsWith(item.path)

          return (
            <Link
              key={item.id}
              to={item.path}
              className={`mobile-nav-item ${isActive ? 'nav-item-active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className="nav-item-icon-container">
                {item.icon(isActive)}
                {item.badge && (
                  <span className={`nav-badge ${item.badgeColor === 'emerald' ? 'badge-emerald' : 'badge-pink'}`}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="nav-item-label">{item.label}</span>
              {isActive && <span className="nav-active-glow-dot" aria-hidden="true" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
