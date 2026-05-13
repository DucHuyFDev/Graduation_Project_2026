import axiosInstance from './axios'

/** Lấy danh sách comment theo target */
export const getComments = (targetType, targetId) =>
  axiosInstance
    .get('/comments/', { params: { target_type: targetType, target_id: targetId } })
    .then(r => r.data)

/** Tạo comment / reply mới */
export const createComment = (data) =>
  axiosInstance.post('/comments/', data).then(r => r.data)

/** Sửa nội dung comment */
export const editComment = (id, content) =>
  axiosInstance.patch(`/comments/${id}/`, { content }).then(r => r.data)

/** Xóa mềm comment */
export const deleteComment = (id) =>
  axiosInstance.delete(`/comments/${id}/`).then(r => r.data)
