import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Loader2, ChevronRight, CheckCircle, Home } from 'lucide-react'
import QuestionCard from '../components/QuestionCard'
import { getSession, answerQuestion, endSession } from '../api/practice'

function PracticeRoom() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [questions, setQuestions] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [submitted, setSubmitted] = useState({}) // { [questionId]: result }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [ending, setEnding] = useState(false)

  // Load session khi mount — lấy câu hỏi
  useEffect(() => {
    // Ưu tiên dùng state từ navigate (tránh gọi API lại nếu vừa tạo)
    if (location.state?.questions) {
      setQuestions(location.state.questions)
      setLoading(false)
      return
    }

    // Fallback: gọi API lấy session
    getSession(sessionId)
      .then(data => {
        // session_detail không có questions — cần giải quyết khác
        // Nếu backend không trả questions thì báo lỗi
        if (data?.questions) {
          setQuestions(data.questions)
        } else {
          setError('Không thể tải câu hỏi. Vui lòng quay lại và thử lại.')
        }
      })
      .catch(() => setError('Phiên luyện tập không hợp lệ hoặc đã hết hạn.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  const currentQuestion = questions[currentIndex]

  const handleSubmit = async (answer_data) => {
    if (!currentQuestion) return
    try {
      const result = await answerQuestion(parseInt(sessionId), currentQuestion.id, answer_data)
      setSubmitted(prev => ({ ...prev, [currentQuestion.id]: result }))
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi gửi đáp án.')
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handleFinish = async () => {
    setEnding(true)
    try {
      await endSession(parseInt(sessionId))
    } catch (err) {
      console.error('[PracticeRoom] end session error:', err)
    } finally {
      navigate('/topics')
    }
  }

  const isLastQuestion = currentIndex === questions.length - 1
  const currentResult = submitted[currentQuestion?.id]
  const isCurrentSubmitted = currentResult !== undefined

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-[#1e3a5f] mx-auto mb-4" />
          <p className="text-gray-500">Đang tải phiên luyện tập...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-sm border border-gray-100">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate('/topics')} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg font-semibold text-sm">
            Về trang chuyên đề
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb + Counter */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <button onClick={() => navigate('/topics')} className="hover:text-[#1e3a5f] transition-colors flex items-center gap-1">
              <Home size={14} /> Luyện tập
            </button>
            <ChevronRight size={12} />
            <span className="text-[#1e3a5f] font-medium">Phiên #{sessionId}</span>
          </div>
          <div className="bg-[#1e3a5f] text-white text-sm font-bold px-4 py-1.5 rounded-full">
            Câu {currentIndex + 1} / {questions.length}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-200 rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-[#f5a623] rounded-full transition-all duration-500"
            style={{ width: `${((currentIndex + (isCurrentSubmitted ? 1 : 0)) / questions.length) * 100}%` }}
          />
        </div>

        {/* QuestionCard */}
        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            onSubmit={handleSubmit}
            showResult={isCurrentSubmitted}
            result={currentResult}
            onNext={isCurrentSubmitted ? (isLastQuestion ? null : handleNext) : null}
          />
        )}

        {/* Nút Hoàn thành (câu cuối đã submit) */}
        {isLastQuestion && isCurrentSubmitted && (
          <div className="mt-5 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <h3 className="font-bold text-[#1e3a5f] text-lg mb-1">Hoàn thành phiên luyện tập!</h3>
            <p className="text-gray-500 text-sm mb-5">
              Bạn đã làm {Object.keys(submitted).length}/{questions.length} câu.
              Số câu đúng: <strong className="text-green-600">
                {Object.values(submitted).filter(r => r.is_correct).length}
              </strong>
            </p>
            <button
              onClick={handleFinish}
              disabled={ending}
              className="px-8 py-3 bg-[#f5a623] text-white rounded-xl font-semibold hover:bg-[#e09410] transition-colors disabled:opacity-60"
            >
              {ending ? <Loader2 size={16} className="animate-spin inline mr-2" /> : null}
              Về trang chuyên đề
            </button>
          </div>
        )}

        {/* Mini stats bottom */}
        {Object.keys(submitted).length > 0 && (
          <div className="mt-4 flex justify-center gap-6 text-sm text-gray-500">
            <span>Đã làm: <strong className="text-gray-700">{Object.keys(submitted).length}</strong></span>
            <span>Đúng: <strong className="text-green-600">{Object.values(submitted).filter(r => r.is_correct).length}</strong></span>
            <span>Sai: <strong className="text-red-500">{Object.values(submitted).filter(r => !r.is_correct).length}</strong></span>
          </div>
        )}
      </div>
    </div>
  )
}

export default PracticeRoom
