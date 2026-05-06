import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Play, Loader2, ChevronRight, BarChart2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import TopicTreeNode from '../components/TopicTreeNode'
import { getTopicsTree, getTopicDetail } from '../api/topics'
import { getQuestions } from '../api/questions'
import { getPracticeHistory, createSession } from '../api/practice'

function Topics() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  // Cây chuyên đề
  const [tree, setTree] = useState([])
  const [treeLoading, setTreeLoading] = useState(true)

  // Chuyên đề được chọn
  const [selectedTopic, setSelectedTopic] = useState(null)

  // Dữ liệu panel phải
  const [history, setHistory] = useState(null)
  const [questions, setQuestions] = useState([])
  const [panelLoading, setPanelLoading] = useState(false)
  const [starting, setStarting] = useState(false)

  // Load cây chuyên đề khi mount
  useEffect(() => {
    getTopicsTree()
      .then(data => setTree(Array.isArray(data) ? data : []))
      .catch(err => console.error('[Topics] tree error:', err))
      .finally(() => setTreeLoading(false))
  }, [])

  // Load lịch sử & câu hỏi khi chọn topic
  useEffect(() => {
    if (!selectedTopic) return

    setPanelLoading(true)
    setHistory(null)
    setQuestions([])

    const promises = [
      getQuestions({ topic_id: selectedTopic.id, page: 1 }).catch(() => ({ results: [] })),
    ]

    // History chỉ load khi đã đăng nhập
    if (isAuthenticated) {
      promises.push(getPracticeHistory(selectedTopic.id).catch(() => null))
    }

    Promise.all(promises).then(([qData, hist]) => {
      const qList = Array.isArray(qData) ? qData : (qData?.results ?? [])
      setQuestions(qList)
      if (hist) setHistory(hist)
    }).finally(() => setPanelLoading(false))
  }, [selectedTopic, isAuthenticated])

  const handleStartPractice = async () => {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }
    if (!selectedTopic) return

    setStarting(true)
    try {
      const data = await createSession(selectedTopic.id)
      // Truyền questions qua state để PracticeRoom không cần gọi API lại
      navigate(`/practice/${data.session_id}`, { state: { questions: data.questions } })
    } catch (err) {
      alert(err.response?.data?.error || 'Không thể tạo phiên luyện tập. Vui lòng thử lại.')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#1e3a5f]">Chuyên đề luyện tập</h1>
          <p className="text-gray-500 mt-1">Chọn chuyên đề để bắt đầu luyện tập theo cấu trúc đề thi THPT.</p>
        </div>

        <div className="flex gap-6">
          {/* Cột trái — Cây chuyên đề */}
          <div className="w-1/3 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <BookOpen size={16} className="text-[#1e3a5f]" />
                <span className="font-semibold text-[#1e3a5f] text-sm">Danh mục chuyên đề</span>
              </div>
              <div className="p-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                {treeLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-gray-400" />
                  </div>
                ) : tree.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Chưa có chuyên đề nào.</p>
                ) : (
                  tree.map(node => (
                    <TopicTreeNode
                      key={node.id}
                      node={node}
                      onSelect={setSelectedTopic}
                      selectedId={selectedTopic?.id}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Cột phải — Chi tiết chuyên đề */}
          <div className="flex-1">
            {!selectedTopic ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-[#eef2f7] flex items-center justify-center mb-4">
                  <BookOpen size={28} className="text-[#1e3a5f]" />
                </div>
                <h3 className="font-semibold text-gray-700 mb-2">Chọn một chuyên đề</h3>
                <p className="text-gray-400 text-sm max-w-xs">
                  Nhấp vào một chuyên đề ở cột bên trái để xem thông tin chi tiết và bắt đầu luyện tập.
                </p>
              </div>
            ) : panelLoading ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex justify-center py-20">
                <Loader2 size={32} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-5">
                {/* Card thông tin chuyên đề */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                        <span>Luyện tập</span>
                        <ChevronRight size={12} />
                        <span className="text-[#1e3a5f] font-medium">{selectedTopic.name}</span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-[#1e3a5f] mb-2">{selectedTopic.name}</h2>
                      {selectedTopic.description && (
                        <p className="text-gray-500 text-sm leading-relaxed">{selectedTopic.description}</p>
                      )}
                    </div>
                    <button
                      onClick={handleStartPractice}
                      disabled={starting}
                      className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 bg-[#f5a623] text-white rounded-xl font-semibold text-sm hover:bg-[#e09410] transition-colors shadow-sm disabled:opacity-60"
                    >
                      {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                      Bắt đầu luyện tập
                    </button>
                  </div>

                  {/* Progress bar */}
                  {isAuthenticated && history && (
                    <div className="mt-5 pt-5 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <BarChart2 size={15} className="text-[#1e3a5f]" />
                          <span>Tiến độ học tập</span>
                        </div>
                        <span className="text-sm font-bold text-[#1e3a5f]">{history.completion_percent}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1e3a5f] rounded-full transition-all duration-500"
                          style={{ width: `${history.completion_percent}%` }}
                        />
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-gray-500">
                        <span>Đã làm: <strong className="text-gray-700">{history.total_questions}</strong> câu</span>
                        <span>Đúng: <strong className="text-green-600">{history.correct_count}</strong> câu</span>
                        <span>Thành thạo (2+ lần đúng): <strong className="text-[#f5a623]">{history.questions_correct_2plus || 0}</strong> câu</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Danh sách câu hỏi mẫu */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-semibold text-[#1e3a5f] mb-4 flex items-center gap-2">
                    <BookOpen size={16} />
                    Câu hỏi trong chuyên đề ({questions.length} câu)
                  </h3>
                  {questions.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">Chưa có câu hỏi nào trong chuyên đề này.</p>
                  ) : (
                    <div className="space-y-2">
                      {questions.slice(0, 5).map((q, idx) => (
                        <div key={q.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 text-sm">
                          <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {idx + 1}
                          </span>
                          <span className="flex-1 text-gray-700 truncate">
                            {typeof q.content_json === 'string'
                              ? q.content_json
                              : (q.content_json?.blocks?.[0]?.content?.[0]?.value ?? 'Câu hỏi toán học')}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.question_type === 'mcq' ? 'bg-blue-50 text-blue-700' : q.question_type === 'true_false' ? 'bg-purple-50 text-purple-700' : 'bg-orange-50 text-orange-700'}`}>
                            {q.question_type === 'mcq' ? 'TN' : q.question_type === 'true_false' ? 'Đ/S' : 'TN'}
                          </span>
                        </div>
                      ))}
                      {questions.length > 5 && (
                        <p className="text-center text-sm text-gray-400 pt-2">... và {questions.length - 5} câu khác</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Topics
