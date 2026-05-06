import axiosInstance from './axios'

const documentsApi = {
  // GET /api/documents/ - Lấy danh sách tài liệu (Public)
  getDocuments: async () => {
    const response = await axiosInstance.get('/documents/')
    return response.data
  },

  // GET /api/documents/<id>/ - Lấy chi tiết tài liệu (Có file_url)
  getDocumentDetail: async (id) => {
    const response = await axiosInstance.get(`/documents/${id}/`)
    return response.data
  },

  // POST /api/documents/ - Upload tài liệu mới (Teacher only)
  uploadDocument: async (formData) => {
    const response = await axiosInstance.post('/documents/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // DELETE /api/documents/<id>/ - Xóa tài liệu (Teacher only)
  deleteDocument: async (id) => {
    const response = await axiosInstance.delete(`/documents/${id}/`)
    return response.data
  },
}

// Named exports cho các component teacher
export const getDocuments = (params = {}) =>
  axiosInstance.get('/documents/', { params }).then(r => r.data)

export const uploadDocument = (formData) =>
  axiosInstance.post('/documents/', formData).then(r => r.data)

export const deleteDocument = (id) =>
  axiosInstance.delete(`/documents/${id}/`).then(r => r.data)

export default documentsApi

