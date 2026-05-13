import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FileText, Download, ArrowLeft, Loader2, AlertCircle, Calendar } from 'lucide-react'
import documentsApi from '../api/documents'
import CommentSection from '../components/CommentSection'

export default function DocumentDetail() {
  const { id } = useParams()
  const [doc, setDoc]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    setLoading(true)
    documentsApi.getDocumentDetail(id)
      .then(data => { setDoc(data); setError(null) })
      .catch(() => setError('Không tìm thấy tài liệu hoặc bạn chưa đăng nhập.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <Loader2 size={36} className="animate-spin text-[#1e3a5f]" />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-4 text-gray-500">
      <AlertCircle size={40} className="text-red-400" />
      <p>{error}</p>
      <Link to="/documents" className="text-[#1e3a5f] font-semibold hover:underline text-sm">
        ← Quay lại danh sách
      </Link>
    </div>
  )

  const isPdf = doc.file_url?.toLowerCase().endsWith('.pdf')

  return (
    <div className="min-h-screen bg-[#f8fafc] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Back link */}
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#1e3a5f] font-semibold mb-6 transition-colors"
        >
          <ArrowLeft size={15} /> Tài liệu học tập
        </Link>

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="h-1.5 bg-gradient-to-r from-[#1e3a5f] to-[#2c5282]" />
          <div className="p-6 flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-red-400 flex-shrink-0">
              <FileText size={28} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-extrabold text-[#1e3a5f] mb-1 leading-snug">{doc.title}</h1>
              {doc.description && (
                <p className="text-sm text-gray-500 mb-3">{doc.description}</p>
              )}
              <div className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Calendar size={13} />
                  {new Date(doc.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </span>
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1e3a5f] text-white rounded-xl text-xs font-bold hover:bg-[#16304f] transition-colors"
                  >
                    <Download size={13} /> Tải xuống
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* PDF Viewer */}
        {doc.file_url && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
            {isPdf ? (
              <iframe
                src={doc.file_url + '#toolbar=1&navpanes=0'}
                className="w-full border-0"
                style={{ height: '65vh' }}
                title={doc.title}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-4 text-gray-400">
                <FileText size={48} className="text-gray-200" />
                <p className="text-sm">Định dạng này không thể xem trực tiếp.</p>
                <a
                  href={doc.file_url}
                  download
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold hover:bg-[#16304f] transition-colors"
                >
                  <Download size={16} /> Tải về để xem
                </a>
              </div>
            )}
          </div>
        )}

        {/* Comment Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <CommentSection targetType="document" targetId={Number(id)} />
        </div>

      </div>
    </div>
  )
}
