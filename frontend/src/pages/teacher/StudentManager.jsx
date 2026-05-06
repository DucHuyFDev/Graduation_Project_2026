import { useState, useEffect } from "react"
import {
  Search, Eye, X, ChevronLeft, ChevronRight,
  Users, BookOpen, TrendingUp, Award
} from "lucide-react"
import { getStudents } from "../../api/stats"

function StudentManager() {
  const [students, setStudents] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState(null)

  useEffect(() => { loadStudents() }, [page])

  const loadStudents = async () => {
    setLoading(true)
    try {
      const params = { page }
      if (search.trim()) params.q = search.trim()
      const res = await getStudents(params)
      setStudents(res.results || res || [])
      setTotal(res.total || (res.results || res || []).length)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSearch = e => { if (e.key === 'Enter') { setPage(1); loadStudents() } }
  const totalPages = Math.ceil(total / 20) || 1

  const getDiffColor = (val) => {
    if (!val) return 'text-gray-400'
    if (val >= 0.7) return 'text-green-600'
    if (val >= 0.4) return 'text-yellow-600'
    return 'text-red-500'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-[#1e3a5f]">Quản lý học sinh</h1>
        <span className="text-sm text-gray-400 font-medium">{total} học sinh đã đăng ký</span>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tổng học sinh", value: total, icon: Users, color: "blue" },
          { label: "Đang học", value: students.filter(s => s.practice_count > 0).length, icon: BookOpen, color: "green" },
          { label: "Đã làm bài thi", value: students.filter(s => s.exam_count > 0).length, icon: Award, color: "orange" },
          { label: "Điểm TB cao nhất", value: Math.max(0, ...students.map(s => s.avg_score || 0)).toFixed(1) + "%", icon: TrendingUp, color: "purple" },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${
              stat.color === 'blue' ? 'bg-blue-50' : stat.color === 'green' ? 'bg-green-50' : stat.color === 'orange' ? 'bg-orange-50' : 'bg-purple-50'
            }`}>
              <stat.icon size={20} className={
                stat.color === 'blue' ? 'text-blue-500' : stat.color === 'green' ? 'text-green-500' : stat.color === 'orange' ? 'text-orange-500' : 'text-purple-500'
              }/>
            </div>
            <p className="text-xl font-black text-[#1e3a5f]">{stat.value}</p>
            <p className="text-xs text-gray-400 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Tìm tên học sinh, email... (Enter để tìm)"
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#f5a623] focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">Học sinh</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Luyện tập</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Bài thi</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-center">Điểm TB</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5} className="p-20 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={5} className="p-20 text-center text-gray-400">Không có học sinh nào.</td></tr>
            ) : students.map(s => (
              <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1e3a5f] to-[#2c5282] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {(s.username || s.email || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{s.username || s.email}</p>
                      {s.email && s.username && <p className="text-xs text-gray-400">{s.email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-bold text-gray-700">{s.practice_count || 0}</span>
                  <span className="text-xs text-gray-400"> phiên</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-bold text-gray-700">{s.exam_count || 0}</span>
                  <span className="text-xs text-gray-400"> bài</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`text-sm font-bold ${getDiffColor(s.avg_score)}`}>
                    {s.avg_score != null ? (s.avg_score * 100).toFixed(1) + '%' : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => setSelectedStudent(s)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Eye size={18}/>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400">Tổng: <span className="text-gray-700">{total}</span> học sinh</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-white transition-all">
              <ChevronLeft size={18}/>
            </button>
            <div className="flex items-center px-4 bg-white border border-gray-200 rounded-xl text-sm font-bold text-[#1e3a5f]">
              {page} / {totalPages}
            </div>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30 hover:bg-white transition-all">
              <ChevronRight size={18}/>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Chi tiết học sinh */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a5f]/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-[#1e3a5f]">Thông tin học sinh</h3>
              <button onClick={() => setSelectedStudent(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-400"/>
              </button>
            </div>
            <div className="p-8 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#2c5282] flex items-center justify-center text-white font-black text-2xl">
                  {(selectedStudent.username || selectedStudent.email || '?')[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-xl font-black text-[#1e3a5f]">{selectedStudent.username}</p>
                  {selectedStudent.email && <p className="text-sm text-gray-400">{selectedStudent.email}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-blue-600">{selectedStudent.practice_count || 0}</p>
                  <p className="text-xs text-blue-500">Luyện tập</p>
                </div>
                <div className="bg-orange-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-orange-600">{selectedStudent.exam_count || 0}</p>
                  <p className="text-xs text-orange-500">Bài thi</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-green-600">
                    {selectedStudent.avg_score != null ? (selectedStudent.avg_score * 100).toFixed(0) + '%' : '—'}
                  </p>
                  <p className="text-xs text-green-500">Điểm TB</p>
                </div>
              </div>

              {selectedStudent.joined_at && (
                <p className="text-xs text-gray-400 text-center">
                  Tham gia: {new Date(selectedStudent.joined_at).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StudentManager
