import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [touched, setTouched] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const touch = (field) => () => setTouched({ ...touched, [field]: true })

  // Validate từng field
  const errors = {
    username: !form.username.trim() ? 'Tên đăng nhập không được để trống.' : '',
    email: !form.email.trim()
      ? 'Email không được để trống.'
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
        ? 'Email không hợp lệ.'
        : '',
    password: !form.password
      ? 'Mật khẩu không được để trống.'
      : form.password.length < 6
        ? 'Mật khẩu ít nhất 6 ký tự.'
        : '',
    confirm: !form.confirm
      ? 'Vui lòng xác nhận mật khẩu.'
      : form.confirm !== form.password
        ? 'Mật khẩu xác nhận không khớp.'
        : '',
  }

  const isFormValid = !Object.values(errors).some(Boolean) && agreeTerms

  const handleSubmit = async () => {
    // Touch tất cả fields
    setTouched({ username: true, email: true, password: true, confirm: true })
    if (!isFormValid) return
    setError('')
    setIsLoading(true)
    try {
      await register(form.username.trim(), form.email.trim(), form.password)
      navigate('/topics', { replace: true })
    } catch (e) {
      setError(e.response?.data?.error || 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  const FieldError = ({ field }) =>
    touched[field] && errors[field]
      ? <p className="error-msg mt-1">⚠ {errors[field]}</p>
      : null

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f0f4f8] flex flex-col items-center justify-center py-10 px-4">
      {/* Card */}
      <div className="mp-card w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-[#1e3a5f]">Tạo tài khoản mới</h1>
          <p className="text-gray-500 text-sm mt-1">
            Bắt đầu hành trình chinh phục Toán học cùng MathPro ngay hôm nay.
          </p>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {/* Username */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Tên đăng nhập
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><User size={16} /></span>
            <input
              id="reg-username"
              type="text"
              className={`mp-input ${touched.username && errors.username ? 'error' : ''}`}
              placeholder="Nhập tên đăng nhập"
              value={form.username}
              onChange={update('username')}
              onBlur={touch('username')}
              autoComplete="username"
            />
          </div>
          <FieldError field="username" />
        </div>

        {/* Email */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Email
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><Mail size={16} /></span>
            <input
              id="reg-email"
              type="email"
              className={`mp-input ${touched.email && errors.email ? 'error' : ''}`}
              placeholder="example@email.com"
              value={form.email}
              onChange={update('email')}
              onBlur={touch('email')}
              autoComplete="email"
            />
          </div>
          <FieldError field="email" />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Mật khẩu
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><Lock size={16} /></span>
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              className={`mp-input ${touched.password && errors.password ? 'error' : ''}`}
              placeholder="••••••••"
              value={form.password}
              onChange={update('password')}
              onBlur={touch('password')}
              autoComplete="new-password"
              style={{ paddingRight: '2.5rem' }}
            />
            <button type="button" className="input-icon-right" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <FieldError field="password" />
        </div>

        {/* Confirm password */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
            Xác nhận mật khẩu
          </label>
          <div className="input-wrapper">
            <span className="input-icon"><Lock size={16} /></span>
            <input
              id="reg-confirm"
              type={showConfirm ? 'text' : 'password'}
              className={`mp-input ${touched.confirm && errors.confirm ? 'error' : ''}`}
              placeholder="••••••••"
              value={form.confirm}
              onChange={update('confirm')}
              onBlur={touch('confirm')}
              autoComplete="new-password"
              style={{ paddingRight: '2.5rem' }}
            />
            <button type="button" className="input-icon-right" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <FieldError field="confirm" />
        </div>

        {/* Terms */}
        <div className="flex items-center gap-2 mb-6">
          <input
            id="agree-terms"
            type="checkbox"
            className="w-4 h-4 rounded border-gray-300 accent-[#f5a623] cursor-pointer flex-shrink-0"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
          />
          <label htmlFor="agree-terms" className="text-sm text-gray-600 cursor-pointer select-none">
            Tôi đồng ý với các{' '}
            <span className="text-[#f5a623] font-semibold cursor-pointer hover:underline">
              Điều khoản dịch vụ
            </span>
          </label>
        </div>

        {/* Submit */}
        <button
          id="reg-submit"
          className="btn-accent"
          onClick={handleSubmit}
          disabled={isLoading || !isFormValid}
        >
          {isLoading ? <span className="spinner" /> : <UserPlus size={18} />}
          {isLoading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
        </button>

        <div className="border-t border-gray-100 mt-5 pt-4 text-center">
          <p className="text-sm text-gray-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-[#f5a623] font-semibold hover:underline">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register
