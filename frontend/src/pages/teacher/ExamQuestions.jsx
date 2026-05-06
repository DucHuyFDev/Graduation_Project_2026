import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ChevronLeft, Pencil, Clock, BookOpen, FileText,
  AlertTriangle, Loader2
} from "lucide-react"
import MathRenderer from "../../components/MathRenderer"
import { getExamDetail } from "../../api/exams"

// Map loại đề thi
const EXAM_TYPE_MAP = {
  topic:      { label: 'Test chuyên đề',  cls: 'bg-blue-100 text-blue-700' },
  midterm:    { label: 'Giữa kỳ',         cls: 'bg-purple-100 text-purple-700' },
  final:      { label: 'Cuối kỳ',          cls: 'bg-orange-100 text-orange-700' },
  graduation: { label: 'Thi thử TNTHPT',  cls: 'bg-red-100 text-red-700' },
}

// Map loại câu hỏi
const Q_TYPE_MAP = {
  mcq:          { label: 'Trắc nghiệm',   cls: 'bg-blue-100 text-blue-700' },
  true_false:   { label: 'Đúng / Sai',    cls: 'bg-purple-100 text-purple-700' },
  short_answer: { label: 'Trả lời ngắn',  cls: 'bg-orange-100 text-orange-700' },
}

function getDiffLabel(d) {
  if (d == null) return null
  if (d <= 0.35) return { label: 'Dễ',   cls: 'bg-green-100 text-green-700' }
  if (d <= 0.65) return { label: 'TB',   cls: 'bg-yellow-100 text-yellow-700' }
  return              { label: 'Khó',  cls: 'bg-red-100 text-red-700' }
}

// Card 1 câu hỏi
function QuestionCard({ q, order, onEdit }) {
  const qType = Q_TYPE_MAP[q.question_type] || { label: q.question_type, cls: 'bg-gray-100 text-gray-500' }
  const diff  = getDiffLabel(q.difficulty)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-3 bg-gray-50/60 border-b border-gray-100">
        <span className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-sm font-black flex items-center justify-center flex-shrink-0">
          {order}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded ${qType.cls}`}>
          {qType.label}
        </span>
        {diff && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff.cls}`}>
            {diff.label}
          </span>
        )}
        {q.topic_name && (
          <span className="text-xs text-gray-400 truncate ml-1">{q.topic_name}</span>
        )}
        {/* Nút Sửa */}
        <button
          onClick={() => onEdit(q.id)}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e3a5f] hover:bg-[#162a45] text-white text-xs font-bold transition-all active:scale-95"
        >
          <Pencil size={13}/> Sửa
        </button>
      </div>

      {/* Nội dung câu hỏi */}
      <div className="px-5 py-4 space-y-3">
        <div className="text-gray-800 font-medium text-sm leading-relaxed">
          <MathRenderer content={q.content_json}/>
        </div>

        {/* Ảnh nếu có */}
        {q.image_url && (
          <img
            src={`http://localhost:8000${q.image_url}`}
            alt="question"
            className="max-h-40 rounded-xl border border-gray-100 object-contain"
          />
        )}

        {/* MCQ options */}
        {q.question_type === 'mcq' && Array.isArray(q.options) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {q.options.map((opt) => (
              <div key={opt.option_key}
                className={`flex items-start gap-2 p-2.5 rounded-xl text-sm border ${
                  opt.is_correct
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-gray-50 border-gray-100 text-gray-700'
                }`}
              >
                <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  opt.is_correct ? 'bg-green-500 text-white' : 'bg-[#1e3a5f] text-white'
                }`}>
                  {opt.option_key}
                </span>
                <div className="flex-1">
                  <MathRenderer content={opt.content_json}/>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* True/False statements */}
        {q.question_type === 'true_false' && Array.isArray(q.statements) && (
          <div className="space-y-2">
            {q.statements.map((st) => (
              <div key={st.statement_key}
                className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-50 text-sm border border-gray-100"
              >
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  {st.statement_key}
                </span>
                <div className="flex-1">
                  <MathRenderer content={st.content_json}/>
                </div>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                  st.is_true ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {st.is_true ? 'Đúng' : 'Sai'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Short answer */}
        {q.question_type === 'short_answer' && q.correct_answer != null && (
          <p className="text-xs text-gray-500">
            Đáp án: <span className="font-bold text-[#1e3a5f]">{q.correct_answer}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
function ExamQuestions() {
  const { examId } = useParams()
  const navigate = useNavigate()

  const [exam, setExam] = useState(null)
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadExam()
  }, [examId])

  const loadExam = async () => {
    setLoading(true); setError("")
    try {
      const data = await getExamDetail(examId)
      setExam(data)
      setQuestions(data.questions || [])
    } catch (err) {
      setError(err.response?.data?.error || "Không thể tải đề thi")
    } finally { setLoading(false) }
  }

  const handleEdit = (questionId) => {
    navigate(`/teacher/questions/${questionId}/edit`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-[#f5a623]"/>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-3 text-red-500">
        <AlertTriangle size={40}/>
        <p className="font-bold">{error}</p>
      </div>
    )
  }

  const examType = EXAM_TYPE_MAP[exam?.exam_type] || { label: exam?.exam_type, cls: 'bg-gray-100 text-gray-600' }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate("/teacher/exams")}
          className="p-2 hover:bg-gray-200 rounded-full transition-colors mt-1"
        >
          <ChevronLeft size={22} className="text-[#1e3a5f]"/>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-black text-[#1e3a5f]">{exam?.title}</h1>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${examType.cls}`}>
              {examType.label}
            </span>
          </div>
          <div className="flex items-center gap-5 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">
              <Clock size={14}/> {exam?.duration_minutes} phút
            </span>
            <span className="flex items-center gap-1.5">
              <BookOpen size={14}/> {questions.length} câu hỏi
            </span>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {questions.length === 0 && (
        <div className="bg-white rounded-3xl p-16 text-center border border-gray-100">
          <FileText size={48} className="mx-auto text-gray-300 mb-4"/>
          <p className="font-bold text-gray-400">Đề thi chưa có câu hỏi nào</p>
          <p className="text-sm text-gray-300 mt-1">Thêm câu hỏi bằng cách xóa và tạo lại đề thi</p>
        </div>
      )}

      {/* Danh sách câu hỏi */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <QuestionCard
            key={q.id}
            q={q}
            order={idx + 1}
            onEdit={handleEdit}
          />
        ))}
      </div>
    </div>
  )
}

export default ExamQuestions
