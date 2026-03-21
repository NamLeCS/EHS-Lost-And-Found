import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './Spinner'

export function ProtectedRoute() {
  const { token, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) return <PageLoader />
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
