import axiosInstance from './axios'

/** Lấy danh sách câu hỏi (có phân trang) */
export const getQuestions = (params = {}) =>
  axiosInstance.get('/questions/', { params }).then(r => r.data)

/** Chi tiết 1 câu hỏi */
export const getQuestion = (id) =>
  axiosInstance.get(`/questions/${id}/`).then(r => r.data)

/** Upload ảnh lên server */
export const uploadImage = (file) => {
  const fd = new FormData();
  fd.append('image', file);
  return axiosInstance.post('/questions/upload-image/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
}

/** Tạo câu hỏi mới (multipart/form-data) */
export const createQuestion = (formData) =>
  axiosInstance.post('/questions/', formData).then(r => r.data)

/** Cập nhật câu hỏi (multipart/form-data) */
export const updateQuestion = (id, formData) =>
  axiosInstance.put(`/questions/${id}/`, formData).then(r => r.data)

/** Xóa câu hỏi (soft delete) */
export const deleteQuestion = (id) =>
  axiosInstance.delete(`/questions/${id}/`).then(r => r.data)
