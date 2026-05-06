import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const data = await login(username.trim(), password)
      // Redirect theo role
      if (data.role === 'teacher') {
        navigate('/teacher', { replace: true })
      } else {
        navigate('/topics', { replace: true })
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f0f4f8] flex flex-col items-center justify-center py-10 px-4">
      {/* Tiêu đề */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-[#1e3a5f]">Chào mừng trở lại</h1>
        <p className="text-gray-500 mt-2">Đăng nhập để tiếp tục lộ trình học tập của bạn</p>
      </div>

      {/* Card */}
      <div className="mp-card w-full max-w-md">
        {/* Error banner */}
        {error && <div className="error-banner">{error}</div>}

        {/* Username */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Tên đăng nhập
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><User size={16} /></span>
            <input
              id="login-username"
              type="text"
              className="mp-input"
              placeholder="Nhập tên đăng nhập hoặc email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="username"
              autoFocus
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Mật khẩu
            </label>
            <Link to="/forgot-password" className="text-sm text-[#f5a623] hover:underline font-medium">
              Quên mật khẩu?
            </Link>
          </div>
          <div className="input-wrapper">
            <span className="input-icon"><Lock size={16} /></span>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="mp-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
              style={{ paddingRight: '2.5rem' }}
            />
            <button
              type="button"
              className="input-icon-right"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2 mb-6">
          <input
            id="remember"
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 accent-[#1e3a5f] cursor-pointer"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer select-none">
            Ghi nhớ đăng nhập
          </label>
        </div>

        {/* Nút đăng nhập */}
        <button
          id="login-submit"
          className="btn-primary"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? <span className="spinner" /> : <LogIn size={18} />}
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>



        {/* Đăng ký link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="text-[#f5a623] font-semibold hover:underline">
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
