import { Component } from 'react'

/**
 * Bắt mọi lỗi render của component con, hiển thị fallback thay vì màn hình trắng.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] px-4">
          <div className="max-w-md w-full text-center">
            <div className="text-6xl mb-6">⚠️</div>
            <h1 className="text-2xl font-bold text-[#1e3a5f] mb-3">Có lỗi xảy ra</h1>
            <p className="text-gray-500 mb-6 text-sm leading-relaxed">
              Trang này gặp sự cố không mong muốn. Vui lòng thử tải lại hoặc quay về trang chủ.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-[#1e3a5f] text-white rounded-lg font-semibold text-sm hover:bg-[#2c5282] transition-colors"
              >
                Tải lại trang
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
                className="px-5 py-2.5 border-2 border-[#1e3a5f] text-[#1e3a5f] rounded-lg font-semibold text-sm hover:bg-[#1e3a5f] hover:text-white transition-colors"
              >
                Về trang chủ
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">Chi tiết lỗi (dev only)</summary>
                <pre className="mt-2 text-xs text-red-500 bg-red-50 p-3 rounded-lg overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
