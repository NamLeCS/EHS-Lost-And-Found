import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { PageLoader } from './components/Spinner'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ReportsPage } from './pages/ReportsPage'
import { ReportMatchesPage } from './pages/ReportMatchesPage'
import { ClaimsPage } from './pages/ClaimsPage'
import { AdminFoundItemsPage } from './pages/AdminFoundItemsPage'
import { AdminClaimsPage } from './pages/AdminClaimsPage'

function HomeRedirect() {
  const { token, isReady } = useAuth()
  if (!isReady) return <PageLoader />
  return <Navigate to={token ? '/reports' : '/login'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomeRedirect />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="reports" element={<ReportsPage />} />
          <Route path="reports/:id/matches" element={<ReportMatchesPage />} />
          <Route path="claims" element={<ClaimsPage />} />
        </Route>

        <Route element={<AdminRoute />}>
          <Route path="admin/found-items" element={<AdminFoundItemsPage />} />
          <Route path="admin/claims" element={<AdminClaimsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
