import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Download, Search, Loader2, X, Eye, ExternalLink, MessageCircle } from 'lucide-react'
import documentsApi from '../api/documents'

// ─── PDF Viewer Modal ──────────────────────────────────────────
function PdfViewerModal({ doc, onClose }) {
  if (!doc) return null

  const isPdf = doc.file_url?.toLowerCase().endsWith('.pdf')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <FileText size={18} className="text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-[#1e3a5f] truncate text-sm">{doc.title}</p>
              <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {doc.file_url && (
              <a
                href={doc.file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-semibold hover:bg-[#16304f] transition-colors"
              >
                <Download size={14} /> Tải xuống
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-hidden bg-gray-100">
          {doc.file_url ? (
            isPdf ? (
              <iframe
                src={doc.file_url + '#toolbar=1&navpanes=0'}
                className="w-full h-full border-0"
                title={doc.title}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                <FileText size={48} className="text-gray-300" />
                <p className="text-sm">Định dạng này không thể xem trực tiếp.</p>
                <a
                  href={doc.file_url}
                  download
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#16304f] transition-colors"
                >
                  <Download size={16} /> Tải về để xem
                </a>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
              <FileText size={48} className="text-gray-300" />
              <p className="text-sm">Tài liệu chưa có file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────
function Documents() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [viewingDoc, setViewingDoc] = useState(null)

  useEffect(() => { fetchDocuments() }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const data = await documentsApi.getDocuments()
      const list = Array.isArray(data) ? data : (data?.results ?? [])
      setDocs(list)
      setError(null)
    } catch (err) {
      setError('Không thể tải danh sách tài liệu. Vui lòng thử lại.')
      console.error('[Documents] fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredDocs = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-[#1e3a5f]">Tài liệu học tập</h1>
            <p className="text-gray-500 mt-1">Tổng hợp các chuyên đề, đề thi và bài giảng hay nhất.</p>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin mb-4" size={40} />
            <p>Đang tải danh sách tài liệu...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-100 rounded-2xl py-10 flex flex-col items-center text-red-500">
            <p className="mb-4">{error}</p>
            <button onClick={fetchDocuments} className="px-5 py-2 bg-[#1e3a5f] text-white rounded-xl font-semibold text-sm">Thử lại</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.length > 0 ? filteredDocs.map((doc) => (
              <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                {/* Top color bar */}
                <div className="h-1.5 bg-gradient-to-r from-[#1e3a5f] to-[#2c5282]" />
                <div className="p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0 group-hover:bg-red-100 transition-colors">
                      <FileText size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#1e3a5f] text-sm leading-snug mb-1 line-clamp-2">{doc.title}</h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('vi-VN')}</p>
                        {doc.root_comment_count > 0 && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MessageCircle size={11} />{doc.root_comment_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {doc.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">{doc.description}</p>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    {doc.file_url ? (
                      <>
                        <button
                          onClick={() => setViewingDoc(doc)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#f0f4f8] text-[#1e3a5f] rounded-xl text-xs font-semibold hover:bg-[#1e3a5f] hover:text-white transition-all"
                        >
                          <Eye size={14} /> Xem trực tiếp
                        </button>
                        <a
                          href={doc.file_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f5a623] text-white rounded-xl text-xs font-semibold hover:bg-[#e09410] transition-all"
                        >
                          <Download size={14} />
                        </a>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Chưa có file</span>
                    )}
                    {/* Link đến trang chi tiết + bình luận */}
                    <Link
                      to={`/documents/${doc.id}`}
                      className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-500 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-all border border-gray-100"
                      title="Xem bình luận"
                    >
                      <MessageCircle size={14} />
                      {doc.root_comment_count > 0 ? doc.root_comment_count : ''}
                    </Link>
                  </div>
                </div>
              </div>
            )) : (
              <div className="col-span-full py-20 text-center text-gray-400">
                <FileText size={40} className="mx-auto mb-3 text-gray-200" />
                Chưa có tài liệu nào phù hợp với tìm kiếm của bạn.
              </div>
            )}
          </div>
        )}
      </div>

      {/* PDF Viewer Modal */}
      {viewingDoc && (
        <PdfViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />
      )}
    </div>
  )
}

export default Documents
