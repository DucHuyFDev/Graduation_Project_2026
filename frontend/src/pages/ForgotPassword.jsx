import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, Info } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

function ForgotPassword() {
  const { forgotPassword, resetPassword } = useAuth()
  const navigate = useNavigate()

  // Bước 1: xác minh tài khoản
  const [step1, setStep1] = useState({ username: '', email: '' })
  // Bước 2: mật khẩu mới
  const [step2, setStep2] = useState({ password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [resetToken, setResetToken] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Bước 1: gửi yêu cầu lấy reset_token
  const handleVerify = async () => {
    if (!step1.username.trim() || !step1.email.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và email.')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      const data = await forgotPassword(step1.username.trim(), step1.email.trim())
      setResetToken(data.reset_token)
    } catch (e) {
      setError(e.response?.data?.error || 'Không tìm thấy tài khoản. Vui lòng kiểm tra lại.')
    } finally {
      setIsLoading(false)
    }
  }

  // Bước 2: đặt mật khẩu mới
  const handleReset = async () => {
    if (!step2.password || !step2.confirm) {
      setError('Vui lòng nhập đầy đủ mật khẩu mới.')
      return
    }
    if (step2.password !== step2.confirm) {
      setError('Mật khẩu xác nhận không khớp.')
      return
    }
    if (step2.password.length < 6) {
      setError('Mật khẩu ít nhất 6 ký tự.')
      return
    }
    setError('')
    setIsLoading(true)
    try {
      await resetPassword(resetToken, step2.password)
      setSuccess('Đổi mật khẩu thành công! Đang chuyển hướng về trang đăng nhập...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (e) {
      setError(e.response?.data?.error || 'Đổi mật khẩu thất bại. Vui lòng thử lại.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f0f4f8] py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Back button */}
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1e3a5f] mb-6 transition-colors"
        >
          <ArrowLeft size={15} />
          Quay lại đăng nhập
        </Link>

        {/* Card */}
        <div className="mp-card">
          <h1 className="text-2xl font-extrabold text-[#1e3a5f] mb-1">Khôi phục mật khẩu</h1>
          <p className="text-gray-500 text-sm mb-6">
            Vui lòng cung cấp thông tin tài khoản và thiết lập mật khẩu mới của bạn.
          </p>

          {/* Error / Success */}
          {error && <div className="error-banner mb-4">{error}</div>}
          {success && (
            <div className="bg-green-50 border border-green-200 border-l-4 border-l-green-500 rounded-lg p-3 text-green-700 text-sm mb-4">
              ✓ {success}
            </div>
          )}

          {/* BƯỚC 1: XÁC MINH TÀI KHOẢN */}
          <div className="mb-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="step-badge">1</span>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Xác minh tài khoản
              </span>
            </div>

            <div className="space-y-4 pl-9">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Tên đăng nhập</label>
                <div className="input-wrapper">
                  <span className="input-icon"><User size={15} /></span>
                  <input
                    id="fp-username"
                    type="text"
                    className="mp-input"
                    placeholder="Nhập tên đăng nhập của bạn"
                    value={step1.username}
                    onChange={(e) => setStep1({ ...step1, username: e.target.value })}
                    disabled={!!resetToken}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email đăng ký</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Mail size={15} /></span>
                  <input
                    id="fp-email"
                    type="email"
                    className="mp-input"
                    placeholder="example@gmail.com"
                    value={step1.email}
                    onChange={(e) => setStep1({ ...step1, email: e.target.value })}
                    disabled={!!resetToken}
                    onKeyDown={(e) => e.key === 'Enter' && !resetToken && handleVerify()}
                  />
                </div>
              </div>

              {/* Nút xác minh — chỉ hiện ở bước 1 */}
              {!resetToken && (
                <button
                  id="fp-verify"
                  className="btn-primary mt-2"
                  onClick={handleVerify}
                  disabled={isLoading}
                >
                  {isLoading ? <span className="spinner" /> : null}
                  {isLoading ? 'Đang xác minh...' : 'Xác minh tài khoản'}
                </button>
              )}

              {resetToken && (
                <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Tài khoản đã được xác minh
                </div>
              )}
            </div>
          </div>

          {/* BƯỚC 2: MẬT KHẨU MỚI */}
          <div className={resetToken ? '' : 'opacity-40 pointer-events-none'}>
            <div className="flex items-center gap-2.5 mb-4">
              <span className={`step-badge ${resetToken ? 'bg-[#1e3a5f]' : 'bg-gray-300'}`}>2</span>
              <span className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                Mật khẩu mới
              </span>
            </div>

            <div className="space-y-4 pl-9">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Mật khẩu mới</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input
                    id="fp-new-password"
                    type={showPwd ? 'text' : 'password'}
                    className="mp-input"
                    placeholder="••••••••"
                    value={step2.password}
                    onChange={(e) => setStep2({ ...step2, password: e.target.value })}
                    disabled={!resetToken}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" className="input-icon-right" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Xác nhận mật khẩu mới</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Lock size={15} /></span>
                  <input
                    id="fp-confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    className="mp-input"
                    placeholder="••••••••"
                    value={step2.confirm}
                    onChange={(e) => setStep2({ ...step2, confirm: e.target.value })}
                    disabled={!resetToken}
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button type="button" className="input-icon-right" onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Warning box */}
              <div className="warning-box">
                <Info size={16} className="text-[#f5a623] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Lưu ý:</strong> Không được dùng mật khẩu đã bởi trong 15 ngày gần nhất
                  để đảm bảo an toàn cho tài khoản của bạn.
                </span>
              </div>

              {/* Submit */}
              <button
                id="fp-reset-submit"
                className="btn-accent w-full flex items-center justify-center gap-2"
                onClick={handleReset}
                disabled={!resetToken || isLoading}
              >
                {isLoading ? <span className="spinner" /> : <KeyRound size={17} />}
                {isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </div>
          </div>
        </div>

        {/* Help links */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">Gặp khó khăn khi khôi phục?</p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a href="#" className="text-sm text-[#1e3a5f] hover:underline flex items-center gap-1">
              🏠 Trung tâm trợ giúp
            </a>
            <a href="mailto:support@mathpro.vn" className="text-sm text-[#1e3a5f] hover:underline flex items-center gap-1">
              ✉ Gửi hỗ trợ
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword
