import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import GameList from './pages/GameList'
import Matching from './pages/Matching'
import DiscountConfig from './pages/DiscountConfig'
import BillManagement from './pages/BillManagement'
import DMSchedule from './pages/DMSchedulePage'
import PlayerManagement from './pages/PlayerManagement'
import ScriptManagement from './pages/ScriptManagement'

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="games" element={<GameList />} />
        <Route path="matching" element={<Matching />} />
        <Route path="discount" element={<DiscountConfig />} />
        <Route path="bills" element={<BillManagement />} />
        <Route path="dm-schedule" element={<DMSchedule />} />
        <Route path="players" element={<PlayerManagement />} />
        <Route path="scripts" element={<ScriptManagement />} />
      </Route>
    </Routes>
  )
}

export default App
