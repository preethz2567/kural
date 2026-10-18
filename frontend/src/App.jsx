import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MobileDeviceFrame from './components/MobileDeviceFrame'
import LandingPage from './pages/LandingPage'
import CompanionChat from './pages/CompanionChat'
import Onboarding from './pages/Onboarding'
import ProfileList from './pages/ProfileList'
import CaregiverPlaceholder from './pages/CaregiverPlaceholder'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <MobileDeviceFrame>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/profiles" element={<ProfileList />} />
          <Route path="/companion" element={<CompanionChat />} />
          <Route path="/caregiver" element={<CaregiverPlaceholder />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </MobileDeviceFrame>
    </BrowserRouter>
  )
}
