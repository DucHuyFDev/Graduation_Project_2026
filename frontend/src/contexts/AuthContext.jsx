import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react'
import axiosInstance from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // Khởi tạo state từ localStorage ngay khi mount
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'))
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('auth_user')
    try { return saved ? JSON.parse(saved) : null }
    catch { return null }
  })
  const [isLoading, setIsLoading] = useState(false)

  // Ref để logout có thể gọi từ interceptor (tránh stale closure)
  const logoutRef = useRef(null)

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('ai_session_id') // Reset session AI trên client
    window.location.href = '/login'
  }, [])

  // Gắn logout vào ref để interceptor axios dùng được
  useEffect(() => {
    logoutRef.current = logout
  }, [logout])

  // Cập nhật axios header khi token thay đổi
  useEffect(() => {
    if (token) {
      axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axiosInstance.defaults.headers.common['Authorization']
    }
  }, [token])

  // Lưu token/user vào localStorage
  const _saveAuth = useCallback((access_token, userData) => {
    setToken(access_token)
    setUser(userData)
    localStorage.setItem('auth_token', access_token)
    localStorage.setItem('auth_user', JSON.stringify(userData))
  }, [])

  const login = useCallback(async (username, password) => {
    setIsLoading(true)
    try {
      const res = await axiosInstance.post('/auth/login/', { username, password })
      const { access_token, user_id, role } = res.data
      _saveAuth(access_token, { id: user_id, username, role })
      return res.data
    } finally {
      setIsLoading(false)
    }
  }, [_saveAuth])

  const register = useCallback(async (username, email, password) => {
    setIsLoading(true)
    try {
      const res = await axiosInstance.post('/auth/register/', { username, email, password })
      const { access_token, user_id, role } = res.data
      _saveAuth(access_token, { id: user_id, username, role })
      return res.data
    } finally {
      setIsLoading(false)
    }
  }, [_saveAuth])

  const forgotPassword = useCallback(async (username, email) => {
    const res = await axiosInstance.post('/auth/forgot-password/', { username, email })
    return res.data // trả về { reset_token, message }
  }, [])

  const resetPassword = useCallback(async (reset_token, new_password) => {
    const res = await axiosInstance.post('/auth/reset-password/', { reset_token, new_password })
    return res.data
  }, [])

  const isAuthenticated = useMemo(() => Boolean(token), [token])

  const hasRole = useCallback((role) => user?.role === role, [user])

  const value = useMemo(() => ({
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    hasRole,
  }), [user, token, isLoading, isAuthenticated, login, register, logout, forgotPassword, resetPassword, hasRole])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook tiện lợi để dùng trong component
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth phải được dùng trong AuthProvider')
  return ctx
}

export default AuthContext
