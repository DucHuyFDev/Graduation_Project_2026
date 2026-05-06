import { useState, useRef } from "react"
import { useNavigate } from "react-router-dom"
import {
  Upload, FileText, Loader2, ChevronRight, ChevronLeft,
  Check, AlertTriangle, CheckCircle, Camera, X, ChevronDown, ChevronUp,
  BookOpen
} from "lucide-react"
import { InlineMath } from "react-katex"
import { getTopicsTree } from "../../api/topics"
import { createQuestion } from "../../api/questions"
import { parsePDF } from "../../api/aiTutor"

// Render nội dung content array (text/math) hoặc question.blocks
function renderContent(content) {
  if (content && typeof content === 'object' && !Array.isArray(content) && content.blocks) {
    return content.blocks.map((block, bi) => (
      <span key={bi}>
        {(block.content || []).map((item, ii) => (
          <span key={ii}>
            {item.type === 'math'
              ? <InlineMath math={item.value || ""} />
              : <span>{item.value || ""}</span>}
          </span>
        ))}
      </span>
    ))
  }
  if (Array.isArray(content)) {
    return content.map((item, ii) => (
      <span key={ii}>
        {item.type === 'math'
          ? <InlineMath math={item.value || ""} />
          : <span>{item.value || ""}</span>}
      </span>
    ))
  }
  return null
}

function getTypeLabel(type) {
  return { mcq: "Trắc nghiệm", true_false_group: "Đúng/Sai", true_false: "Đúng/Sai", short_answer: "Trả lời ngắn" }[type] || type
}

function getTypeColor(type) {
  if (type === 'mcq') return 'bg-blue-100 text-blue-700'
  if (type === 'true_false_group' || type === 'true_false') return 'bg-purple-100 text-purple-700'
  return 'bg-orange-100 text-orange-700'
}

function getDiffLabel(d) {
  if (d == null) return null
  if (d <= 0.35) return { label: 'Dễ', cls: 'bg-green-100 text-green-700' }
  if (d <= 0.65) return { label: 'TB', cls: 'bg-yellow-100 text-yellow-700' }
  return { label: 'Khó', cls: 'bg-red-100 text-red-700' }
}

// Card hiển thị 1 câu hỏi — có topic selector riêng
function QuestionReviewCard({ q, idx, selected, onToggle, imageFile, onImageUpload, flatTopics, topicId, onTopicChange }) {
  const [open, setOpen] = useState(true)
  const imgRef = useRef(null)
  const diff = getDiffLabel(q.difficulty)
  const previewUrl = imageFile ? URL.createObjectURL(imageFile) : (q.image?.url || null)

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden transition-all ${selected ? 'border-[#f5a623] shadow-md' : 'border-gray-100 opacity-60'}`}>
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        <input
          type="checkbox"
          checked={!!selected}
          onChange={onToggle}
          className="w-5 h-5 rounded border-gray-300 accent-[#f5a623]"
        />
        <span className="w-8 h-8 rounded-full bg-[#1e3a5f] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
          {idx + 1}
        </span>
        <span className={`px-2 py-0.5 text-xs font-bold rounded ${getTypeColor(q.type)}`}>
          {getTypeLabel(q.type)}
        </span>
        {diff
          ? <span className={`text-xs font-bold px-2 py-0.5 rounded ${diff.cls}`}>{diff.label}</span>
          : <span className="flex items-center gap-1 text-xs text-red-500"><AlertTriangle size={12}/> Chưa có độ khó</span>
        }
        <button onClick={() => setOpen(o => !o)} className="ml-auto text-gray-400">
          {open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 pt-0 space-y-4">
          {/* Nội dung câu hỏi */}
          <div className="text-gray-800 font-medium text-sm leading-relaxed">
            {renderContent(q.question || q.content)}
          </div>

          {/* Chọn chuyên đề luyện tập cho câu hỏi này */}
          <div className={`rounded-xl p-3 border ${selected && !topicId ? 'border-orange-300 bg-orange-50' : 'border-gray-100 bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={14} className="text-[#1e3a5f]"/>
              <p className="text-xs font-bold text-[#1e3a5f]">Chuyên đề luyện tập</p>
              {selected && !topicId && <span className="text-[10px] text-orange-500 font-bold">* Bắt buộc chọn</span>}
            </div>
            <select
              value={topicId || ""}
              onChange={e => onTopicChange(e.target.value ? parseInt(e.target.value) : null)}
              disabled={!selected}
              className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#f5a623] disabled:opacity-40"
            >
              <option value="">-- Chọn chuyên đề --</option>
              {flatTopics.map(t => (
                <option key={t.id} value={t.id}>
                  {"　".repeat(t.level)}{t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Ảnh đính kèm */}
          <div className="border border-dashed border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-2 font-medium">Ảnh đính kèm (tùy chọn)</p>
            {previewUrl ? (
              <div className="relative inline-block">
                <img src={previewUrl} alt="preview" className="max-h-32 rounded-lg border border-gray-100 object-contain"/>
                <button
                  onClick={() => onImageUpload(null)}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X size={10}/>
                </button>
              </div>
            ) : (
              <div
                onClick={() => imgRef.current?.click()}
                className="border border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-[#f5a623] hover:bg-orange-50 transition-all"
              >
                <Camera size={20} className="mx-auto text-gray-300 mb-1"/>
                <p className="text-xs text-gray-400">Click để upload ảnh</p>
                <input ref={imgRef} type="file" accept="image/*" className="hidden"
                  onChange={e => onImageUpload(e.target.files[0] || null)}/>
              </div>
            )}
          </div>

          {/* MCQ options */}
          {q.type === 'mcq' && Array.isArray(q.options) && (
            <div className="grid grid-cols-1 gap-2">
              {q.options.map((opt, oi) => (
                <div key={oi} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 text-sm">
                  <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {opt.key || String.fromCharCode(65 + oi)}
                  </span>
                  <span className="text-gray-700">{renderContent(opt.content)}</span>
                </div>
              ))}
            </div>
          )}

          {/* True/False statements */}
          {(q.type === 'true_false_group' || q.type === 'true_false') && Array.isArray(q.statements) && (
            <div className="space-y-2">
              {q.statements.map((st, si) => (
                <div key={si} className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 text-sm">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                    {st.key || String.fromCharCode(97 + si)}
                  </span>
                  <span className="text-gray-700 flex-1">{renderContent(st.content)}</span>
                  {st.is_true != null && (
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${st.is_true ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {st.is_true ? 'Đ' : 'S'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Short answer */}
          {q.type === 'short_answer' && q.correct_answer != null && (
            <p className="text-xs text-gray-500">Đáp án: <span className="font-bold text-[#1e3a5f]">{q.correct_answer}</span></p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
function UploadPDF() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [step, setStep] = useState(1)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  const [questions, setQuestions] = useState([])
  const [selectedQuestions, setSelectedQuestions] = useState({})
  const [images, setImages] = useState({})       // { idx: File }
  const [topicIds, setTopicIds] = useState({})   // { idx: topicId } — mỗi câu 1 topic

  const [topics, setTopics] = useState([])
  const [savingProgress, setSavingProgress] = useState({ current: 0, total: 0, done: false })

  // Flatten tree để dùng trong select
  const flatTopics = []
  const flatten = (items, level = 0) => {
    items.forEach(item => {
      flatTopics.push({ id: item.id, name: item.name, level })
      if (item.children) flatten(item.children, level + 1)
    })
  }
  flatten(topics)

  const handleDragOver = e => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = e => { e.preventDefault(); setIsDragging(false) }
  const handleDrop = e => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.name.toLowerCase().endsWith('.pdf')) { setFile(f); setError("") }
    else setError("Vui lòng chọn file PDF")
  }
  const handleFileSelect = e => {
    const f = e.target.files[0]
    if (f?.name.toLowerCase().endsWith('.pdf')) { setFile(f); setError("") }
  }

  const handleUpload = async () => {
    if (!file) { setError("Vui lòng chọn file PDF"); return }
    setLoading(true); setError("")
    try {
      const result = await parsePDF(file)
      const qs = result.questions || []
      setQuestions(qs)
      const sel = {}
      qs.forEach((_, i) => { sel[i] = true })
      setSelectedQuestions(sel)
      setTopicIds({})
      const topicsData = await getTopicsTree()
      setTopics(topicsData)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.error || "Không thể phân tích PDF. Vui lòng thử lại.")
    } finally { setLoading(false) }
  }

  const toggleQuestion = idx =>
    setSelectedQuestions(prev => ({ ...prev, [idx]: !prev[idx] }))

  const toggleAll = () => {
    const allSelected = Object.values(selectedQuestions).every(Boolean)
    const newSel = {}
    questions.forEach((_, i) => { newSel[i] = !allSelected })
    setSelectedQuestions(newSel)
  }

  const handleImageUpload = (idx, fileOrNull) => {
    setImages(prev => {
      const next = { ...prev }
      if (fileOrNull) next[idx] = fileOrNull
      else delete next[idx]
      return next
    })
  }

  const handleTopicChange = (idx, topicId) => {
    setTopicIds(prev => ({ ...prev, [idx]: topicId }))
  }

  const handleSave = async () => {
    const selectedIndices = Object.keys(selectedQuestions).filter(i => selectedQuestions[i])
    if (selectedIndices.length === 0) { setError("Vui lòng chọn ít nhất một câu hỏi"); return }

    // Kiểm tra câu nào được chọn mà chưa có topic
    const missing = selectedIndices.filter(i => !topicIds[i])
    if (missing.length > 0) {
      setError(`${missing.length} câu hỏi được chọn chưa có chuyên đề. Vui lòng chọn chuyên đề cho từng câu.`)
      return
    }

    setError("")
    setSavingProgress({ current: 0, total: selectedIndices.length, done: false })
    let saved = 0

    for (let i = 0; i < selectedIndices.length; i++) {
      const idx = selectedIndices[i]
      const q = questions[idx]
      try {
        const fd = new FormData()
        const backendType = q.type === 'true_false_group' ? 'true_false' : (q.type || 'mcq')
        fd.append("question_type", backendType)
        fd.append("difficulty", q.difficulty != null ? parseFloat(q.difficulty).toFixed(2) : "0.50")
        fd.append("topic_id", topicIds[idx])

        const questionContent = q.question || {}
        const contentJson = questionContent.blocks
          ? questionContent
          : { blocks: [{ type: "paragraph", content: Array.isArray(q.content) ? q.content : [] }] }
        fd.append("content_json", JSON.stringify(contentJson))

        if (images[idx]) fd.append("image", images[idx])

        if (q.type === 'mcq' && Array.isArray(q.options)) {
          const opts = q.options.map((opt, oi) => ({
            key: opt.key || String.fromCharCode(65 + oi),
            content_json: { blocks: [{ type: "paragraph", content: opt.content || [] }] },
            is_correct: opt.key === q.correct_answer || opt.is_correct || false
          }))
          fd.append("options", JSON.stringify(opts))
        }

        if ((q.type === 'true_false_group' || q.type === 'true_false') && Array.isArray(q.statements)) {
          const stmts = q.statements.map((st, si) => ({
            key: st.key || String.fromCharCode(97 + si),
            content_json: { blocks: [{ type: "paragraph", content: st.content || [] }] },
            is_true: st.is_true || false
          }))
          fd.append("statements", JSON.stringify(stmts))
        }

        if (q.type === 'short_answer' && q.correct_answer != null) {
          fd.append("correct_answer", String(q.correct_answer))
        }

        await createQuestion(fd)
        saved++
        setSavingProgress({ current: saved, total: selectedIndices.length, done: false })
      } catch (err) {
        console.error("Lỗi lưu câu hỏi:", err)
      }
    }
    setSavingProgress({ current: saved, total: selectedIndices.length, done: true })
  }

  const selectedCount = Object.values(selectedQuestions).filter(Boolean).length
  // Số câu được chọn đã có topic
  const readyCount = Object.keys(selectedQuestions).filter(i => selectedQuestions[i] && topicIds[i]).length

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/teacher/questions")} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ChevronLeft size={24} className="text-[#1e3a5f]"/>
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#1e3a5f]">Upload đề thi PDF</h1>
            <p className="text-sm text-gray-400">Tải lên file PDF, AI sẽ nhận diện và trích xuất câu hỏi</p>
          </div>
        </div>
        {/* Stepper 2 bước */}
        <div className="flex items-center gap-2">
          {[1, 2].map(i => (
            <div key={i} className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${
              step === i ? "bg-[#f5a623] text-white shadow-lg" : step > i ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
            }`}>
              {step > i ? <Check size={20}/> : i}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1 — Upload */}
      {step === 1 && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              isDragging ? "border-[#f5a623] bg-orange-50"
              : file ? "border-green-400 bg-green-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileSelect}/>
            {file ? (
              <div className="flex flex-col items-center">
                <FileText size={48} className="text-green-500 mb-4"/>
                <p className="font-bold text-gray-700">{file.name}</p>
                <p className="text-sm text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Upload size={48} className="text-gray-400 mb-4"/>
                <p className="font-bold text-gray-600">Kéo thả file PDF vào đây</p>
                <p className="text-sm text-gray-400 mt-1">hoặc click để chọn file</p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16}/> {error}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleUpload} disabled={!file || loading}
              className="px-6 py-3 bg-[#f5a623] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#e09410] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <><Loader2 size={18} className="animate-spin"/> AI đang phân tích văn bản...</>
                : <>Nhận diện bằng AI <ChevronRight size={18}/></>}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Review + Chọn topic từng câu + Lưu */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Banner */}
          <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2c5282] text-white p-5 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Đã nhận diện {questions.length} câu hỏi</h3>
              <p className="text-sm text-white/70">Chọn câu, gán chuyên đề cho từng câu, upload ảnh nếu cần</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black">{readyCount}<span className="text-lg text-white/60">/{selectedCount}</span></div>
              <p className="text-xs text-white/60">câu sẵn sàng lưu</p>
            </div>
          </div>

          {/* Chọn tất cả */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox"
                checked={selectedCount === questions.length && questions.length > 0}
                onChange={toggleAll}
                className="w-5 h-5 accent-[#f5a623]"
              />
              <span className="font-bold text-gray-700">Chọn tất cả ({selectedCount}/{questions.length})</span>
            </label>
            <span className="text-xs text-gray-400">
              {readyCount < selectedCount
                ? <span className="text-orange-500 font-bold">⚠ {selectedCount - readyCount} câu chưa có chuyên đề</span>
                : selectedCount > 0 ? <span className="text-green-600 font-bold">✓ Tất cả đã có chuyên đề</span> : null}
            </span>
          </div>

          {/* Grid câu hỏi */}
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <QuestionReviewCard
                key={idx}
                q={q}
                idx={idx}
                selected={!!selectedQuestions[idx]}
                onToggle={() => toggleQuestion(idx)}
                imageFile={images[idx] || null}
                onImageUpload={(f) => handleImageUpload(idx, f)}
                flatTopics={flatTopics}
                topicId={topicIds[idx] || null}
                onTopicChange={(tid) => handleTopicChange(idx, tid)}
              />
            ))}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle size={16}/> {error}
            </div>
          )}

          {/* Progress */}
          {savingProgress.total > 0 && (
            <div className="bg-white p-4 rounded-xl border border-gray-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">{savingProgress.done ? "Hoàn tất!" : "Đang lưu..."}</span>
                <span className="font-bold text-[#1e3a5f]">{savingProgress.current}/{savingProgress.total}</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${(savingProgress.current / savingProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {savingProgress.done && (
            <div className="p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-3">
              <CheckCircle size={24}/>
              <span className="font-bold">Đã lưu {savingProgress.current}/{savingProgress.total} câu hỏi thành công!</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <button
              onClick={() => setStep(1)}
              disabled={savingProgress.current > 0 && !savingProgress.done}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-300 transition-all disabled:opacity-50"
            >
              <ChevronLeft size={18}/> Quay lại
            </button>
            {savingProgress.done ? (
              <button onClick={() => navigate("/teacher/questions")}
                className="px-8 py-3 bg-[#1e3a5f] text-white rounded-xl font-bold hover:bg-[#162a45] transition-all">
                Xem danh sách câu hỏi
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={selectedCount === 0 || savingProgress.current > 0}
                className="px-8 py-3 bg-[#f5a623] text-white rounded-xl font-bold flex items-center gap-2 hover:bg-[#e09410] transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Lưu {readyCount > 0 ? readyCount : selectedCount} câu hỏi
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPDF