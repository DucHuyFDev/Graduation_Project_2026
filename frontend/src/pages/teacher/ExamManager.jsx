import { useState, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Plus, Search, Eye, Trash2, X, ChevronLeft, ChevronRight,
  FileText, Clock, BookOpen, AlertCircle, Check, Loader2
} from "lucide-react"
import MathRenderer from "../../components/MathRenderer"
import { getExams, createExam, deleteExam } from "../../api/exams"
import { getQuestions } from "../../api/questions"
import { getTopicsTree } from "../../api/topics"

function ExamManager() {
  const location = useLocation()
  const navigate = useNavigate()
  const [exams, setExams] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  // Form state
  const [form, setForm] = useState({ title: "", description: "", duration: "", exam_type: "topic" })
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)

  // Question picker
  const [questions, setQuestions] = useState([])
  const [qPage, setQPage] = useState(1)
  const [qTotal, setQTotal] = useState(0)
  const [qSearch, setQSearch] = useState("")
  const [qLoading, setQLoading] = useState(false)
  const [selectedQIds, setSelectedQIds] = useState([])
  const [topics, setTopics] = useState([])
  const [filterTopic, setFilterTopic] = useState("")

  useEffect(() => { loadExams() }, [page])
  useEffect(() => { if (showModal) { loadQuestions(); loadTopics() } }, [showModal, qPage, filterTopic])

  // Auto-open modal khi vào route /teacher/exams/add
  useEffect(() => {
    if (location.pathname.endsWith('/add')) {
      resetModal()
      setShowModal(true)
    }
  }, [location.pathname])

  const loadExams = async () => {
    setLoading(true)
    try {
      const res = await getExams({ page })
      setExams(res.results || [])
      setTotal(res.total || 0)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const loadQuestions = async () => {
    setQLoading(true)
    try {
      const params = { page: qPage }
      if (qSearch.trim()) params.q = qSearch.trim()
      if (filterTopic) params.topic_id = filterTopic
      const res = await getQuestions(params)
      setQuestions(res.results || [])
      setQTotal(res.total || 0)
    } catch (e) { console.error(e) }
    finally { setQLoading(false) }
  }

  const loadTopics = async () => {
    try {
      const tree = await getTopicsTree()
      const flat = []
      const flatten = (items, level = 0) => items.forEach(item => {
        flat.push({ id: item.id, name: item.name, level })
        if (item.children) flatten(item.children, level + 1)
      })
      flatten(tree)
      setTopics(flat)
    } catch (e) {}
  }

  const handleCreate = async () => {
    if (!form.title.trim()) { setFormError("Vui lòng nhập tiêu đề đề thi"); return }
    if (!form.duration || isNaN(form.duration) || parseInt(form.duration) < 1) {
      setFormError("Vui lòng nhập thời gian làm bài hợp lệ (phút)"); return
    }
    if (selectedQIds.length === 0) { setFormError("Vui lòng chọn ít nhất 1 câu hỏi"); return }
    setSaving(true); setFormError("")
    try {
      await createExam({ ...form, question_ids: selectedQIds })
      setShowModal(false)
      resetModal()
      // Nếu đang ở /add thì redirect về /exams
      if (location.pathname.endsWith('/add')) navigate('/teacher/exams')
      loadExams()
    } catch (err) {
      setFormError(err.response?.data?.error || "Không thể tạo đề thi")
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) return
    try {
      await deleteExam(showDeleteConfirm)
      setShowDeleteConfirm(null)
      loadExams()
    } catch (e) { alert("Không thể xóa đề thi") }
  }

  const closeModal = () => {
    setShowModal(false)
    resetModal()
    // Nếu đang ở /add thì navigate về /exams khi đóng modal
    if (location.pathname.endsWith('/add')) navigate('/teacher/exams')
  }

  const resetModal = () => {
    setForm({ title: "", description: "", duration: "", exam_type: "topic" })
    setSelectedQIds([]); setQSearch(""); setQPage(1); setFilterTopic("")
    setFormError("")
  }

  const toggleSelectQ = (id) =>
    setSelectedQIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const totalPages = Math.ceil(total / 20) || 1
  const qTotalPages = Math.ceil(qTotal / 20) || 1

  // Map exam_type sang label và màu
  const EXAM_TYPE_MAP = {
    topic:      { label: 'Test chuyên đề',    cls: 'bg-blue-100 text-blue-700' },
    midterm:    { label: 'Giữa kỳ',          cls: 'bg-purple-100 text-purple-700' },
    final:      { label: 'Cuối kỳ',           cls: 'bg-orange-100 text-orange-700' },
    graduation: { label: 'Thi thử TNTHPT',   cls: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#1e3a5f]">Quản lý đề thi</h1>
        <button
          onClick={() => { resetModal(); setShowModal(true) }}
          className="bg-[#f5a623] hover:bg-[#e09410] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95"
        >
          <Plus size={20}/> Tạo đề thi mới
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Tiêu đề</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Thời gian</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Câu hỏi</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Loại đề</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="p-20 text-center text-gray-400">Đang tải...</td></tr>
            ) : exams.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center text-gray-400">Chưa có đề thi nào.</td></tr>
            ) : exams.map(exam => (
              <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-bold text-gray-800 text-sm">{exam.title}</p>
                  {exam.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{exam.description}</p>}
                </td>
                <td className="px-6 py-4 text-center text-sm text-gray-600">
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={14} className="text-gray-400"/> {exam.duration_minutes || exam.duration} phút
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-bold text-[#1e3a5f]">{exam.question_count || 0}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  {(() => {
                    const t = EXAM_TYPE_MAP[exam.exam_type] || { label: exam.exam_type, cls: 'bg-gray-100 text-gray-500' }
                    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.cls}`}>{t.label}</span>
                  })()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => navigate(`/teacher/exams/${exam.id}/questions`)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xem câu hỏi">
                      <Eye size={18}/>
                    </button>
                    <button onClick={() => setShowDeleteConfirm(exam.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400">Tổng: <span className="text-gray-700">{total}</span> đề thi</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-white transition-all">
              <ChevronLeft size={18}/>
            </button>
            <div className="flex items-center px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#1e3a5f]">
              {page} / {totalPages}
            </div>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-white transition-all">
              <ChevronRight size={18}/>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Tạo Đề Thi */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a5f]/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-black text-[#1e3a5f] text-lg flex items-center gap-2">
                <FileText size={20} className="text-[#f5a623]"/> Tạo đề thi mới
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-400"/>
              </button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left — Form info */}
              <div className="w-80 border-r border-gray-100 p-6 flex-shrink-0 overflow-y-auto space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Loại đề thi *</label>
                  <select value={form.exam_type} onChange={e => setForm(f => ({ ...f, exam_type: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623] bg-white">
                    <option value="topic">Test chuyên đề</option>
                    <option value="midterm">Kiểm tra giữa kỳ</option>
                    <option value="final">Kiểm tra cuối kỳ</option>
                    <option value="graduation">Thi thử TNTHPT</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tiêu đề *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Đề thi Toán HK1..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mô tả</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3} placeholder="Đề thi gồm..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623] resize-none"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Thời gian làm bài (phút) *</label>
                  <input
                    type="number" min={1} max={300}
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                    placeholder="Nhập số phút..."
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623] ${
                      form.duration === '' ? 'border-orange-300 bg-orange-50' : 'border-gray-200'
                    }`}
                  />
                  {/* Preset nhanh */}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {[45, 60, 90, 120, 150, 180].map(m => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, duration: m }))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          parseInt(form.duration) === m
                            ? 'bg-[#f5a623] text-white border-[#f5a623]'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-[#f5a623] hover:text-[#f5a623]'
                        }`}
                      >
                        {m}p
                      </button>
                    ))}
                  </div>
                </div>
                {/* Đã chọn */}
                <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                  <p className="text-sm font-bold text-[#1e3a5f]">Đã chọn: <span className="text-[#f5a623]">{selectedQIds.length}</span> câu hỏi</p>
                </div>

                {formError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                    <AlertCircle size={16}/> {formError}
                  </div>
                )}

                <button onClick={handleCreate} disabled={saving}
                  className="w-full py-3 bg-[#f5a623] text-white rounded-xl font-bold hover:bg-[#e09410] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={16} className="animate-spin"/> Đang tạo...</> : "Tạo đề thi"}
                </button>
              </div>

              {/* Right — Question picker */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex gap-3 flex-shrink-0">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    <input value={qSearch} onChange={e => setQSearch(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { setQPage(1); loadQuestions() } }}
                      placeholder="Tìm câu hỏi..."
                      className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]"/>
                  </div>
                  <select value={filterTopic} onChange={e => { setFilterTopic(e.target.value); setQPage(1) }}
                    className="bg-gray-100 rounded-xl text-sm px-3 py-2 focus:outline-none">
                    <option value="">Tất cả chuyên đề</option>
                    {topics.map(t => (
                      <option key={t.id} value={t.id}>{"  ".repeat(t.level)}{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {qLoading ? (
                    <div className="text-center py-10 text-gray-400">Đang tải câu hỏi...</div>
                  ) : questions.map(q => {
                    const isSelected = selectedQIds.includes(q.id)
                    return (
                      <div key={q.id}
                        onClick={() => toggleSelectQ(q.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-[#f5a623] bg-orange-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${isSelected ? 'bg-[#f5a623] border-[#f5a623]' : 'border-gray-300'}`}>
                            {isSelected && <Check size={12} className="text-white"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] text-gray-400 font-mono">#{q.id}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${q.question_type === 'mcq' ? 'bg-blue-100 text-blue-700' : q.question_type === 'true_false' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                                {q.question_type === 'mcq' ? 'MCQ' : q.question_type === 'true_false' ? 'Đ/S' : 'Ngắn'}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="text-sm text-gray-700 line-clamp-2 flex-1">
                                <MathRenderer content={q.content_json}/>
                              </div>
                              {q.image_url && (
                                <img src={`http://localhost:8000${q.image_url}`}
                                  className="w-14 h-14 object-cover rounded-lg border border-gray-100 flex-shrink-0"/>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Question pagination */}
                <div className="p-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                  <span className="text-xs text-gray-400">Tổng {qTotal} câu</span>
                  <div className="flex gap-2">
                    <button disabled={qPage === 1} onClick={() => setQPage(p => p - 1)}
                      className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-all">
                      <ChevronLeft size={16}/>
                    </button>
                    <span className="text-xs font-bold text-gray-600 px-2 flex items-center">{qPage}/{qTotalPages}</span>
                    <button disabled={qPage >= qTotalPages} onClick={() => setQPage(p => p + 1)}
                      className="p-1.5 rounded-lg border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-all">
                      <ChevronRight size={16}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32}/>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Xóa đề thi?</h3>
            <p className="text-gray-500 text-sm mb-8">Đề thi sẽ bị xóa mềm. Bạn có chắc không?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-2xl">Hủy</button>
              <button onClick={handleDelete}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-200">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExamManager
