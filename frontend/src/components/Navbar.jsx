import { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  BookOpen, FileText, Library, BarChart2,
  ChevronDown, User, LogOut, Settings, LayoutDashboard, AlertCircle
} from 'lucide-react'
import ConfirmModal from './ConfirmModal'

function Navbar() {
  const { isAuthenticated, hasRole, user, logout } = useAuth()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const dropdownRef = useRef(null)

  // Thu nhỏ navbar khi cuộn trang
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    setDropdownOpen(false)
    setShowLogoutModal(true)
  }

  const confirmLogout = () => {
    setShowLogoutModal(false)
    logout()
  }

  const navLinkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors duration-150 px-1 py-1 border-b-2 ${
      isActive
        ? 'text-[#f5a623] border-[#f5a623]'
        : 'text-white/85 border-transparent hover:text-white hover:border-white/40'
    }`

  return (
    <>
    <nav className={`mp-glass sticky top-0 z-50 transition-all duration-300 ${isScrolled ? 'py-2 shadow-lg' : 'py-3'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-white font-extrabold text-xl tracking-tight">
              Math<span className="text-[#f5a623]">Pro</span>
            </span>
          </Link>

          {/* Nav links giữa */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink to="/topics" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <BookOpen size={15} />
                Làm câu hỏi luyện tập
              </span>
            </NavLink>
            <NavLink to="/exams" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <FileText size={15} />
                Làm bộ đề thi thử
              </span>
            </NavLink>
            <NavLink to="/documents" className={navLinkClass}>
              <span className="flex items-center gap-1.5">
                <Library size={15} />
                Tài liệu
              </span>
            </NavLink>
            {/* Thống kê chỉ hiện khi đăng nhập với role student */}
            {isAuthenticated && hasRole('student') && (
              <NavLink to="/stats" className={navLinkClass}>
                <span className="flex items-center gap-1.5">
                  <BarChart2 size={15} />
                  Thống kê của tôi
                </span>
              </NavLink>
            )}
          </div>

          {/* Nút bên phải */}
          <div className="flex items-center gap-3">
            {!isAuthenticated ? (
              <>
                {/* Guest: Đăng nhập + Đăng ký */}
                <button
                  onClick={() => navigate('/login')}
                  className="text-white text-sm font-medium px-4 py-1.5 border border-white/40 rounded-md hover:bg-white/10 transition-colors"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="text-white text-sm font-semibold px-4 py-1.5 bg-[#f5a623] rounded-md hover:bg-[#e09410] transition-colors"
                >
                  Đăng ký
                </button>
              </>
            ) : (
              <>
                {/* Teacher: Trang quản lý */}
                {hasRole('teacher') && (
                  <Link
                    to="/teacher"
                    className="flex items-center gap-1.5 text-white text-sm font-medium px-3 py-1.5 bg-white/15 rounded-md hover:bg-white/25 transition-colors"
                  >
                    <LayoutDashboard size={15} />
                    Trang quản lý
                  </Link>
                )}

                {/* Avatar dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 text-white text-sm font-medium px-2 py-1.5 rounded-md hover:bg-white/10 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#f5a623] flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
                      {user?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span className="hidden sm:block max-w-[100px] truncate">{user?.username}</span>
                    <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 animate-fadeInDown">
                      <div className="px-4 py-2.5 border-b border-gray-100">
                        <p className="font-semibold text-gray-800 text-sm truncate">{user?.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</p>
                      </div>
                      <button
                        onClick={() => { setDropdownOpen(false); navigate('/forgot-password') }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Settings size={15} className="text-gray-400" />
                        Đổi mật khẩu
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={15} />
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>

    <ConfirmModal
      open={showLogoutModal}
      title="Đăng xuất"
      message="Bạn có chắc chắn muốn đăng xuất khỏi MathPro không?"
      confirmLabel="Đăng xuất"
      cancelLabel="Ở lại"
      confirmVariant="danger"
      icon={<LogOut size={28} />}
      onConfirm={confirmLogout}
      onCancel={() => setShowLogoutModal(false)}
    />
    </>
  )
}

export default Navbar
