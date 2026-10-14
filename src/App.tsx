import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireAuth } from '@/auth/RequireAuth'
import { Layout } from '@/components/Layout'
import { HomePage } from '@/pages/HomePage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { TemplatesPage } from '@/pages/TemplatesPage'
import { StatsPage } from '@/pages/StatsPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route
            element={
              <RequireAuth>
                <Layout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/movimientos" element={<TransactionsPage />} />
            <Route path="/rapidas" element={<TemplatesPage />} />
            <Route path="/estadisticas" element={<StatsPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
