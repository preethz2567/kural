import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import CompanionChat from './pages/CompanionChat'
import CaregiverPlaceholder from './pages/CaregiverPlaceholder'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/companion" element={<CompanionChat />} />
        <Route path="/caregiver" element={<CaregiverPlaceholder />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
