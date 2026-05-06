import axiosInstance from './axios'

/** Lấy cây chuyên đề đầy đủ */
export const getTopicsTree = () =>
  axiosInstance.get('/topics/tree/').then(r => r.data)

/** Lấy danh sách chuyên đề phẳng, hỗ trợ filter */
export const getTopics = (params = {}) =>
  axiosInstance.get('/topics/', { params }).then(r => r.data)

/** Chi tiết 1 chuyên đề (kèm breadcrumbs) */
export const getTopicDetail = (id) =>
  axiosInstance.get(`/topics/${id}/`).then(r => r.data)
