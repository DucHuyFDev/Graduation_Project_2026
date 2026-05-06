import axios from 'axios'

// Instance duy nhất dùng trong toàn bộ project
const axiosInstance = axios.create({
  baseURL: '/api',
  timeout: 60000,  // tăng lên 60s cho parse PDF có thể lâu
})

// Interceptor request: tự động thêm Authorization + set Content-Type đúng
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    // Chỉ set JSON nếu không phải FormData — tránh override multipart/form-data
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json'
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Interceptor response: xử lý lỗi 401 — xóa auth và redirect
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Xóa auth data
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      // Redirect về login nếu chưa ở đó
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
