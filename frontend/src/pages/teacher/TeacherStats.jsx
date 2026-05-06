import { useState, useEffect } from 'react'
import {
  Users, FileQuestion, FileText, Activity,
  TrendingUp, BarChart2, BookOpen, Award
} from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, LineController, BarController,
  ArcElement, DoughnutController,
  Tooltip, Legend, Filler
} from 'chart.js'
import { Bar, Doughnut } from 'react-chartjs-2'
import { getStatsTeacher } from '../../api/stats'

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, LineController, BarController,
  ArcElement, DoughnutController,
  Tooltip, Legend, Filler
)

// ─── KPI Card ─────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, colorCls }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex gap-4 items-center">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorCls}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-2xl font-extrabold text-gray-800 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const EXAM_TYPE_LABEL = {
  topic: 'Test chuyên đề',
  midterm: 'Giữa kỳ',
  final: 'Cuối kỳ',
  graduation: 'Thi thử TNTHPT',
}

const Q_TYPE_LABEL = {
  mcq: 'Trắc nghiệm',
  true_false: 'Đúng / Sai',
  short_answer: 'Điền số',
}

function TeacherStatsComponent() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStatsTeacher()
      .then(d => setData(d))
      .catch(err => setError(err.response?.data?.error || 'Không thể tải dữ liệu.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white h-24 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white h-64 rounded-2xl border border-gray-100" />
          <div className="bg-white h-64 rounded-2xl border border-gray-100" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 text-center">
        <p className="font-bold">Đã xảy ra lỗi</p>
        <p className="text-sm">{error}</p>
      </div>
    )
  }

  const {
    total_students = 0, total_questions = 0, total_exams = 0,
    total_practice_sessions = 0, total_attempts = 0,
    global_avg_score = null, daily_activity = [],
    question_type_dist = [], top_exams = [],
  } = data ?? {}

  // ─── Bar chart: hoạt động 30 ngày ────────────────────────────
  // Chỉ lấy 14 ngày để không quá dày
  const last14 = daily_activity.slice(-14)
  const barData = {
    labels: last14.map(d => {
      const dt = new Date(d.date)
      return `${dt.getDate()}/${dt.getMonth() + 1}`
    }),
    datasets: [
      {
        label: 'Làm đề thi',
        data: last14.map(d => d.exam_count),
        backgroundColor: '#1e3a5f',
        borderRadius: 5,
        stack: 'a',
      },
      {
        label: 'Luyện tập',
        data: last14.map(d => d.practice_count),
        backgroundColor: '#f5a623',
        borderRadius: 5,
        stack: 'a',
      },
    ],
  }
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12 } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f3f4f6' } },
      x: { grid: { display: false } },
    },
  }

  // ─── Doughnut chart: phân bố loại câu hỏi ───────────────────
  const doughnutData = {
    labels: question_type_dist.map(d => Q_TYPE_LABEL[d.type] ?? d.type),
    datasets: [{
      data: question_type_dist.map(d => d.count),
      backgroundColor: ['#1e3a5f', '#f5a623', '#10b981'],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  }
  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 14 } },
    },
    cutout: '65%',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#1e3a5f]">Thống kê hệ thống</h1>
        <p className="text-gray-400 text-sm mt-1">Tổng quan hoạt động học tập trên MathPro.</p>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={Users} label="Tổng học sinh" value={total_students} sub="đã đăng ký" colorCls="bg-blue-600" />
        <KpiCard icon={FileQuestion} label="Ngân hàng câu hỏi" value={total_questions} sub="câu hỏi" colorCls="bg-[#f5a623]" />
        <KpiCard icon={FileText} label="Đề thi đã tạo" value={total_exams} sub="đề thi" colorCls="bg-purple-600" />
        <KpiCard icon={BookOpen} label="Phiên luyện tập" value={total_practice_sessions} sub="phiên" colorCls="bg-green-600" />
        <KpiCard icon={Award} label="Lượt làm đề" value={total_attempts} sub="lần nộp bài" colorCls="bg-red-500" />
        <KpiCard
          icon={TrendingUp}
          label="Điểm thi trung bình"
          value={global_avg_score != null ? `${global_avg_score}/10` : '—'}
          sub="toàn hệ thống"
          colorCls="bg-indigo-600"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Bar stacked 14 ngày */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-[#1e3a5f] text-sm mb-4 flex items-center gap-2">
            <BarChart2 size={15} /> Hoạt động 14 ngày gần nhất
          </h2>
          <div style={{ height: '220px' }}>
            {last14.length > 0
              ? <Bar data={barData} options={barOptions} />
              : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Chưa có dữ liệu</div>
            }
          </div>
        </div>

        {/* Doughnut loại câu hỏi */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-[#1e3a5f] text-sm mb-4 flex items-center gap-2">
            <Activity size={15} /> Phân bố loại câu hỏi
          </h2>
          <div style={{ height: '220px' }}>
            {question_type_dist.length > 0
              ? <Doughnut data={doughnutData} options={doughnutOptions} />
              : <div className="flex items-center justify-center h-full text-gray-400 text-sm">Chưa có dữ liệu</div>
            }
          </div>
        </div>
      </div>

      {/* ── Top exams bảng ── */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-[#1e3a5f]">Top đề thi có nhiều lượt làm nhất</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">#</th>
                <th className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Tiêu đề</th>
                <th className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Lượt làm</th>
                <th className="px-6 py-3 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Điểm TB</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {top_exams.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">Chưa có đề thi nào.</td>
                </tr>
              ) : top_exams.map((exam, i) => (
                <tr key={exam.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-gray-300 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-semibold text-gray-700 text-sm max-w-[200px] truncate">{exam.title}</td>
                  <td className="px-6 py-3">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase">
                      {EXAM_TYPE_LABEL[exam.exam_type] ?? exam.exam_type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center font-bold text-[#1e3a5f]">{exam.attempt_count}</td>
                  <td className="px-6 py-3 text-center">
                    <span className={`font-bold text-sm ${
                      exam.avg_score === null ? 'text-gray-400'
                      : exam.avg_score >= 8 ? 'text-green-600'
                      : exam.avg_score >= 5 ? 'text-yellow-600'
                      : 'text-red-500'
                    }`}>
                      {exam.avg_score != null ? `${exam.avg_score}/10` : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default TeacherStatsComponent
