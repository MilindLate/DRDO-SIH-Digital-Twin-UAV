import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import { wsService } from './services/websocket'

// Lazy-load all 16 pages
import Page01_CommandOverview from './pages/Page01_CommandOverview'
import Page02_LiveEngineMonitor from './pages/Page02_LiveEngineMonitor'
import Page03_DigitalTwin from './pages/Page03_DigitalTwin'
import Page04_EngineHealth from './pages/Page04_EngineHealth'
import Page05_FaultDiagnosis from './pages/Page05_FaultDiagnosis'
import Page06_AIAnalytics from './pages/Page06_AIAnalytics'
import Page07_RULDegradation from './pages/Page07_RULDegradation'
import Page08_MissionSimulator from './pages/Page08_MissionSimulator'
import Page09_MissionReplay from './pages/Page09_MissionReplay'
import Page10_PostFlightAnalysis from './pages/Page10_PostFlightAnalysis'
import Page11_Maintenance from './pages/Page11_Maintenance'
import Page12_EngineHistory from './pages/Page12_EngineHistory'
import Page13_SensorQuality from './pages/Page13_SensorQuality'
import Page14_TelemetryECU from './pages/Page14_TelemetryECU'
import Page15_FleetView from './pages/Page15_FleetView'
import Page16_Configuration from './pages/Page16_Configuration'
import Page17_2DCrossSection from './pages/Page17_2DCrossSection'

export default function App() {
  useEffect(() => {
    wsService.connect()
    return () => wsService.disconnect()
  }, [])

  return (
    <BrowserRouter>
      <div className="flex h-screen w-screen bg-bg overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="/overview" element={<Page01_CommandOverview />} />
            <Route path="/live-monitor" element={<Page02_LiveEngineMonitor />} />
            <Route path="/digital-twin" element={<Page03_DigitalTwin />} />
            <Route path="/engine-health" element={<Page04_EngineHealth />} />
            <Route path="/faults" element={<Page05_FaultDiagnosis />} />
            <Route path="/ai-analytics" element={<Page06_AIAnalytics />} />
            <Route path="/rul" element={<Page07_RULDegradation />} />
            <Route path="/mission-simulator" element={<Page08_MissionSimulator />} />
            <Route path="/mission-replay" element={<Page09_MissionReplay />} />
            <Route path="/post-flight" element={<Page10_PostFlightAnalysis />} />
            <Route path="/maintenance" element={<Page11_Maintenance />} />
            <Route path="/engine-history" element={<Page12_EngineHistory />} />
            <Route path="/sensor-quality" element={<Page13_SensorQuality />} />
            <Route path="/telemetry-ecu" element={<Page14_TelemetryECU />} />
            <Route path="/fleet" element={<Page15_FleetView />} />
            <Route path="/configuration" element={<Page16_Configuration />} />
            <Route path="/cross-section" element={<Page17_2DCrossSection />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
