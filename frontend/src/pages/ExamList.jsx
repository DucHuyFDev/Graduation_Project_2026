import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, BookOpen, Loader2, Play } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getExams } from '../api/exams'

const TABS = [
  { label: 'Tất cả', value: '' },
  { label: 'Theo chuyên đề', value: 'topic' },
  { label: 'Giữa kỳ', value: 'midterm' },
  { label: 'Cuối kỳ', value: 'final' },
  { label: 'Tốt nghiệp', value: 'graduation' },
]

const TYPE_LABELS = {
  topic: { label: 'Chuyên đề', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  midterm: { label: 'Giữa kỳ', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
  final: { label: 'Cuối kỳ', cls: 'bg-red-50 text-red-700 border-red-200' },
  graduation: { label: 'Tốt nghiệp', cls: 'bg-green-50 text-green-700 border-green-200' },
}

function ExamCard({ exam, onStart }) {
  const typeInfo = TYPE_LABELS[exam.exam_type] ?? { label: exam.exam_type, cls: 'bg-gray-100 text-gray-600' }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${typeInfo.cls}`}>
          {typeInfo.label}
        </span>
        <FileText size={18} className="text-gray-300 group-hover:text-[#f5a623] transition-colors flex-shrink-0" />
      </div>

      <h3 className="font-bold text-gray-800 leading-snug">{exam.title}</h3>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <BookOpen size={12} /> {/* số câu sẽ biết sau khi load detail */} Đề thi
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {exam.duration_minutes} phút
        </span>
        {exam.attempt_count !== undefined && (
          <span className="text-[#1e3a5f] font-medium">Đã làm: {exam.attempt_count}/3 lần</span>
        )}
      </div>

      <button
        onClick={() => onStart(exam)}
        disabled={exam.attempt_count >= 3}
        className={`mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors
          ${exam.attempt_count >= 3
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-[#f5a623] text-white hover:bg-[#e09410]'}`}
      >
        <Play size={15} />
        {exam.attempt_count >= 3 ? 'Hết lượt làm bài' : 'Làm bài'}
      </button>
    </div>
  )
}

function ExamList() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('')
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true) // true ngay từ đầu, không cần set trong effect
  const [total, setTotal] = useState(0)

  useEffect(() => {
    // Không gọi setState đồng bộ ở đây — dùng loading=true ban đầu,
    // reset về true trong callback cleanup hoặc khi tab thay đổi
    const params = { page: 1 }
    if (activeTab) params.exam_type = activeTab

    getExams(params)
      .then(data => {
        setExams(Array.isArray(data) ? data : (data?.results ?? []))
        setTotal(data?.total ?? 0)
        setLoading(false)
      })
      .catch(err => {
        console.error('[ExamList] error:', err)
        setLoading(false)
      })

    // Reset loading khi activeTab đổi (cleanup trước khi effect chạy lại)
    return () => setLoading(true)
  }, [activeTab])

  const handleStart = (exam) => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    navigate(`/exam-room/${exam.id}`)
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#1e3a5f]">Danh sách đề thi thử</h1>
          <p className="text-gray-500 mt-1">Làm bài và luyện tập với các đề thi bám sát cấu trúc Bộ GD&ĐT.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border
                ${activeTab === tab.value
                  ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f]/40'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Grid đề thi */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={36} className="animate-spin text-gray-400" />
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
            <FileText size={40} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400">Chưa có đề thi nào trong danh mục này.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {exams.map(exam => (
                <ExamCard key={exam.id} exam={exam} onStart={handleStart} />
              ))}
            </div>
            {total > 20 && (
              <div className="mt-6 flex justify-center">
                <p className="text-sm text-gray-500">Hiển thị {exams.length} / {total} đề thi</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default ExamList
