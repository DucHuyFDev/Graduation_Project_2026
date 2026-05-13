import { useState, useEffect, useCallback } from 'react'
import { PlayCircle, Tv2, BookOpen, Calendar, ChevronRight, Loader2, AlertCircle, Video } from 'lucide-react'
import TopicTreeNode from '../components/TopicTreeNode'
import CommentSection from '../components/CommentSection'
import { getTopicsTree } from '../api/topics'
import { getVideos, getLiveSessions } from '../api/videos'

// ─── Thumbnail YouTube từ video ID ───────────────────────────
function VideoThumbnail({ youtubeId, title, isSelected }) {
  return (
    <div className={`relative overflow-hidden rounded-lg aspect-video bg-gray-900 flex-shrink-0
        ${isSelected ? 'ring-2 ring-[#f5a623]' : ''}`}>
      <img
        src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
        alt={title}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* Overlay play button */}
      <div className={`absolute inset-0 flex items-center justify-center bg-black/30
          transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
          <PlayCircle size={22} className="text-[#1e3a5f] fill-[#1e3a5f]" />
        </div>
      </div>
    </div>
  )
}

// ─── Card 1 video trong danh sách ────────────────────────────
function VideoCard({ video, isSelected, onClick }) {
  const date = video.created_at
    ? new Date(video.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : ''

  return (
    <div
      onClick={onClick}
      className={`group flex gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 border
        ${isSelected
          ? 'bg-[#1e3a5f]/5 border-[#1e3a5f]/30'
          : 'border-transparent hover:bg-gray-50 hover:border-gray-200'}`}
    >
      {/* Thumbnail nhỏ */}
      <div className="w-28 flex-shrink-0">
        <VideoThumbnail youtubeId={video.youtube_id} title={video.title} isSelected={isSelected} />
      </div>

      {/* Thông tin */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug line-clamp-2
          ${isSelected ? 'text-[#1e3a5f]' : 'text-gray-800'}`}>
          {video.title}
        </p>
        {video.topic_name && (
          <p className="text-xs text-[#f5a623] font-medium mt-1 truncate">{video.topic_name}</p>
        )}
        {date && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Calendar size={11} />
            {date}
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Player + thông tin video ────────────────────────────────
function VideoPlayer({ video }) {
  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[360px] text-gray-400 gap-3">
        <Video size={56} className="text-gray-200" />
        <p className="text-base font-medium">Chọn một video để xem</p>
        <p className="text-sm">Click vào card video ở bên trái để bắt đầu</p>
      </div>
    )
  }

  const date = video.created_at
    ? new Date(video.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="flex flex-col gap-5">
      {/* iframe YouTube — aspect-ratio 16:9 */}
      <div className="w-full aspect-video rounded-xl overflow-hidden shadow-lg bg-black">
        <iframe
          key={video.youtube_id}     /* Re-mount khi đổi video */
          src={video.embed_url}
          title={video.title}
          width="100%"
          height="100%"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>

      {/* Tiêu đề & meta */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-snug">{video.title}</h1>

        <div className="flex flex-wrap items-center gap-3 mt-2">
          {video.topic_name && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1e3a5f]
                bg-[#1e3a5f]/8 px-2.5 py-1 rounded-full">
              <BookOpen size={12} />
              {video.topic_name}
            </span>
          )}
          {video.category === 'live_session' && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700
                bg-purple-50 px-2.5 py-1 rounded-full">
              <Tv2 size={12} />
              Buổi học trực tiếp
            </span>
          )}
          {date && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Calendar size={12} />
              {date}
            </span>
          )}
        </div>

        {video.description && (
          <p className="mt-3 text-sm text-gray-600 leading-relaxed">{video.description}</p>
        )}
      </div>

      {/* Divider */}
      <hr className="border-gray-100" />

      {/* Section bình luận */}
      <CommentSection targetType="video" targetId={video.id} />
    </div>
  )
}

// ─── Tab: Theo chuyên đề ──────────────────────────────────────
function TabByTopic({ selectedVideo, onSelectVideo }) {
  const [topicsTree, setTopicsTree]   = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [videos, setVideos]           = useState([])
  const [loadingTopics, setLoadingTopics] = useState(true)
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [error, setError]             = useState('')

  // Load cây topic
  useEffect(() => {
    getTopicsTree()
      .then(data => setTopicsTree(data.results || data))
      .catch(() => setError('Không thể tải danh sách chuyên đề'))
      .finally(() => setLoadingTopics(false))
  }, [])

  // Load video khi chọn topic
  const handleSelectTopic = useCallback((topic) => {
    setSelectedTopic(topic)
    setLoadingVideos(true)
    setError('')
    getVideos({ topic_id: topic.id, category: 'topic_lesson' })
      .then(data => setVideos(data.results || []))
      .catch(() => setError('Không thể tải video'))
      .finally(() => setLoadingVideos(false))
  }, [])

  return (
    <div className="flex flex-col gap-3">
      {/* Cây topic */}
      <div className="border border-gray-100 rounded-xl p-2 bg-gray-50/50 max-h-64 overflow-y-auto">
        {loadingTopics ? (
          <div className="flex items-center justify-center py-6 text-gray-400">
            <Loader2 size={18} className="animate-spin mr-2" /> Đang tải...
          </div>
        ) : (
          topicsTree.map(node => (
            <TopicTreeNode
              key={node.id}
              node={node}
              onSelect={handleSelectTopic}
              selectedId={selectedTopic?.id}
            />
          ))
        )}
      </div>

      {/* Breadcrumb topic đã chọn */}
      {selectedTopic && (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 px-1">
          <ChevronRight size={13} />
          <span className="font-medium text-[#1e3a5f] truncate">{selectedTopic.name}</span>
          <span className="text-gray-300 ml-auto flex-shrink-0">{videos.length} video</span>
        </div>
      )}

      {/* Danh sách video theo topic */}
      {error && (
        <p className="text-xs text-red-500 px-1">{error}</p>
      )}

      {loadingVideos ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 size={18} className="animate-spin mr-2" /> Đang tải video...
        </div>
      ) : selectedTopic && videos.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <Video size={32} className="mx-auto mb-2 text-gray-200" />
          Chưa có video cho chuyên đề này
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {videos.map(v => (
            <VideoCard
              key={v.id}
              video={v}
              isSelected={selectedVideo?.id === v.id}
              onClick={() => onSelectVideo(v)}
            />
          ))}
        </div>
      )}

      {!selectedTopic && !loadingTopics && (
        <div className="text-center py-6 text-gray-400 text-sm">
          <BookOpen size={32} className="mx-auto mb-2 text-gray-200" />
          Chọn một chuyên đề để xem video bài giảng
        </div>
      )}
    </div>
  )
}

// ─── Tab: Buổi học trực tiếp ──────────────────────────────────
function TabLiveSessions({ selectedVideo, onSelectVideo }) {
  const [videos, setVideos]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    getLiveSessions()
      .then(data => setVideos(data.results || []))
      .catch(() => setError('Không thể tải danh sách buổi học'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-400">
        <Loader2 size={20} className="animate-spin mr-2" /> Đang tải...
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500 text-center py-6">{error}</p>
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400 text-sm">
        <Tv2 size={36} className="mx-auto mb-2 text-gray-200" />
        Chưa có buổi học trực tiếp nào được ghi lại
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      {videos.map(v => (
        <VideoCard
          key={v.id}
          video={v}
          isSelected={selectedVideo?.id === v.id}
          onClick={() => onSelectVideo(v)}
        />
      ))}
    </div>
  )
}

// ─── Trang chính Videos ───────────────────────────────────────
export default function Videos() {
  const [activeTab, setActiveTab]       = useState('topic')   // 'topic' | 'live'
  const [selectedVideo, setSelectedVideo] = useState(null)

  const tabs = [
    { key: 'topic', label: 'Theo chuyên đề',       icon: BookOpen },
    { key: 'live',  label: 'Buổi học trực tiếp',   icon: Tv2      },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8e] py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 text-white">
            <PlayCircle size={28} className="text-[#f5a623]" />
            <div>
              <h1 className="text-2xl font-bold">Video Bài Giảng</h1>
              <p className="text-white/70 text-sm mt-0.5">
                Xem lại bài giảng theo chuyên đề và các buổi học trực tiếp
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Body — layout 2 cột */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">

          {/* ── Cột trái: tabs + danh sách video (w-1/3) ── */}
          <div className="w-1/3 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                {tabs.map(t => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold
                          transition-colors duration-150
                          ${activeTab === t.key
                            ? 'text-[#1e3a5f] border-b-2 border-[#1e3a5f] bg-[#1e3a5f]/3'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Icon size={14} />
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {/* Nội dung tab */}
              <div className="p-3 max-h-[calc(100vh-220px)] overflow-y-auto">
                {activeTab === 'topic' ? (
                  <TabByTopic
                    selectedVideo={selectedVideo}
                    onSelectVideo={setSelectedVideo}
                  />
                ) : (
                  <TabLiveSessions
                    selectedVideo={selectedVideo}
                    onSelectVideo={setSelectedVideo}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Cột phải: player + thông tin (w-2/3) ── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <VideoPlayer video={selectedVideo} />
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
