import axiosInstance from './axios'

/** Danh sách đề thi (public), filter theo exam_type */
export const getExams = (params = {}) =>
  axiosInstance.get('/exams/', { params }).then(r => r.data)

/** Chi tiết đề thi + danh sách câu hỏi */
export const getExamDetail = (examId) =>
  axiosInstance.get(`/exams/${examId}/`).then(r => r.data)

/** Tạo lượt làm bài mới (student) */
export const createAttempt = (examId) =>
  axiosInstance.post(`/exams/${examId}/attempts/`).then(r => r.data)

/** Nộp bài (student) — answers: [{question_id, answer_data}] */
export const submitAttempt = (attemptId, answers) =>
  axiosInstance.post(`/exams/attempts/${attemptId}/submit/`, { answers }).then(r => r.data)

/** Kết quả chi tiết lượt làm bài */
export const getAttemptDetail = (attemptId) =>
  axiosInstance.get(`/exams/attempts/${attemptId}/`).then(r => r.data)

/** Tạo đề thi mới (teacher) */
export const createExam = (data) =>
  axiosInstance.post('/exams/', data).then(r => r.data)

/** Xóa mềm đề thi (teacher) */
export const deleteExam = (examId) =>
  axiosInstance.delete(`/exams/${examId}/`).then(r => r.data)

/** Tải lên file PDF đáp án cho đề thi (teacher) */
export const uploadExamPdf = (examId, file) => {
  const formData = new FormData()
  formData.append('pdf_file', file)
  return axiosInstance.post(`/exams/${examId}/upload-pdf/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data)
}
