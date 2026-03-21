import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PageLoader } from './Spinner'

export function AdminRoute() {
  const { user, token, isReady } = useAuth()

  if (!isReady) return <PageLoader />
  if (!token) return <Navigate to="/login" replace />
  if (!user?.is_admin) return <Navigate to="/reports" replace />
  return <Outlet />
}
