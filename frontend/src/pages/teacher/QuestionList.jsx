import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  AlertCircle,
} from "lucide-react";
import { getQuestions, deleteQuestion } from "../../api/questions";
import { getTopicsTree } from "../../api/topics";
import MathRenderer from "../../components/MathRenderer";

function QuestionList() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [topics, setTopics] = useState([]);

  // Filters
  const [searchId, setSearchId] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedType, setSelectedType] = useState("");

  // Modal Preview
  const [previewQuestion, setPreviewQuestion] = useState(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);

  useEffect(() => {
    fetchTopics();
    loadData();
  }, [page, selectedTopic, selectedType]);

  const fetchTopics = async () => {
    try {
      const tree = await getTopicsTree();
      setTopics(tree);
    } catch (e) {}
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        question_type: selectedType || undefined,
        topic_id: selectedTopic || undefined,
      };
      // Map frontend type values to backend values
      if (selectedType === 'tf') {
        params.question_type = 'tf';
      } else if (selectedType === 'sa') {
        params.question_type = 'sa';
      }
      if (searchId.trim()) {
        params.q = searchId.trim();
      }
      const res = await getQuestions(params);
      setQuestions(res.results || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      setPage(1);
      loadData();
    }
  };

  const handleDelete = async () => {
    if (!showConfirmDelete) return;
    try {
      await deleteQuestion(showConfirmDelete);
      setShowConfirmDelete(null);
      loadData();
    } catch (e) {
      alert("Không thể xóa câu hỏi này.");
    }
  };

  // Flatten topics for select
  const flatTopics = [];
  const flatten = (items, level = 0) => {
    items.forEach((item) => {
      flatTopics.push({ id: item.id, name: item.name, level });
      if (item.children) flatten(item.children, level + 1);
    });
  };
  flatten(topics);

  const getTypeBadge = (type) => {
    const maps = {
      mcq: { label: "Trắc nghiệm", cls: "bg-blue-100 text-blue-600" },
      true_false: { label: "Đúng/Sai", cls: "bg-purple-100 text-purple-600" },
      short_answer: { label: "Trả lời ngắn", cls: "bg-orange-100 text-orange-600" },
    };
    const cfg = maps[type] || { label: type, cls: "bg-gray-100 text-gray-600" };
    return (
      <span
        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cfg.cls}`}
      >
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-[#1e3a5f]">
          Ngân hàng câu hỏi
        </h1>
        <button
          onClick={() => navigate("/teacher/questions/add")}
          className="bg-[#f5a623] hover:bg-[#e09410] text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-200 transition-all active:scale-95"
        >
          <Plus size={20} /> Thêm câu hỏi mới
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Tìm theo nội dung hoặc ID..."
            className="w-full pl-10 pr-4 py-2 bg-gray-200 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#f5a623]"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            onKeyDown={handleSearch}
          />
        </div>

        <select
          className="bg-gray-200 border-none rounded-xl text-sm px-4 py-2 focus:ring-2 focus:ring-[#f5a623]"
          value={selectedTopic}
          onChange={(e) => {
            setSelectedTopic(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả chuyên đề</option>
          {flatTopics.map((t) => (
            <option key={t.id} value={t.id}>
              {"\u00A0".repeat(t.level * 2)}
              {t.name}
            </option>
          ))}
        </select>

        <select
          className="bg-gray-200 border-none rounded-xl text-sm px-4 py-2 focus:ring-2 focus:ring-[#f5a623]"
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả loại câu</option>
          <option value="mcq">Trắc nghiệm (MCQ)</option>
          <option value="tf">Đúng / Sai (TF)</option>
          <option value="sa">Trả lời ngắn (SA)</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider w-16">
                  ID
                </th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                  Nội dung câu hỏi
                </th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-center">
                  Độ khó
                </th>
                <th className="px-6 py-4 text-xs font-black text-gray-400 uppercase tracking-wider text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-20 text-center text-gray-400">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : questions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-20 text-center text-gray-400">
                    Không tìm thấy câu hỏi nào.
                  </td>
                </tr>
              ) : (
                questions.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-gray-50/50 transition-colors group"
                  >
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">
                      #{q.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="line-clamp-2 text-sm font-medium text-gray-700">
                        <MathRenderer content={q.content_json} />
                      </div>
                      {q.topic_name && (
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">
                          {q.topic_name}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(q.question_type)}
                    </td>
                    <td className="px-6 py-4 w-32">
                      <div className="flex flex-col gap-1 items-center">
                        <span className="text-[10px] font-bold text-gray-500">
                          Mức {Math.round(q.difficulty * 5) || 1}
                        </span>
                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${q.difficulty * 5 <= 2 ? "bg-green-400" : q.difficulty * 5 <= 4 ? "bg-yellow-400" : "bg-red-400"}`}
                            style={{ width: `${(q.difficulty || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setPreviewQuestion(q)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Xem trước"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/teacher/questions/${q.id}/edit`)
                          }
                          className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                          title="Sửa"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => setShowConfirmDelete(q.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-50 flex items-center justify-between">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Tổng: <span className="text-gray-700">{total}</span> câu hỏi
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center px-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <span className="text-sm font-black text-[#1e3a5f]">{page}</span>
              <span className="mx-1 text-gray-300">/</span>
              <span className="text-xs font-bold text-gray-400">
                {Math.ceil(total / 20) || 1}
              </span>
            </div>
            <button
              disabled={page >= Math.ceil(total / 20)}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-xl border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white transition-all shadow-sm"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Preview */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1e3a5f]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-black text-[#1e3a5f] flex items-center gap-2">
                <Eye size={20} className="text-[#f5a623]" /> Xem trước câu hỏi #
                {previewQuestion.id}
              </h3>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {getTypeBadge(previewQuestion.question_type)}
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter">
                    Chuyên đề: {previewQuestion.topic_name}
                  </span>
                </div>
                <div className="text-lg font-bold text-gray-800 leading-relaxed">
                  <MathRenderer content={previewQuestion.content_json} />
                </div>
                {previewQuestion.image_url && (
                  <div className="rounded-2xl overflow-hidden border border-gray-100 max-w-md mx-auto">
                    <img
                      src={previewQuestion.image_url}
                      alt="Question"
                      className="w-full h-auto"
                    />
                  </div>
                )}
              </div>

              {/* Options Preview */}
              {previewQuestion.question_type === "mcq" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
                  {previewQuestion.options?.map((opt, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-2xl border-2 flex items-center gap-3 ${opt.is_correct ? "border-green-500 bg-green-50/30" : "border-gray-100 bg-gray-50/50"}`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${opt.is_correct ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <div className="text-sm font-semibold text-gray-700">
                        <MathRenderer content={opt.content_json} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-900/20 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Xác nhận xóa?
            </h3>
            <p className="text-gray-500 text-sm mb-8">
              Hành động này sẽ xóa mềm câu hỏi. Bạn vẫn có thể khôi phục từ DB
              nếu cần.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="flex-1 py-3 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold rounded-2xl transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200 transition-all"
              >
                Xóa luôn
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}

export default QuestionList;
