import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Clock, AlertTriangle, Loader2, Send, CheckCircle } from 'lucide-react'
import MathRenderer from '../components/MathRenderer'
import ConfirmModal from '../components/ConfirmModal'
import { getExamDetail, createAttempt, submitAttempt } from '../api/exams'

// ─── Định dạng giờ:phút:giây ─────────────────────────────────
function formatTime(seconds) {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Modal xác nhận bắt đầu ───────────────────────────────────
function StartModal({ exam, onStart, onCancel, loading }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-extrabold text-[#1e3a5f] mb-2">{exam.title}</h2>
        <p className="text-gray-500 text-sm mb-6">Xác nhận thông tin trước khi bắt đầu làm bài.</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-[#f0f4f8] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#1e3a5f]">{exam.questions?.length ?? '?'}</p>
            <p className="text-xs text-gray-500 mt-1">Câu hỏi</p>
          </div>
          <div className="bg-[#f0f4f8] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-[#1e3a5f]">{exam.duration_minutes}</p>
            <p className="text-xs text-gray-500 mt-1">Phút</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex gap-2 text-sm text-amber-800">
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Sau khi bắt đầu, đồng hồ sẽ chạy. Hết giờ bài sẽ tự động nộp. Còn {3 - (exam.attempt_count ?? 0)} lượt làm.</span>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:border-gray-300 transition-colors">
            Quay lại
          </button>
          <button
            onClick={onStart}
            disabled={loading}
            className="flex-1 py-3 bg-[#f5a623] text-white rounded-xl font-semibold text-sm hover:bg-[#e09410] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            Bắt đầu làm bài
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ExamRoom — Full screen, không có Navbar/Footer
// ═══════════════════════════════════════════════════════════════
function ExamRoom() {
  const { examId } = useParams()
  const navigate = useNavigate()

  const [exam, setExam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Trạng thái làm bài
  const [showModal, setShowModal] = useState(true)
  const [starting, setStarting] = useState(false)
  const [attemptId, setAttemptId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({}) // {questionId: answer_data}
  const [timeLeft, setTimeLeft] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [currentViewIdx, setCurrentViewIdx] = useState(0)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [pendingAutoSubmit, setPendingAutoSubmit] = useState(false)

  const timerRef = useRef(null)
  const autoSubmittedRef = useRef(false)

  // Load thông tin đề thi
  useEffect(() => {
    getExamDetail(parseInt(examId))
      .then(data => setExam(data))
      .catch(() => setError('Không thể tải đề thi. Vui lòng thử lại.'))
      .finally(() => setLoading(false))

    // Khôi phục attempt từ localStorage nếu có (trường hợp reload)
    const saved = localStorage.getItem('exam_attempt')
    if (saved) {
      try {
        const { attemptId: aId, examId: eId, startedAt, durationMinutes } = JSON.parse(saved)
        if (String(eId) === String(examId) && aId) {
          const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
          const total = durationMinutes * 60
          const remaining = total - elapsed
          if (remaining > 0) {
            setAttemptId(aId)
            setTimeLeft(remaining)
            setShowModal(false)
          } else {
            localStorage.removeItem('exam_attempt')
          }
        }
      } catch (_) {
        localStorage.removeItem('exam_attempt')
      }
    }

    return () => clearInterval(timerRef.current)
  }, [examId])

  // Đồng hồ countdown
  useEffect(() => {
    if (!attemptId || timeLeft <= 0) return

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true
            handleSubmit(true)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [attemptId])

  const handleStartExam = async () => {
    setStarting(true)
    try {
      const data = await createAttempt(parseInt(examId))
      setAttemptId(data.attempt_id)
      setQuestions(data.questions ?? [])
      setTimeLeft(data.duration_minutes * 60)
      setShowModal(false)

      // Lưu vào localStorage để phục hồi khi reload
      localStorage.setItem('exam_attempt', JSON.stringify({
        attemptId: data.attempt_id,
        examId,
        startedAt: data.started_at,
        durationMinutes: data.duration_minutes,
      }))
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể bắt đầu làm bài.')
    } finally {
      setStarting(false)
    }
  }

  const doSubmit = useCallback(async () => {
    if (submitting) return

    setSubmitting(true)
    clearInterval(timerRef.current)
    localStorage.removeItem('exam_attempt')

    try {
      const answersList = questions.map(q => ({
        question_id: q.id,
        answer_data: answers[q.id] ?? {},
      }))
      const result = await submitAttempt(attemptId, answersList)
      navigate(`/exam-result/${attemptId}`, { state: { result } })
    } catch (err) {
      alert(err.response?.data?.error || 'Lỗi khi nộp bài.')
      setSubmitting(false)
    }
  }, [submitting, questions, answers, attemptId, navigate])

  const handleSubmit = useCallback(async (isAuto = false) => {
    if (submitting) return
    if (!isAuto) {
      // Hiện modal xác nhận thay vì window.confirm
      setShowSubmitConfirm(true)
      return
    }
    // Auto-submit khi hết giờ — tiến hành luôn không hỏi
    await doSubmit()
  }, [submitting, doSubmit])

  // Lưu đáp án vào state (KHÔNG gọi API — chỉ gọi khi nộp bài)
  const handleAnswer = (questionId, answer_data) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer_data }))
  }

  // Màu ô câu hỏi trong grid
  const getGridColor = (q) => {
    if (answers[q.id] === undefined) return 'bg-white border-gray-200 text-gray-500'
    const type = q.question_type
    if (type === 'true_false') {
      const ans = answers[q.id]?.answers ?? {}
      const totalStmts = q.statements?.length ?? 4
      const filled = Object.keys(ans).length
      if (filled === 0) return 'bg-white border-gray-200 text-gray-500'
      if (filled < totalStmts) return 'bg-yellow-100 border-yellow-300 text-yellow-700'
    }
    return 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
  }

  const isTimeCritical = timeLeft > 0 && timeLeft <= 300 // < 5 phút

  // ─── Loading / Error states ────────────────────────────────
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
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-sm border border-gray-100">
          <p className="text-red-500 mb-4">{error}</p>
          <button onClick={() => navigate('/exams')} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-lg font-semibold text-sm">
            Về danh sách đề
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col">
      {/* Modal xác nhận */}
      {showModal && exam && (
        <StartModal
          exam={exam}
          onStart={handleStartExam}
          onCancel={() => navigate('/exams')}
          loading={starting}
        />
      )}

      {/* Header thanh trên */}
      {!showModal && (
        <>
          <header className="bg-[#1e3a5f] text-white px-6 py-3 flex items-center justify-between flex-shrink-0 shadow-md">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold">MP</span>
              </div>
              <span className="font-semibold truncate text-sm">{exam?.title}</span>
            </div>

            <div className="flex items-center gap-4">
              {/* Đồng hồ */}
              <div className={`flex items-center gap-2 font-mono font-bold text-lg px-4 py-1.5 rounded-lg ${isTimeCritical ? 'bg-red-500 animate-pulse' : 'bg-white/15'}`}>
                <Clock size={16} />
                {formatTime(timeLeft)}
              </div>

              <button
                onClick={() => handleSubmit(false)}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-[#f5a623] text-white rounded-lg font-semibold text-sm hover:bg-[#e09410] transition-colors disabled:opacity-60"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Nộp bài
              </button>
            </div>
          </header>

          {/* Body 2 cột */}
          <div className="flex flex-1 overflow-hidden">
            {/* Cột trái — sidebar */}
            <div className="w-64 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Bảng câu hỏi
              </p>
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentViewIdx(idx)}
                    className={`w-full aspect-square rounded-lg border-2 text-xs font-bold transition-all ${getGridColor(q)} ${currentViewIdx === idx ? 'ring-2 ring-[#f5a623] ring-offset-1' : ''}`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#1e3a5f]" /> Đã làm
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-100 border border-yellow-300" /> Làm 1 phần (Đ/S)
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-white border border-gray-200" /> Chưa làm
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                Đã làm: <strong className="text-[#1e3a5f]">{Object.keys(answers).length}</strong>/{questions.length}
              </div>
            </div>

            {/* Cột phải — câu hỏi */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-3xl mx-auto space-y-5">
                {questions.map((q, idx) => (
                  <div key={q.id} id={`q-${idx}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-600">Câu {idx + 1}</span>
                    </div>
                    {/* Trong ExamRoom, QuestionCard ở chế độ chỉ chọn đáp án, không submit từng câu */}
                    <ExamQuestionCard
                      question={q}
                      answer={answers[q.id]}
                      onAnswer={(ans) => handleAnswer(q.id, ans)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Modal xác nhận nộp bài ── */}
      <ConfirmModal
        open={showSubmitConfirm}
        title="Nộp bài thi"
        message={(() => {
          const unanswered = questions.filter(q => answers[q.id] === undefined).length
          if (unanswered > 0)
            return `Bạn còn ${unanswered} câu chưa trả lời. Sau khi nộp bài sẽ không thể sửa. Bạn có chắc chắn muốn nộp không?`
          return 'Bạn đã trả lời tất cả câu hỏi. Xác nhận nộp bài?'
        })()}
        confirmLabel={submitting ? 'Đang nộp...' : 'Nộp bài'}
        cancelLabel="Làm tiếp"
        confirmVariant="warning"
        icon={<Send size={28} />}
        onConfirm={() => { setShowSubmitConfirm(false); doSubmit() }}
        onCancel={() => setShowSubmitConfirm(false)}
      />
    </div>
  )
}

// ─── Card câu hỏi trong Exam (không submit API, chỉ lưu state) ──
function ExamQuestionCard({ question, answer, onAnswer }) {
  if (!question) return null
  const type = question.question_type

  // ── MCQ ──────────────────────────────────────────────────────
  if (type === 'mcq') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        {/* Nội dung đề */}
        <div className="text-gray-900 font-medium text-sm leading-relaxed mb-4">
          <MathRenderer content={question.content_json} />
        </div>
        {/* Ảnh câu hỏi */}
        {question.image_url && (
          <img
            src={`http://localhost:8000${question.image_url}`}
            alt="question"
            className="max-h-52 rounded-xl border border-gray-100 object-contain mb-4"
          />
        )}
        {/* Options */}
        {(question.options ?? []).map(opt => (
          <div
            key={opt.option_key}
            onClick={() => onAnswer({ selected: opt.option_key })}
            className={`flex items-center gap-3 p-3 mb-2 rounded-xl border-2 cursor-pointer transition-all text-sm
              ${answer?.selected === opt.option_key
                ? 'border-[#1e3a5f] bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'}`}
          >
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border-2
              ${answer?.selected === opt.option_key
                ? 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
                : 'border-gray-300 text-gray-500'}`}>
              {opt.option_key}
            </span>
            <span className="text-gray-800 flex-1">
              <MathRenderer content={opt.content_json} />
            </span>
          </div>
        ))}
      </div>
    )
  }

  // ── True / False ─────────────────────────────────────────────
  if (type === 'true_false') {
    const tfAns = answer?.answers ?? {}
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-3">
        {/* Nội dung đề */}
        <div className="text-gray-900 font-medium text-sm leading-relaxed mb-2">
          <MathRenderer content={question.content_json} />
        </div>
        {question.image_url && (
          <img
            src={`http://localhost:8000${question.image_url}`}
            alt="question"
            className="max-h-52 rounded-xl border border-gray-100 object-contain mb-2"
          />
        )}
        {(question.statements ?? []).map(st => (
          <div key={st.statement_key} className="border border-gray-100 rounded-xl p-3">
            <div className="flex items-start gap-2 mb-2">
              <span className="w-5 h-5 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {st.statement_key.toUpperCase()}
              </span>
              <span className="text-sm text-gray-700 flex-1">
                <MathRenderer content={st.content_json} />
              </span>
            </div>
            <div className="flex gap-2 ml-7">
              {[{ v: true, l: 'Đúng' }, { v: false, l: 'Sai' }].map(({ v, l }) => (
                <button
                  key={String(v)}
                  onClick={() => onAnswer({ answers: { ...tfAns, [st.statement_key]: v } })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                    ${tfAns[st.statement_key] === v
                      ? v
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-red-400 bg-red-50 text-red-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ── Short Answer ─────────────────────────────────────────────
  if (type === 'short_answer') {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="text-gray-900 font-medium text-sm leading-relaxed mb-4">
          <MathRenderer content={question.content_json} />
        </div>
        {question.image_url && (
          <img
            src={`http://localhost:8000${question.image_url}`}
            alt="question"
            className="max-h-52 rounded-xl border border-gray-100 object-contain mb-4"
          />
        )}
        <input
          type="number"
          step="0.01"
          placeholder="Nhập đáp án..."
          value={answer?.value ?? ''}
          onChange={(e) => onAnswer({ value: parseFloat(e.target.value) || e.target.value })}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-[#1e3a5f] outline-none transition-colors"
        />
      </div>
    )
  }

  return null
}

export default ExamRoom
