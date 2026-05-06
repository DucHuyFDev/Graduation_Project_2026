import axiosInstance from './axios'

/** Tạo session luyện tập mới với topic_id */
export const createSession = (topic_id) =>
  axiosInstance.post('/practice/sessions/', { topic_id }).then(r => r.data)

/** Lấy chi tiết session (câu hỏi + đáp án đã nộp) */
export const getSession = (sessionId) =>
  axiosInstance.get(`/practice/sessions/${sessionId}/`).then(r => r.data)

/** Gửi đáp án 1 câu */
export const answerQuestion = (sessionId, question_id, answer_data) =>
  axiosInstance.post(`/practice/sessions/${sessionId}/answer/`, {
    question_id,
    answer_data,
  }).then(r => r.data)

/** Kết thúc session */
export const endSession = (sessionId) =>
  axiosInstance.post(`/practice/sessions/${sessionId}/end/`).then(r => r.data)

/** Lịch sử luyện tập (lọc theo topic_id nếu có) */
export const getPracticeHistory = (topic_id) =>
  axiosInstance.get('/practice/history/', {
    params: topic_id ? { topic_id } : {}
  }).then(r => r.data)
