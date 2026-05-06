import { useState, useEffect } from "react";
import {
  Users,
  FileQuestion,
  FileText,
  Activity,
  ArrowUpRight,
  GraduationCap,
} from "lucide-react";
import { getStatsTeacher } from "../../api/stats";

// ─── Stat Card Component ──────────────────────────────────────
function StatCard({ icon: Icon, label, value, colorCls, trend }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div
        className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:opacity-10 transition-opacity ${colorCls}`}
      />

      <div className="flex items-start justify-between">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorCls} text-white shadow-lg`}
        >
          <Icon size={24} />
        </div>
        {trend && (
          <span className="flex items-center text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-lg">
            <ArrowUpRight size={14} className="mr-0.5" /> {trend}
          </span>
        )}
      </div>

      <div className="mt-5">
        <p className="text-sm font-medium text-gray-400 mb-1">{label}</p>
        <h3 className="text-3xl font-extrabold text-gray-800 tracking-tight">
          {value}
        </h3>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getStatsTeacher()
      .then((d) => setData(d))
      .catch((err) =>
        setError(err.response?.data?.error || "Không thể tải dữ liệu."),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white h-40 rounded-2xl border border-gray-100"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-red-600 text-center">
        <p className="font-bold">Đã xảy ra lỗi</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl font-black text-[#1e3a5f] flex items-center gap-3">
          Chào mừng trở lại, Giáo viên! <span className="text-3xl">👋</span>
        </h1>
        <p className="text-gray-500 mt-1">
          Dưới đây là tổng quan hệ thống MathPro hôm nay.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={GraduationCap}
          label="Tổng học sinh"
          value={data.total_students}
          colorCls="bg-blue-600"
          trend="+5%"
        />
        <StatCard
          icon={FileQuestion}
          label="Ngân hàng câu hỏi"
          value={data.total_questions}
          colorCls="bg-[#f5a623]"
          trend="+12"
        />
        <StatCard
          icon={FileText}
          label="Đề thi đã tạo"
          value={data.total_exams}
          colorCls="bg-purple-600"
          trend="+2"
        />
        <StatCard
          icon={Activity}
          label="Phiên luyện tập"
          value={data.total_practice_sessions}
          colorCls="bg-green-600"
          trend="+48"
        />
      </div>

      {/* Exams Table Summary */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-[#1e3a5f]">Đề thi mới nhất</h2>
          <button className="text-xs font-bold text-blue-600 hover:underline">
            Xem tất cả
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                  Tiêu đề
                </th>
                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-center">
                  Lượt làm
                </th>
                <th className="px-8 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-center">
                  Điểm TB
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.exams?.slice(0, 5).map((exam) => (
                <tr
                  key={exam.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-8 py-4 font-semibold text-gray-700">
                    {exam.title}
                  </td>
                  <td className="px-8 py-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-bold uppercase">
                      {exam.exam_type}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-center font-bold text-[#1e3a5f]">
                    {exam.attempt_count}
                  </td>
                  <td className="px-8 py-4 text-center">
                    <span
                      className={`font-bold ${exam.avg_score >= 8 ? "text-green-500" : exam.avg_score >= 5 ? "text-yellow-600" : "text-red-400"}`}
                    >
                      {exam.avg_score?.toFixed(1) || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default TeacherDashboard;
