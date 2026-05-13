import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, X, Loader2, AlertCircle,
  PlayCircle, Tv2, BookOpen, Eye, Filter, List, ChevronDown,
} from 'lucide-react'
import { getVideos, createVideo, updateVideo, deleteVideo } from '../../api/videos'
import { getTopics } from '../../api/topics'

// Regex validate youtube_id: đúng 11 ký tự
const YT_REGEX = /^[a-zA-Z0-9_-]{11}$/

// ─── Badge category ───────────────────────────────────────────
function CategoryBadge({ category }) {
  if (category === 'live_session') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
        <Tv2 size={10} /> Buổi học
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
      <BookOpen size={10} /> Bài giảng
    </span>
  )
}

// ─── Thumbnail nhỏ 80×45 ─────────────────────────────────────
function ThumbSmall({ youtubeId }) {
  return (
    <div className="w-20 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
      <img
        src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
        alt=""
        className="w-full h-full object-cover"
      />
    </div>
  )
}

// ─── Modal Form thêm / sửa ────────────────────────────────────
function VideoFormModal({ video, topics, onClose, onSave }) {
  const isEdit = !!video

  const [form, setForm] = useState({
    title:       video?.title       || '',
    description: video?.description || '',
    youtube_id:  video?.youtube_id  || '',
    category:    video?.category    || 'topic_lesson',
    topic_id:    video?.topic_id    || '',
    order_index: video?.order_index ?? 0,
  })
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  // Validate youtube_id realtime
  const ytValid = YT_REGEX.test(form.youtube_id)

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  // Khi đổi category sang live_session → reset topic_id
  const handleCategory = (val) => {
    set('category', val)
    if (val === 'live_session') set('topic_id', '')
  }

  const handleSave = async () => {
    if (!form.title.trim())  { setError('Vui lòng nhập tiêu đề'); return }
    if (!ytValid)            { setError('youtube_id không hợp lệ (đúng 11 ký tự: a-z A-Z 0-9 _ -)'); return }
    setSaving(true); setError('')
    try {
      const payload = {
        title:       form.title.trim(),
        description: form.description.trim(),
        youtube_id:  form.youtube_id.trim(),
        category:    form.category,
        topic_id:    form.category === 'topic_lesson' && form.topic_id ? Number(form.topic_id) : null,
        order_index: Number(form.order_index) || 0,
      }
      if (isEdit) {
        await updateVideo(video.id, payload)
      } else {
        await createVideo(payload)
      }
      onSave()
    } catch (err) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra')
    } finally { setSaving(false) }
  }

  const inputClass = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30'
  const labelClass = 'text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a5f]/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-black text-[#1e3a5f] flex items-center gap-2">
            <PlayCircle size={20} className="text-[#f5a623]" />
            {isEdit ? 'Sửa video' : 'Thêm video mới'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-7 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Tiêu đề */}
          <div>
            <label className={labelClass}>Tiêu đề *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              placeholder="VD: Giới hạn hàm số - Phần 1" className={inputClass} />
          </div>

          {/* Mô tả */}
          <div>
            <label className={labelClass}>Mô tả</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} placeholder="Tóm tắt nội dung video..."
              className={inputClass + ' resize-none'} />
          </div>

          {/* YouTube ID + Preview */}
          <div>
            <label className={labelClass}>YouTube ID *</label>
            <input value={form.youtube_id} onChange={e => set('youtube_id', e.target.value.trim())}
              placeholder="VD: dQw4w9WgXcQ (11 ký tự)"
              className={`${inputClass} ${form.youtube_id && !ytValid ? 'border-red-300 ring-1 ring-red-200' : ''}`} />
            {form.youtube_id && !ytValid && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> Phải đúng 11 ký tự, chỉ gồm a-z A-Z 0-9 _ -
              </p>
            )}
            {ytValid && form.youtube_id && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                ✓ Định dạng hợp lệ
              </p>
            )}
          </div>

          {/* Preview iframe — chỉ hiện khi youtube_id hợp lệ */}
          {ytValid && form.youtube_id && (
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-black">
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-1.5">
                <Eye size={13} className="text-gray-400" />
                <span className="text-xs text-gray-500 font-medium">Preview</span>
              </div>
              <div className="aspect-video">
                <iframe
                  key={form.youtube_id}
                  src={`https://www.youtube.com/embed/${form.youtube_id}`}
                  width="100%"
                  height="100%"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="border-0 w-full h-full"
                  title="Preview"
                />
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className={labelClass}>Phân loại *</label>
            <div className="flex gap-3">
              {[
                { key: 'topic_lesson', label: 'Bài giảng theo chuyên đề', icon: BookOpen },
                { key: 'live_session', label: 'Buổi học trực tiếp', icon: Tv2 },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => handleCategory(key)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                    ${form.category === key
                      ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  <Icon size={15} />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Topic dropdown — chỉ hiện khi category = topic_lesson */}
          {form.category === 'topic_lesson' && (
            <div>
              <label className={labelClass}>Chuyên đề (Cấp 3)</label>
              <div className="relative">
                <select
                  value={form.topic_id}
                  onChange={e => set('topic_id', e.target.value)}
                  className={inputClass + ' appearance-none pr-8'}
                >
                  <option value="">-- Không gắn chuyên đề --</option>
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Thứ tự */}
          <div>
            <label className={labelClass}>Thứ tự hiển thị</label>
            <input type="number" min="0" value={form.order_index}
              onChange={e => set('order_index', e.target.value)}
              className={inputClass + ' w-28'} />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200">
              Hủy
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-3 bg-[#1e3a5f] text-white font-bold rounded-2xl hover:bg-[#16304f]
                disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50">
              {saving ? <><Loader2 size={16} className="animate-spin" /> Đang lưu...</> : (isEdit ? 'Cập nhật' : 'Thêm video')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Confirm delete modal ─────────────────────────────────────
function DeleteConfirm({ video, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-sm">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Xóa video?</h3>
        <p className="text-gray-500 text-sm mb-2">
          <span className="font-semibold text-gray-700">"{video?.title}"</span>
        </p>
        <p className="text-gray-400 text-xs mb-8">Video sẽ bị ẩn khỏi hệ thống và học sinh không thể xem nữa.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200">
            Hủy
          </button>
          <button onClick={onConfirm}
            className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-200 hover:bg-red-600">
            Xóa
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Trang chính VideoManager ─────────────────────────────────
export default function VideoManager() {
  const [videos,         setVideos]         = useState([])
  const [topics,         setTopics]         = useState([])    // cấp 3, dùng cho dropdown
  const [loading,        setLoading]        = useState(true)
  const [filterCategory, setFilterCategory] = useState('')    // '' | 'topic_lesson' | 'live_session'
  const [showForm,       setShowForm]       = useState(false)
  const [editingVideo,   setEditingVideo]   = useState(null)  // null = thêm mới
  const [deletingVideo,  setDeletingVideo]  = useState(null)
  const [actionError,    setActionError]    = useState('')

  // Load videos
  const loadVideos = useCallback(async () => {
    setLoading(true)
    try {
      const params = filterCategory ? { category: filterCategory } : {}
      const res = await getVideos(params)
      setVideos(res.results || [])
    } catch { setActionError('Không thể tải danh sách video') }
    finally { setLoading(false) }
  }, [filterCategory])

  // Load topics cấp 3 cho dropdown
  useEffect(() => {
    getTopics({ level: 3 })
      .then(res => setTopics(res.results || res || []))
      .catch(() => {})
  }, [])

  useEffect(() => { loadVideos() }, [loadVideos])

  // Mở form thêm mới
  const handleAdd = () => { setEditingVideo(null); setShowForm(true) }

  // Mở form sửa
  const handleEdit = (v) => { setEditingVideo(v); setShowForm(true) }

  // Sau khi save thành công
  const handleSaved = () => { setShowForm(false); setEditingVideo(null); loadVideos() }

  // Xóa video
  const handleDelete = async () => {
    if (!deletingVideo) return
    try {
      await deleteVideo(deletingVideo.id)
      setDeletingVideo(null)
      loadVideos()
    } catch { setActionError('Không thể xóa video') }
  }

  const totalLesson = videos.filter(v => v.category === 'topic_lesson').length
  const totalLive   = videos.filter(v => v.category === 'live_session').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#1e3a5f]">Quản lý Video Bài Giảng</h1>
          <p className="text-sm text-gray-400 mt-0.5">Quản lý video bài giảng và buổi học trực tiếp</p>
        </div>
        <button onClick={handleAdd}
          className="bg-[#f5a623] hover:bg-[#e09410] text-white px-5 py-2.5 rounded-xl font-bold
            flex items-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95">
          <Plus size={18} /> Thêm video
        </button>
      </div>

      {actionError && (
        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {actionError}
          <button onClick={() => setActionError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Tổng video',    value: videos.length, color: 'bg-indigo-50', iconColor: 'text-indigo-500', icon: PlayCircle },
          { label: 'Bài giảng',     value: totalLesson,   color: 'bg-blue-50',   iconColor: 'text-blue-500',   icon: BookOpen  },
          { label: 'Buổi trực tiếp',value: totalLive,     color: 'bg-purple-50', iconColor: 'text-purple-500', icon: Tv2       },
        ].map(({ label, value, color, iconColor, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
              <Icon size={24} className={iconColor} />
            </div>
            <div>
              <p className="text-2xl font-black text-[#1e3a5f]">{value}</p>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
        <Filter size={16} className="text-gray-400" />
        <span className="text-sm text-gray-500 font-medium">Lọc:</span>
        {[
          { val: '',             label: 'Tất cả'   },
          { val: 'topic_lesson', label: 'Bài giảng' },
          { val: 'live_session', label: 'Buổi học'  },
        ].map(({ val, label }) => (
          <button key={val} onClick={() => setFilterCategory(val)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all
              ${filterCategory === val
                ? 'bg-[#1e3a5f] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{videos.length} video</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <Loader2 size={24} className="animate-spin mr-3" /> Đang tải...
          </div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16">
            <PlayCircle size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">Chưa có video nào</p>
            <p className="text-sm text-gray-400 mb-5">Thêm video đầu tiên để học sinh có thể xem</p>
            <button onClick={handleAdd}
              className="px-6 py-2.5 bg-[#f5a623] text-white rounded-xl font-bold hover:bg-[#e09410]">
              Thêm video ngay
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase w-10">ID</th>
                <th className="px-3 py-3.5 text-xs font-bold text-gray-500 uppercase w-24">Thumbnail</th>
                <th className="px-3 py-3.5 text-xs font-bold text-gray-500 uppercase">Tiêu đề</th>
                <th className="px-3 py-3.5 text-xs font-bold text-gray-500 uppercase w-28">Loại</th>
                <th className="px-3 py-3.5 text-xs font-bold text-gray-500 uppercase w-36 hidden lg:table-cell">Chuyên đề</th>
                <th className="px-3 py-3.5 text-xs font-bold text-gray-500 uppercase w-24 hidden md:table-cell">Ngày tạo</th>
                <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase w-20 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {videos.map(v => (
                <tr key={v.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-3 text-gray-400 font-mono text-xs">{v.id}</td>
                  <td className="px-3 py-3">
                    <ThumbSmall youtubeId={v.youtube_id} />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-gray-800 line-clamp-2 text-sm leading-snug">{v.title}</p>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{v.youtube_id}</p>
                  </td>
                  <td className="px-3 py-3">
                    <CategoryBadge category={v.category} />
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    {v.topic_name
                      ? <span className="text-xs text-gray-600 line-clamp-2">{v.topic_name}</span>
                      : <span className="text-xs text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400 hidden md:table-cell">
                    {v.created_at ? new Date(v.created_at).toLocaleDateString('vi-VN') : ''}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => handleEdit(v)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Sửa">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeletingVideo(v)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <VideoFormModal
          video={editingVideo}
          topics={topics}
          onClose={() => { setShowForm(false); setEditingVideo(null) }}
          onSave={handleSaved}
        />
      )}

      {/* Modal Xóa */}
      {deletingVideo && (
        <DeleteConfirm
          video={deletingVideo}
          onCancel={() => setDeletingVideo(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
