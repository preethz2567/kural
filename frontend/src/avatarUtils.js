/**
 * avatarUtils.js
 * Helpers for avatar, hero images, and profile names across Kural.
 * Defaults always to Kalyani Amma unless another profile (e.g. Nell or custom) is active.
 */

export const DEFAULT_AVATARS = [
  { id: 'amma', label: 'Kalyani Amma', url: '/avatar_amma.jpg' },
  { id: 'nell', label: 'Nell Vance', url: '/avatar_nell.jpg' },
  { id: 'elder_1', label: 'Elder (Female 1)', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80' },
  { id: 'elder_2', label: 'Elder (Male 1)', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80' },
  { id: 'elder_3', label: 'Elder (Warm Smile)', url: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&w=300&q=80' },
]

export function getPatientAvatar(patient) {
  if (!patient) return '/avatar_amma.jpg'
  if (patient.photo_url) return patient.photo_url
  if (patient.avatar_url) return patient.avatar_url
  if (patient.patient_id === 'patient_001') return '/avatar_nell.jpg'
  return '/avatar_amma.jpg'
}

export function getPatientHero(patient) {
  if (!patient) return '/hero_family.jpg'
  if (patient.hero_url) return patient.hero_url
  if (patient.photo_url) return patient.photo_url
  if (patient.patient_id === 'patient_001') return '/hero_nell.jpg'
  return '/hero_family.jpg'
}

export function getCaregiverName(patient) {
  if (patient?.relationships?.[0]?.name) return patient.relationships[0].name
  if (patient?.patient_id === 'patient_001') return 'Clara'
  return 'Meera'
}

export function getElderDisplayName(patient) {
  if (patient?.preferred_name) return patient.preferred_name
  if (patient?.name) return patient.name.split(' ')[0]
  if (patient?.patient_id === 'patient_001') return 'Nell'
  return 'Amma'
}

export function getElderChatSender(patient) {
  if (!patient || patient.patient_id === 'patient_kalyani') return 'Kalyani'
  if (patient.patient_id === 'patient_001') return 'Nell'
  if (patient.name) return patient.name.split(' ')[0]
  if (patient.preferred_name) return patient.preferred_name
  return 'You'
}
