import { useState, useEffect, useRef } from "react"
import {
  Plus, Upload, FileText, Eye, Trash2, X, Loader2,
  AlertCircle, BookOpen, Download
} from "lucide-react"
import { getDocuments, uploadDocument, deleteDocument } from "../../api/documents"

// ─── PDF Viewer Modal ─────────────────────────────────────────
function PdfViewerModal({ doc, onClose }) {
  if (!doc) return null
  const isPdf = doc.file_url?.toLowerCase().includes('.pdf')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <p className="font-bold text-[#1e3a5f] truncate text-sm mr-4">{doc.title}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {doc.file_url && (
              <a href={doc.file_url} download target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e3a5f] text-white rounded-lg text-xs font-semibold">
                <Download size={14} /> Tải xuống
              </a>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden bg-gray-100">
          {doc.file_url ? (
            isPdf ? (
              <iframe src={doc.file_url + '#toolbar=1&navpanes=0'}
                className="w-full h-full border-0" title={doc.title} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                <FileText size={48} className="text-gray-300" />
                <p className="text-sm">Định dạng này không thể xem trực tiếp.</p>
                <a href={doc.file_url} download
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a5f] text-white rounded-xl text-sm font-semibold">
                  <Download size={16} /> Tải về để xem
                </a>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">Chưa có file.</div>
          )}
        </div>
      </div>
    </div>
  )
}

function DocumentManager() {
  const [docs, setDocs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [viewingDoc, setViewingDoc] = useState(null)
  const fileRef = useRef(null)

  // Upload form
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadDesc, setUploadDesc] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => { loadDocs() }, [])

  const loadDocs = async () => {
    setLoading(true)
    try {
      const res = await getDocuments()
      setDocs(res.results || res || [])
      setTotal(res.total || (res.results || res || []).length)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleUpload = async () => {
    if (!uploadFile) { setUploadError("Vui lòng chọn file"); return }
    if (!uploadTitle.trim()) { setUploadError("Vui lòng nhập tiêu đề"); return }
    setUploading(true); setUploadError("")
    try {
      const fd = new FormData()
      fd.append("file", uploadFile)
      fd.append("title", uploadTitle)
      if (uploadDesc) fd.append("description", uploadDesc)
      await uploadDocument(fd)
      setShowUpload(false)
      resetUpload()
      loadDocs()
    } catch (err) {
      setUploadError(err.response?.data?.error || "Upload thất bại")
    } finally { setUploading(false) }
  }

  const handleDelete = async () => {
    if (!showDeleteConfirm) return
    try {
      await deleteDocument(showDeleteConfirm)
      setShowDeleteConfirm(null)
      loadDocs()
    } catch (e) { alert("Không thể xóa tài liệu") }
  }

  const resetUpload = () => {
    setUploadFile(null); setUploadTitle(""); setUploadDesc(""); setUploadError("")
  }

  const getFileIcon = (filename) => {
    if (!filename) return "📄"
    const ext = filename.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return "📕"
    if (['doc', 'docx'].includes(ext)) return "📘"
    if (['xls', 'xlsx'].includes(ext)) return "📗"
    return "📄"
  }

  const formatSize = (bytes) => {
    if (!bytes) return ""
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / 1024 / 1024).toFixed(1) + " MB"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#1e3a5f]">Quản lý tài liệu</h1>
        <button
          onClick={() => { resetUpload(); setShowUpload(true) }}
          className="bg-[#f5a623] hover:bg-[#e09410] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95"
        >
          <Plus size={20}/> Upload tài liệu
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
            <BookOpen size={24} className="text-blue-500"/>
          </div>
          <div>
            <p className="text-2xl font-black text-[#1e3a5f]">{total}</p>
            <p className="text-xs text-gray-400 font-medium">Tổng tài liệu</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center">
            <FileText size={24} className="text-orange-500"/>
          </div>
          <div>
            <p className="text-2xl font-black text-[#1e3a5f]">{docs.filter(d => d.file_url?.endsWith('.pdf') || d.file_name?.endsWith('.pdf')).length}</p>
            <p className="text-xs text-gray-400 font-medium">File PDF</p>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-400">Đang tải tài liệu...</div>
      ) : docs.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">📂</div>
          <h3 className="text-lg font-bold text-gray-600 mb-2">Chưa có tài liệu nào</h3>
          <p className="text-sm text-gray-400 mb-6">Upload tài liệu để học sinh có thể tải về</p>
          <button onClick={() => setShowUpload(true)} className="px-6 py-2.5 bg-[#f5a623] text-white rounded-xl font-bold hover:bg-[#e09410]">
            Upload ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {docs.map(doc => (
            <div key={doc.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:border-gray-200 transition-all">
              <div className="text-3xl flex-shrink-0">{getFileIcon(doc.file_name || doc.file_url)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm truncate">{doc.title}</p>
                {doc.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{doc.description}</p>}
                <div className="flex items-center gap-3 mt-1">
                  {doc.file_size && <span className="text-xs text-gray-300">{formatSize(doc.file_size)}</span>}
                  <span className="text-xs text-gray-300">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('vi-VN') : ''}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {doc.file_url && (
                  <>
                    <button onClick={() => setViewingDoc(doc)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Xem trực tiếp">
                      <Eye size={18}/>
                    </button>
                    <a href={doc.file_url} download target="_blank" rel="noreferrer"
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Tải về">
                      <Download size={18}/>
                    </a>
                  </>
                )}
                <button onClick={() => setShowDeleteConfirm(doc.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Upload */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a5f]/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-[#1e3a5f] flex items-center gap-2">
                <Upload size={20} className="text-[#f5a623]"/> Upload tài liệu
              </h3>
              <button onClick={() => { setShowUpload(false); resetUpload() }} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-400"/>
              </button>
            </div>
            <div className="p-8 space-y-5">
              {/* Dropzone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={e => {
                  e.preventDefault(); setIsDragging(false)
                  const f = e.dataTransfer.files[0]
                  if (f) { setUploadFile(f); if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, '')) }
                }}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-[#f5a623] bg-orange-50' : uploadFile ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input ref={fileRef} type="file" className="hidden" onChange={e => {
                  const f = e.target.files[0]
                  if (f) { setUploadFile(f); if (!uploadTitle) setUploadTitle(f.name.replace(/\.[^.]+$/, '')) }
                }}/>
                {uploadFile ? (
                  <div className="flex flex-col items-center">
                    <FileText size={36} className="text-green-500 mb-2"/>
                    <p className="font-bold text-sm text-gray-700">{uploadFile.name}</p>
                    <p className="text-xs text-gray-400">{formatSize(uploadFile.size)}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload size={36} className="text-gray-400 mb-2"/>
                    <p className="font-medium text-gray-600 text-sm">Kéo thả hoặc click để chọn file</p>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tiêu đề *</label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)}
                  placeholder="Tên tài liệu..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623]"/>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Mô tả</label>
                <textarea value={uploadDesc} onChange={e => setUploadDesc(e.target.value)} rows={2}
                  placeholder="Tóm tắt nội dung..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#f5a623] resize-none"/>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16}/> {uploadError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => { setShowUpload(false); resetUpload() }}
                  className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-2xl hover:bg-gray-300">
                  Hủy
                </button>
                <button onClick={handleUpload} disabled={uploading}
                  className="flex-1 py-3 bg-[#f5a623] text-white font-bold rounded-2xl hover:bg-[#e09410] disabled:opacity-60 flex items-center justify-center gap-2">
                  {uploading ? <><Loader2 size={16} className="animate-spin"/> Đang upload...</> : "Upload"}
                </button>
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
            <h3 className="text-xl font-bold text-gray-800 mb-2">Xóa tài liệu?</h3>
            <p className="text-gray-500 text-sm mb-8">Tài liệu sẽ bị xóa và học sinh không thể tải về nữa.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 font-bold rounded-2xl">Hủy</button>
              <button onClick={handleDelete}
                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-200">Xóa</button>
            </div>
          </div>
        </div>
      )}
      {/* PDF Viewer Modal */}
      {viewingDoc && <PdfViewerModal doc={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </div>
  )
}

export default DocumentManager
