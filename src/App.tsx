import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireAuth } from '@/auth/RequireAuth'
import { Layout } from '@/components/Layout'
import { DashboardPage } from '@/pages/DashboardPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { TemplatesPage } from '@/pages/TemplatesPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
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
            <Route path="/" element={<DashboardPage />} />
            <Route path="/movimientos" element={<TransactionsPage />} />
            <Route path="/rapidas" element={<TemplatesPage />} />
            <Route path="/cuentas" element={<AccountsPage />} />
            <Route path="/categorias" element={<CategoriesPage />} />
            <Route path="/estadisticas" element={<StatsPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
