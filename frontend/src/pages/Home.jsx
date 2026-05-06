import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, FileText, Users, ArrowRight,
  TrendingUp, Clock, Library, Loader2
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getExams } from '../api/exams'
import documentsApi from '../api/documents'

const EXAM_TYPE_LABEL = {
  topic: 'Chuyên đề',
  midterm: 'Giữa kỳ',
  final: 'Cuối kỳ',
  graduation: 'Thi thử TNTHPT',
}
const EXAM_TYPE_COLOR = {
  topic: 'bg-blue-600',
  midterm: 'bg-green-600',
  final: 'bg-purple-600',
  graduation: 'bg-[#1e3a5f]',
}

// ─── Section Header ───────────────────────────────────────────
function SectionHeader({ eyebrow, title, linkTo, linkLabel }) {
  return (
    <div className="flex items-end justify-between mb-8">
      <div>
        <p className="text-[#f5a623] text-xs font-semibold uppercase tracking-widest mb-1">{eyebrow}</p>
        <h2 className="text-2xl font-bold text-[#1e3a5f]">{title}</h2>
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="text-sm text-gray-500 hover:text-[#f5a623] flex items-center gap-1 transition-colors"
        >
          {linkLabel} <ArrowRight size={14} />
        </Link>
      )}
    </div>
  )
}

// ─── Exam Card (real data) ─────────────────────────────────────
function ExamCard({ exam, delay = 0 }) {
  const typeKey = exam?.exam_type ?? 'topic'
  return (
    <div
      className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 card-hover animate-fadeInUp"
      style={{ animationDelay: `${delay}ms` }}
    >
      {exam ? (
        <>
          <div className="flex items-start justify-between">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-white ${EXAM_TYPE_COLOR[typeKey] ?? 'bg-gray-500'}`}>
              {EXAM_TYPE_LABEL[typeKey] ?? typeKey}
            </span>
            <FileText size={18} className="text-gray-300 group-hover:text-[#f5a623] transition-colors" />
          </div>
          <h3 className="font-semibold text-gray-800 leading-snug flex-1">{exam.title}</h3>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><BookOpen size={12} /> {exam.question_count ?? '—'} câu hỏi</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {exam.duration_minutes} phút</span>
          </div>
          <Link
            to={`/exam-room/${exam.id}`}
            className="mt-auto block text-center py-2.5 bg-[#f5a623] text-white rounded-lg font-semibold text-sm hover:bg-[#e09410] active:scale-95 transition-all"
          >
            Vào làm bài
          </Link>
        </>
      ) : (
        /* Ô rỗng — giữ nguyên lưới 3 cột */
        <div className="flex-1 flex items-center justify-center text-gray-200 text-sm py-10 border-2 border-dashed border-gray-100 rounded-lg">
          —
        </div>
      )}
    </div>
  )
}

// ─── Document Card (real data) ────────────────────────────────
function DocCard({ doc, delay = 0 }) {
  const [viewing, setViewing] = useState(false)

  return (
    <>
      <div
        className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col gap-3 card-hover animate-fadeInUp"
        style={{ animationDelay: `${delay}ms` }}
      >
        {doc ? (
          <>
            <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <FileText size={22} className="text-red-500" />
            </div>
            <h3 className="font-semibold text-gray-800 leading-snug flex-1 line-clamp-2">{doc.title}</h3>
            {doc.description && (
              <p className="text-xs text-gray-500 line-clamp-2">{doc.description}</p>
            )}
            <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</p>
            <div className="flex gap-2 mt-auto">
              {doc.file_url && (
                <button
                  onClick={() => setViewing(true)}
                  className="flex-1 text-center py-2.5 bg-[#1e3a5f] text-white rounded-lg font-semibold text-sm hover:bg-[#16304f] active:scale-95 transition-all"
                >
                  Xem tài liệu
                </button>
              )}
              <Link
                to="/documents"
                className="px-3 py-2.5 border border-gray-200 text-gray-500 rounded-lg text-sm hover:border-gray-300 transition-colors"
              >
                <Library size={16} />
              </Link>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-200 text-sm py-10 border-2 border-dashed border-gray-100 rounded-lg">
            —
          </div>
        )}
      </div>

      {/* Inline PDF viewer modal */}
      {viewing && doc?.file_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 modal-overlay p-4"
          onClick={() => setViewing(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col overflow-hidden modal-content"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="font-bold text-[#1e3a5f] text-sm truncate">{doc.title}</p>
              <button
                onClick={() => setViewing(false)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
              >✕</button>
            </div>
            <iframe
              src={doc.file_url + '#toolbar=1&navpanes=0'}
              className="flex-1 border-0 w-full"
              title={doc.title}
            />
          </div>
        </div>
      )}
    </>
  )
}

// ─── StatCard ─────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center gap-4 animate-fadeInUp">
      <div className="w-12 h-12 rounded-xl bg-[#eef2f7] flex items-center justify-center flex-shrink-0">
        <Icon size={24} className="text-[#1e3a5f]" />
      </div>
      <div>
        <p className="text-2xl font-bold text-[#1e3a5f]">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
function Home() {
  const { isAuthenticated } = useAuth()
  const [exams, setExams] = useState([])
  const [docs, setDocs] = useState([])
  const [examsLoading, setExamsLoading] = useState(true)
  const [docsLoading, setDocsLoading] = useState(true)

  useEffect(() => {
    // Lấy 3 đề thi sớm nhất (order_by created_at ASC = oldest first)
    getExams({ page: 1, limit: 3, ordering: 'created_at' })
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        setExams(list.slice(0, 3))
      })
      .catch(() => setExams([]))
      .finally(() => setExamsLoading(false))

    // Lấy 3 tài liệu sớm nhất
    documentsApi.getDocuments()
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.results ?? [])
        // Đảo ngược: oldest first
        setDocs([...list].reverse().slice(0, 3))
      })
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false))
  }, [])

  // Pad tới đủ 3 phần tử (null = ô rỗng)
  const examSlots = [...exams, null, null, null].slice(0, 3)
  const docSlots  = [...docs,  null, null, null].slice(0, 3)

  return (
    <div className="min-h-screen">
      {/* ── Hero ── */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeInUp">
              <h1 className="text-4xl lg:text-5xl font-extrabold text-[#1e3a5f] leading-tight mb-4">
                Luyện thi Toán THPT –<br />Chinh phục kỳ thi tốt nghiệp
              </h1>
              <p className="text-gray-500 text-lg mb-8 leading-relaxed">
                Hệ thống luyện thi thông minh với ngân hàng bộ đề bám sát cấu trúc Bộ GD&ĐT.
                Giúp học sinh nắm vững kiến thức và bứt phá điểm số trong kỳ thi quan trọng nhất.
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <Link
                  to={isAuthenticated ? '/topics' : '/register'}
                  className="flex items-center gap-2 px-6 py-3 bg-[#f5a623] text-white font-semibold rounded-lg hover:bg-[#e09410] active:scale-95 transition-all shadow-lg shadow-amber-200"
                >
                  Bắt đầu ngay <ArrowRight size={18} />
                </Link>
                <Link
                  to="/exams"
                  className="flex items-center gap-2 px-6 py-3 border-2 border-[#1e3a5f] text-[#1e3a5f] font-semibold rounded-lg hover:bg-[#1e3a5f] hover:text-white active:scale-95 transition-all"
                >
                  Xem đề thi thử
                </Link>
              </div>
            </div>

            <div className="relative animate-fadeInUp" style={{ animationDelay: '120ms' }}>
              <img
                src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=600&auto=format&fit=crop"
                alt="Học sinh luyện thi Toán"
                className="w-full h-80 lg:h-96 object-cover rounded-2xl shadow-xl"
              />
              <div className="absolute bottom-6 right-6 bg-white rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 animate-scaleIn" style={{ animationDelay: '400ms' }}>
                <div className="w-10 h-10 rounded-full bg-[#f5a623]/20 flex items-center justify-center">
                  <TrendingUp size={20} className="text-[#f5a623]" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tiến độ</p>
                  <p className="font-bold text-[#1e3a5f]">+85% Điểm số</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-[#f0f4f8] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard icon={BookOpen} value="500+" label="Câu hỏi luyện tập" />
            <StatCard icon={FileText} value="50+" label="Đề thi thử" />
            <StatCard icon={Users} value="1000+" label="Học sinh đăng ký" />
          </div>
        </div>
      </section>

      {/* ── Đề thi mới nhất (từ DB) ── */}
      <section className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Ngân hàng đề thi"
            title="Đề thi mới nhất"
            linkTo="/exams"
            linkLabel="Xem tất cả bộ đề"
          />
          {examsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={36} className="animate-spin text-[#1e3a5f]/30" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {examSlots.map((exam, i) => (
                <ExamCard key={exam?.id ?? `empty-${i}`} exam={exam} delay={i * 80} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Tài liệu mới nhất (từ DB) ── */}
      <section className="bg-[#f8fafc] py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Thư viện học tập"
            title="Tài liệu mới nhất"
            linkTo="/documents"
            linkLabel="Xem tất cả tài liệu"
          />
          {docsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={36} className="animate-spin text-[#1e3a5f]/30" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {docSlots.map((doc, i) => (
                <DocCard key={doc?.id ?? `empty-doc-${i}`} doc={doc} delay={i * 80} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Home
