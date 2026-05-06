import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Bảo vệ route yêu cầu đăng nhập và/hoặc role cụ thể.
 * - Chưa đăng nhập → redirect /login
 * - Sai role → redirect /
 */
function ProtectedRoute({ children, requiredRole }) {
  const { isAuthenticated, hasRole } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default ProtectedRoute
