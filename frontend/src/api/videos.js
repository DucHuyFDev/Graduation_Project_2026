import axiosInstance from './axios'

/** Danh sách video — filter theo topic_id, category */
export const getVideos = (params = {}) =>
  axiosInstance.get('/videos/', { params }).then(r => r.data)

/** Chi tiết 1 video */
export const getVideoDetail = (id) =>
  axiosInstance.get(`/videos/${id}/`).then(r => r.data)

/** Danh sách buổi học trực tiếp (live_session) — sort DESC */
export const getLiveSessions = () =>
  axiosInstance.get('/videos/live-sessions/').then(r => r.data)

/** Tạo video mới [teacher] */
export const createVideo = (data) =>
  axiosInstance.post('/videos/', data).then(r => r.data)

/** Cập nhật video [teacher] */
export const updateVideo = (id, data) =>
  axiosInstance.put(`/videos/${id}/`, data).then(r => r.data)

/** Soft delete video [teacher] */
export const deleteVideo = (id) =>
  axiosInstance.delete(`/videos/${id}/`).then(r => r.data)
