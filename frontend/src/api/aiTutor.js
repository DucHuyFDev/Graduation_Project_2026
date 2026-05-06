import axiosInstance from './axios'

/** Tạo session chat AI mới */
export const createAiSession = (context_type = 'general', context_id = null) =>
  axiosInstance.post('/ai/sessions/', { context_type, context_id }).then(r => r.data)

/** Lấy lịch sử tin nhắn của session */
export const getSessionMessages = (sessionId) =>
  axiosInstance.get(`/ai/sessions/${sessionId}/messages/`).then(r => r.data)

/** Gửi tin nhắn và nhận phản hồi từ AI */
export const sendMessage = (sessionId, message) =>
  axiosInstance.post(`/ai/sessions/${sessionId}/chat/`, { message }).then(r => r.data)

/** Upload PDF và parse với AI */
export const parsePDF = (file) => {
  const fd = new FormData()
  fd.append('file', file)
  return axiosInstance.post('/ai/parse-pdf/', fd).then(r => r.data)
}
