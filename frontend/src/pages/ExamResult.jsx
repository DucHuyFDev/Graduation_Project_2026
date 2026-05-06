import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, XCircle, Download, RefreshCw, Home, Loader2, Star } from 'lucide-react'
import { getAttemptDetail, getExamDetail } from '../api/exams'

// ─── Màu điểm ─────────────────────────────────────────────────
function getScoreColor(score) {
  if (score >= 8) return 'text-green-600'
  if (score >= 5) return 'text-[#f5a623]'
  return 'text-red-500'
}

function ScoreCircle({ score }) {
  const color = getScoreColor(score)
  return (
    <div className="relative w-36 h-36 mx-auto mb-4">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60" cy="60" r="52"
          fill="none"
          stroke={score >= 8 ? '#22c55e' : score >= 5 ? '#f5a623' : '#ef4444'}
          strokeWidth="10"
          strokeDasharray={`${2 * Math.PI * 52}`}
          strokeDashoffset={`${2 * Math.PI * 52 * (1 - score / 10)}`}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-extrabold ${color}`}>{score.toFixed(1)}</span>
        <span className="text-xs text-gray-400 font-medium">/10</span>
      </div>
    </div>
  )
}

function ExamResult() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [attempt, setAttempt] = useState(null)
  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Dùng kết quả từ state nếu có (vừa nộp bài)
    const stateResult = location.state?.result

    getAttemptDetail(parseInt(attemptId))
      .then(data => {
        setAttempt(data)
        // Nếu server trả score thì dùng, fallback về stateResult
        if (data.score == null && stateResult) {
          setAttempt(prev => ({ ...prev, ...stateResult }))
        }
        return getExamDetail(data.exam_id)
      })
      .then(examData => setExam(examData))
      .catch(() => setError('Không thể tải kết quả bài thi.'))
      .finally(() => setLoading(false))
  }, [attemptId])

  const handleDownloadPDF = () => {
    if (!attempt?.answer_pdf_url) return
    window.open(attempt.answer_pdf_url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-[#1e3a5f]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-sm">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate('/exams')} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg font-semibold text-sm">
            Về danh sách đề
          </button>
        </div>
      </div>
    )
  }

  const score = attempt?.score ?? 0
  const correctCount = attempt?.correct_count ?? attempt?.answers?.filter(a => a.is_correct).length ?? 0
  const totalQuestions = exam?.questions?.length ?? attempt?.answers?.length ?? 0
  const canRetry = (attempt?.attempt_number ?? 3) < 3

  return (
    <div className="min-h-screen bg-[#f0f4f8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-5 text-center">
          <h1 className="text-2xl font-extrabold text-[#1e3a5f] mb-1">Kết quả bài thi</h1>
          {exam && <p className="text-gray-500 text-sm mb-6">{exam.title}</p>}

          <ScoreCircle score={parseFloat(score)} />

          <div className="flex justify-center gap-8 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{correctCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">Câu đúng</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{totalQuestions - correctCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">Câu sai</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">{totalQuestions}</p>
              <p className="text-xs text-gray-400 mt-0.5">Tổng câu</p>
            </div>
          </div>

          {/* Nhận xét */}
          <div className={`mt-5 px-4 py-3 rounded-xl text-sm font-medium inline-flex items-center gap-2
            ${score >= 8 ? 'bg-green-50 text-green-700' : score >= 5 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'}`}>
            <Star size={14} />
            {score >= 8 ? 'Xuất sắc! Bạn đã nắm vững kiến thức.' : score >= 5 ? 'Khá tốt! Tiếp tục luyện tập để cải thiện.' : 'Cần ôn tập thêm. Đừng nản nhé!'}
          </div>

          {/* Nút hành động */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {attempt?.answer_pdf_url && (
              <button
                onClick={handleDownloadPDF}
                className="flex items-center gap-2 px-4 py-2 border-2 border-[#1e3a5f] text-[#1e3a5f] rounded-xl text-sm font-semibold hover:bg-[#1e3a5f] hover:text-white transition-colors"
              >
                <Download size={15} /> Tải đáp án PDF
              </button>
            )}
            {canRetry && exam && (
              <button
                onClick={() => navigate(`/exam-room/${exam.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-[#f5a623] text-white rounded-xl text-sm font-semibold hover:bg-[#e09410] transition-colors"
              >
                <RefreshCw size={15} /> Làm lại ({3 - (attempt?.attempt_number ?? 0)} lượt)
              </button>
            )}
            <button
              onClick={() => navigate('/exams')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#2c5282] transition-colors"
            >
              <Home size={15} /> Về danh sách đề
            </button>
          </div>
        </div>

        {/* Bảng kết quả từng câu */}
        {attempt?.answers && attempt.answers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-[#1e3a5f] mb-4 flex items-center gap-2">
              Chi tiết từng câu
            </h2>
            <div className="space-y-2">
              {attempt.answers.map((ans, idx) => (
                <div
                  key={ans.question_id}
                  className={`flex items-center gap-3 p-3 rounded-xl border ${ans.is_correct ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${ans.is_correct ? 'bg-green-500 text-white' : 'bg-red-400 text-white'}`}>
                    {idx + 1}
                  </span>
                  <span className="text-sm text-gray-700 flex-1">Câu {idx + 1}</span>
                  {ans.is_correct
                    ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                    : <XCircle size={16} className="text-red-400 flex-shrink-0" />}
                  <span className={`text-xs font-semibold ${ans.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                    {ans.is_correct ? 'Đúng' : 'Sai'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ExamResult
