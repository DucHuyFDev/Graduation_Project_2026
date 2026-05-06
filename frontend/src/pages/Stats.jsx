import { useState, useEffect } from 'react'
import { Flame, BookOpen, Trophy, Clock, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import {
  Chart as ChartJS,
  RadarController, LineController, BarController,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, RadialLinearScale, Filler, Tooltip, Legend
} from 'chart.js'
import { Radar, Line, Bar } from 'react-chartjs-2'
import { getStatsMe } from '../api/stats'

// Đăng ký tất cả chart components cần dùng
ChartJS.register(
  RadarController, LineController, BarController,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, RadialLinearScale, Filler, Tooltip, Legend
)

// ─── Helpers ──────────────────────────────────────────────────
/** Màu progress bar theo % */
function progressColor(percent) {
  if (percent > 60) return 'bg-green-500'
  if (percent < 10) return 'bg-red-500'
  return 'bg-yellow-500'
}

/** Relative time bằng Intl */
function relativeTime(isoStr) {
  const diff = (new Date(isoStr) - Date.now()) / 1000
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })
  const abs = Math.abs(diff)
  if (abs < 60) return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

// ─── Loading Skeleton ──────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
      <div className="h-8 w-16 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-32 bg-gray-100 rounded" />
    </div>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, colorCls = 'bg-blue-50 text-blue-600' }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 items-start">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function Stats() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStatsMe()
      .then(d => setData(d))
      .catch(err => setError(err.response?.data?.error || 'Không thể tải thống kê.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="h-8 w-48 bg-gray-200 rounded mb-6 animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 h-64 animate-pulse">
                <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
                <div className="h-48 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <div className="bg-white rounded-2xl p-8 text-center max-w-sm shadow-sm border border-gray-100">
          <p className="text-red-500 mb-2 font-medium">Không thể tải thống kê</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Chuẩn bị data fallback an toàn
  const {
    streak = 0,
    topic_completion = [],
    strong_topics = [],
    weak_topics = [],
    exam_scores_history = [],
    topic_radar = [],
    daily_activity = [],
    total_study_hours = 0,
    recent_activity = [],
  } = data ?? {}

  const lastExamScore = exam_scores_history[0]?.score ?? null
  const totalDone = topic_completion.reduce((s, t) => s + (t.done ?? 0), 0)

  // ─── Radar chart data ─────────────────────────────────────
  const radarData = {
    labels: topic_radar.map(t => t.name),
    datasets: [{
      label: 'Tỉ lệ đúng',
      data: topic_radar.map(t => Math.round((t.correct_rate ?? 0) * 100)),
      backgroundColor: 'rgba(30, 58, 95, 0.15)',
      borderColor: '#1e3a5f',
      borderWidth: 2,
      pointBackgroundColor: '#f5a623',
      pointBorderColor: '#fff',
      pointRadius: 4,
    }],
  }

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0, max: 100,
        ticks: { stepSize: 25, font: { size: 10 } },
        pointLabels: { font: { size: 11 }, color: '#374151' },
        grid: { color: '#e5e7eb' },
      },
    },
    plugins: { legend: { display: false } },
  }

  // ─── Line chart data (điểm thi) ────────────────────────────
  const reversedExams = [...exam_scores_history].reverse()
  const lineData = {
    labels: reversedExams.map(e => e.date),
    datasets: [{
      label: 'Điểm',
      data: reversedExams.map(e => e.score ?? 0),
      borderColor: '#f5a623',
      backgroundColor: 'rgba(245,166,35,0.1)',
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
      pointBackgroundColor: '#f5a623',
      pointRadius: 5,
    }],
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { min: 0, max: 10, ticks: { stepSize: 2 }, grid: { color: '#f3f4f6' } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
    plugins: { legend: { display: false } },
  }

  // ─── Bar chart data (hoạt động hàng ngày) ─────────────────
  const barData = {
    labels: daily_activity.map(d => {
      const dt = new Date(d.date)
      return `${dt.getDate()}/${dt.getMonth() + 1}`
    }),
    datasets: [{
      label: 'Bài làm',
      data: daily_activity.map(d => d.count ?? 0),
      backgroundColor: '#1e3a5f',
      borderRadius: 6,
      hoverBackgroundColor: '#f5a623',
    }],
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }, grid: { color: '#f3f4f6' } },
      x: { grid: { display: false } },
    },
    plugins: { legend: { display: false } },
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-[#1e3a5f]">Thống kê học tập</h1>
          <p className="text-gray-500 mt-1">Theo dõi tiến độ và năng lực của bạn theo thời gian.</p>
        </div>

        {/* ── Hàng 1: 4 KPI cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <KpiCard
            icon={Flame}
            label="Streak"
            value={streak}
            sub={`${streak > 0 ? 'ngày liên tiếp 🔥' : 'Bắt đầu hôm nay!'}`}
            colorCls="bg-orange-50 text-orange-500"
          />
          <KpiCard
            icon={BookOpen}
            label="Tổng bài đã làm"
            value={totalDone}
            sub="câu luyện tập"
            colorCls="bg-blue-50 text-[#1e3a5f]"
          />
          <KpiCard
            icon={Trophy}
            label="Điểm thi gần nhất"
            value={lastExamScore !== null ? `${lastExamScore}/10` : '—'}
            sub={lastExamScore !== null ? exam_scores_history[0]?.title : 'Chưa thi lần nào'}
            colorCls="bg-amber-50 text-amber-600"
          />
          <KpiCard
            icon={Clock}
            label="Thời gian học"
            value={`${total_study_hours}h`}
            sub="tổng cộng"
            colorCls="bg-green-50 text-green-600"
          />
        </div>

        {/* ── Hàng 2: Radar + Line chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Radar */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-[#1e3a5f] text-sm mb-4 flex items-center gap-2">
              <Activity size={15} /> Năng lực theo chuyên đề
            </h2>
            <div style={{ height: '240px' }}>
              {topic_radar.length > 0
                ? <Radar data={radarData} options={radarOptions} />
                : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Chưa có dữ liệu</div>
              }
            </div>
          </div>

          {/* Line chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-[#1e3a5f] text-sm mb-4 flex items-center gap-2">
              <TrendingUp size={15} /> Điểm thi theo thời gian
            </h2>
            <div style={{ height: '240px' }}>
              {reversedExams.length > 0
                ? <Line data={lineData} options={lineOptions} />
                : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Chưa có lần thi nào</div>
              }
            </div>
          </div>
        </div>

        {/* ── Hàng 3: Strong/Weak + Bar chart ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
          {/* Strong & Weak */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-[#1e3a5f] text-sm mb-4">Điểm mạnh & điểm yếu</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-green-600 flex items-center gap-1 mb-2">
                  <TrendingUp size={12} /> Chuyên đề nổi bật
                </p>
                <div className="space-y-1.5">
                  {strong_topics.length > 0 ? strong_topics.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-green-50 rounded-lg px-3 py-1.5">
                      <span className="text-sm text-gray-700 truncate max-w-[70%]">{t.name}</span>
                      <span className="text-xs font-bold text-green-600">{t.percent}%</span>
                    </div>
                  )) : <p className="text-gray-400 text-xs">Chưa có dữ liệu</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mb-2">
                  <TrendingDown size={12} /> Cần cải thiện
                </p>
                <div className="space-y-1.5">
                  {weak_topics.length > 0 ? weak_topics.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-3 py-1.5">
                      <span className="text-sm text-gray-700 truncate max-w-[70%]">{t.name}</span>
                      <span className="text-xs font-bold text-red-500">{t.percent}%</span>
                    </div>
                  )) : <p className="text-gray-400 text-xs">Chưa có dữ liệu</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-[#1e3a5f] text-sm mb-4 flex items-center gap-2">
              <Activity size={15} /> Bài làm 7 ngày gần nhất
            </h2>
            <div style={{ height: '220px' }}>
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>

        {/* ── Hàng 4: Progress bars từng chuyên đề ── */}
        {topic_completion.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-5">
            <h2 className="font-bold text-[#1e3a5f] text-sm mb-4">Tiến độ từng chuyên đề</h2>
            <div className="space-y-3">
              {topic_completion.map(t => (
                <div key={t.topic_id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700 font-medium truncate max-w-[70%]">{t.name}</span>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{t.correct}/{t.done} câu</span>
                      <span className={`font-bold ${t.percent > 60 ? 'text-green-600' : t.percent < 10 ? 'text-red-500' : 'text-yellow-600'}`}>
                        {t.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${progressColor(t.percent)}`}
                      style={{ width: `${t.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Hàng 5: Timeline hoạt động gần nhất ── */}
        {recent_activity.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-bold text-[#1e3a5f] text-sm mb-4">Hoạt động gần nhất</h2>
            <div className="space-y-3">
              {recent_activity.map((act, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm ${act.type === 'practice' ? 'bg-blue-50 text-[#1e3a5f]' : 'bg-amber-50 text-amber-600'}`}>
                    {act.type === 'practice' ? '📖' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{act.label}</p>
                    <p className="text-xs text-gray-400">
                      {act.type === 'practice' ? 'Luyện tập' : 'Làm đề thi'} · {relativeTime(act.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Stats
