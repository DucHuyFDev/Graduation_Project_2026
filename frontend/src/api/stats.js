import axiosInstance from './axios'

/** Thống kê cá nhân của student */
export const getStatsMe = () =>
  axiosInstance.get('/stats/me/').then(r => r.data)

/** Thống kê tổng quan hệ thống (teacher) */
export const getStatsTeacher = () =>
  axiosInstance.get('/stats/teacher/').then(r => r.data)

/** Danh sách học sinh (teacher) */
export const getStudents = (params = {}) =>
  axiosInstance.get('/stats/students/', { params }).then(r => r.data)

/** Khóa tài khoản học sinh */
export const lockStudent = (id) =>
  axiosInstance.post(`/stats/students/${id}/lock/`).then(r => r.data)

/** Mở khóa tài khoản học sinh */
export const unlockStudent = (id) =>
  axiosInstance.post(`/stats/students/${id}/unlock/`).then(r => r.data)
