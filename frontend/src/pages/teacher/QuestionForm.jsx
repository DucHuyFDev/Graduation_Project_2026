import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Image as ImageIcon,
  Trash2,
  AlertCircle,
  Info,
  CheckCircle2,
  Plus,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import "mathlive"; 
import { InlineMath } from "react-katex";
import { getTopicsTree } from "../../api/topics";
import {
  createQuestion,
  updateQuestion,
  getQuestion,
  uploadImage,
} from "../../api/questions";

// === Component cho một khối nhập liệu (text hoặc formula) ===
function InputBlock({ block, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast, canDelete }) {
  const ref = useRef(null);
  const isFormula = block.type === 'formula';

  useEffect(() => {
    if (isFormula && ref.current && block.value) {
      if (ref.current.value !== block.value) {
        ref.current.setValue(block.value, { suppressionChangeNotifications: true });
      }
    }
  }, [block.value, isFormula]);

  useEffect(() => {
    if (!isFormula || !ref.current) return;
    const mf = ref.current;
    const handleInput = (e) => onChange(e.target.value);
    mf.addEventListener("input", handleInput);
    return () => mf.removeEventListener("input", handleInput);
  }, [onChange, isFormula]);

  if (isFormula) {
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-[3] min-w-0">
          <math-field
            ref={ref}
            class="w-full p-3 bg-white border-2 border-gray-100 rounded-xl focus:border-[#f5a623] outline-none transition-all"
            placeholder="Latex formula"
          />
        </div>
        <div className="flex-[1] min-w-[80px] h-14 flex items-center justify-center bg-gray-50 border-2 border-gray-100 rounded-xl px-2 overflow-hidden">
          <InlineMath math={block.value || "\\text{?}"} />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onMoveUp} disabled={isFirst} className="p-1.5 text-gray-400 hover:text-[#1e3a5f] disabled:opacity-30"><ArrowUp size={14} /></button>
          <button type="button" onClick={onMoveDown} disabled={isLast} className="p-1.5 text-gray-400 hover:text-[#1e3a5f] disabled:opacity-30"><ArrowDown size={14} /></button>
          {canDelete && <button type="button" onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-full">
      <input
        type="text"
        value={block.value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-[4] p-3 bg-white border-2 border-gray-100 rounded-xl focus:border-[#f5a623] outline-none transition-all"
        placeholder="Nhập văn bản..."
      />
      <div className="flex items-center gap-1">
        <button type="button" onClick={onMoveUp} disabled={isFirst} className="p-1.5 text-gray-400 hover:text-[#1e3a5f] disabled:opacity-30"><ArrowUp size={14} /></button>
        <button type="button" onClick={onMoveDown} disabled={isLast} className="p-1.5 text-gray-400 hover:text-[#1e3a5f] disabled:opacity-30"><ArrowDown size={14} /></button>
        {canDelete && <button type="button" onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>}
      </div>
    </div>
  );
}

// === Component quản lý nhi���u khối (text + formula) ===
function MixedInput({ blocks, onChange, canDelete = true }) {
  const addBlock = (type) => {
    const newBlocks = [...blocks, { id: Date.now().toString(), type, value: "" }];
    onChange(newBlocks);
  };

  const updateBlock = (index, value) => {
    const newBlocks = [...blocks];
    newBlocks[index].value = value;
    onChange(newBlocks);
  };

  const deleteBlock = (index) => {
    const newBlocks = blocks.filter((_, i) => i !== index);
    onChange(newBlocks);
  };

  const moveBlock = (index, direction) => {
    const newBlocks = [...blocks];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < newBlocks.length) {
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[newIndex];
      newBlocks[newIndex] = temp;
      onChange(newBlocks);
    }
  };

  return (
    <div className="space-y-2">
      {blocks.map((block, index) => (
        <InputBlock
          key={block.id}
          block={block}
          onChange={(val) => updateBlock(index, val)}
          onDelete={() => deleteBlock(index)}
          onMoveUp={() => moveBlock(index, -1)}
          onMoveDown={() => moveBlock(index, 1)}
          isFirst={index === 0}
          isLast={index === blocks.length - 1}
          canDelete={canDelete && blocks.length > 1}
        />
      ))}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={() => addBlock('text')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <Plus size={14} /> Text
        </button>
        <button type="button" onClick={() => addBlock('formula')} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <Plus size={14} /> Công thức
        </button>
      </div>
    </div>
  );
}

// Component bọc MathField để dùng trong React dễ hơn
function MathFieldInput({ value, onChange, placeholder, className = "" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && value !== undefined) {
      if (ref.current.value !== value) {
        ref.current.setValue(value, { suppressionChangeNotifications: true });
      }
    }
  }, [value]);

  useEffect(() => {
    const mf = ref.current;
    const handleInput = (e) => {
      onChange(e.target.value);
    };
    mf.addEventListener("input", handleInput);
    return () => mf.removeEventListener("input", handleInput);
  }, [onChange]);

  return (
    <math-field
      ref={ref}
      class={`w-full p-3 bg-white border-2 border-gray-100 rounded-xl focus:border-[#f5a623] outline-none transition-all ${className}`}
      placeholder={placeholder}
    />
  );
}

// Component cho T/F với preview realtime
function TFFieldInput({ value, onChange, placeholder, showPreview = true }) {
  const ref = useRef(null);
  const [latex, setLatex] = useState(value || "");

  useEffect(() => {
    if (ref.current && value !== undefined) {
      if (ref.current.value !== value) {
        ref.current.setValue(value, { suppressionChangeNotifications: true });
      }
    }
  }, [value]);

  useEffect(() => {
    const mf = ref.current;
    const handleInput = (e) => {
      const val = e.target.value;
      setLatex(val);
      onChange(val);
    };
    mf.addEventListener("input", handleInput);
    return () => mf.removeEventListener("input", handleInput);
  }, [onChange]);

  return (
    <div className="flex items-center gap-3 w-full">
      <math-field
        ref={ref}
        class="flex-1 p-3 bg-white border-2 border-gray-100 rounded-xl focus:border-[#f5a623] outline-none transition-all"
        placeholder={placeholder}
      />
      {showPreview && latex && (
        <div className="w-32 h-12 flex items-center justify-center bg-gray-50 border-2 border-gray-100 rounded-xl px-2 overflow-hidden">
          <InlineMath math={latex} />
        </div>
      )}
    </div>
  );
}

function QuestionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [topics, setTopics] = useState([]);

  // Form State
  const [qType, setQType] = useState("mcq");
  const [difficulty, setDifficulty] = useState(0.2);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState(null);

  // Question blocks (mixed text + formula)
  const [questionBlocks, setQuestionBlocks] = useState([
    { id: "1", type: "text", value: "" },
    { id: "2", type: "formula", value: "" },
  ]);

  // MCQ Options - each option has mixed blocks
  const [options, setOptions] = useState([
    { id: "a", blocks: [{ id: "1", type: "formula", value: "" }], is_correct: true },
    { id: "b", blocks: [{ id: "2", type: "formula", value: "" }], is_correct: false },
    { id: "c", blocks: [{ id: "3", type: "formula", value: "" }], is_correct: false },
    { id: "d", blocks: [{ id: "4", type: "formula", value: "" }], is_correct: false },
  ]);

  // T/F State - 4 statements a,b,c,d
  const [tfStatements, setTfStatements] = useState([
    { blocks: [{ id: "1", type: "formula", value: "" }], is_true: true },
    { blocks: [{ id: "2", type: "formula", value: "" }], is_true: false },
    { blocks: [{ id: "3", type: "formula", value: "" }], is_true: false },
    { blocks: [{ id: "4", type: "formula", value: "" }], is_true: false },
  ]);

  // SA State
  const [saAnswerBlocks, setSaAnswerBlocks] = useState([
    { id: "1", type: "formula", value: "" },
  ]);

  const loadQuestion = async () => {
    setLoading(true);
    try {
      const q = await getQuestion(id);
      setQType(q.question_type);
      setDifficulty(q.difficulty || 0.2);
      
      // Parse question blocks
      if (q.content_json && q.content_json.blocks) {
        const newBlocks = [];
        let idx = 1;
        for (const block of q.content_json.blocks) {
          if (block.content && Array.isArray(block.content)) {
            for (const item of block.content) {
              newBlocks.push({
                id: (idx++).toString(),
                type: item.type === 'math' ? 'formula' : 'text',
                value: item.value || ""
              });
            }
          }
        }
        if (newBlocks.length === 0) {
          newBlocks.push({ id: "1", type: "text", value: "" });
          newBlocks.push({ id: "2", type: "formula", value: "" });
        }
        setQuestionBlocks(newBlocks);
      }
      setImageUrl(q.image_url || "");
      setSelectedTopicId(q.topic_id || null);

      // Parse options/statements/short_answer
      if (q.question_type === "mcq" && q.options) {
        const newOpts = q.options.map((o, idx) => {
          const optBlocks = [];
          if (o.content_json && o.content_json.blocks) {
            for (const block of o.content_json.blocks) {
              if (block.content && Array.isArray(block.content)) {
                for (const item of block.content) {
                  optBlocks.push({
                    id: (optBlocks.length + 1).toString(),
                    type: item.type === 'math' ? 'formula' : 'text',
                    value: item.value || ""
                  });
                }
              }
            }
          }
          if (optBlocks.length === 0) optBlocks.push({ id: "1", type: "formula", value: "" });
          return {
            id: String.fromCharCode(97 + idx),
            blocks: optBlocks,
            is_correct: o.is_correct || false
          };
        });
        // Đảm bảo có 4 options
        while (newOpts.length < 4) {
          newOpts.push({ id: String.fromCharCode(97 + newOpts.length), blocks: [{ id: "1", type: "formula", value: "" }], is_correct: false });
        }
        setOptions(newOpts);
      } else if (q.question_type === "true_false" && q.statements) {
        const newStmts = q.statements.map((o) => {
          const optBlocks = [];
          if (o.content_json && o.content_json.blocks) {
            for (const block of o.content_json.blocks) {
              if (block.content && Array.isArray(block.content)) {
                for (const item of block.content) {
                  optBlocks.push({
                    id: (optBlocks.length + 1).toString(),
                    type: item.type === 'math' ? 'formula' : 'text',
                    value: item.value || ""
                  });
                }
              }
            }
          }
          if (optBlocks.length === 0) optBlocks.push({ id: "1", type: "formula", value: "" });
          return { blocks: optBlocks, is_true: o.is_true || false };
        });
        while (newStmts.length < 4) {
          newStmts.push({ blocks: [{ id: "1", type: "formula", value: "" }], is_true: false });
        }
        setTfStatements(newStmts);
      } else if (q.question_type === "short_answer") {
        setSaAnswerBlocks([{ id: "1", type: "formula", value: "" }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopics = async () => {
    const tree = await getTopicsTree();
    setTopics(tree);
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  useEffect(() => {
    if (isEdit && id) {
      loadQuestion();
    }
  }, [id]);

  const handleOptionChange = (idx, text) => {
    const newOpts = [...options];
    newOpts[idx].text = text;
    setOptions(newOpts);
  };

  const handleTfChange = (idx, text) => {
    const newStmts = [...tfStatements];
    newStmts[idx].text = text;
    setTfStatements(newStmts);
  };

  const toggleTfCorrect = (idx) => {
    const newStmts = [...tfStatements];
    newStmts[idx].is_true = !newStmts[idx].is_true;
    setTfStatements(newStmts);
  };

  const toggleOptionCorrect = (idx) => {
    if (qType === "mcq") {
      // Chỉ 1 đáp án đúng
      setOptions(options.map((opt, i) => ({ ...opt, is_correct: i === idx })));
    } else {
      // TF có thể nhiều đáp án đúng
      const newOpts = [...options];
      newOpts[idx].is_correct = !newOpts[idx].is_correct;
      setOptions(newOpts);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();

      // Build question content from mixed blocks
      const questionContent = questionBlocks
        .filter(b => b.value.trim())
        .map(b => ({
          type: b.type === 'formula' ? 'math' : 'text',
          value: b.value
        }));

      const contentJson = {
        blocks: [
          {
            type: "paragraph",
            content: questionContent.length > 0 ? questionContent : [{ type: "text", value: "" }]
          },
        ],
      };

      fd.append("question_type", qType);
      fd.append("difficulty", difficulty.toFixed(2));
      fd.append("content_json", JSON.stringify(contentJson));
      if (imageUrl) fd.append("image_url", imageUrl);

      // Backend chỉ hỗ trợ 1 topic_id
      if (selectedTopicId) {
        fd.append("topic_id", selectedTopicId);
      }

      if (qType === "mcq") {
        const processedOptions = options.map((opt, idx) => {
          const optContent = opt.blocks
            .filter(b => b.value.trim())
            .map(b => ({
              type: b.type === 'formula' ? 'math' : 'text',
              value: b.value
            }));
          return {
            key: String.fromCharCode(65 + idx),
            content_json: {
              blocks: [
                {
                  type: "paragraph",
                  content: optContent.length > 0 ? optContent : [{ type: "math", value: "" }]
                },
              ],
            },
            is_correct: opt.is_correct,
          };
        });
        fd.append("options", JSON.stringify(processedOptions));
      } 
      
      if (qType === "true_false") {
        const statements = tfStatements.map((stmt, idx) => {
          const stmtContent = stmt.blocks
            .filter(b => b.value.trim())
            .map(b => ({
              type: b.type === 'formula' ? 'math' : 'text',
              value: b.value
            }));
          return {
            key: String.fromCharCode(97 + idx),
            content_json: {
              blocks: [
                {
                  type: "paragraph",
                  content: stmtContent.length > 0 ? stmtContent : [{ type: "math", value: "" }]
                },
              ],
            },
            is_true: stmt.is_true,
          };
        });
        fd.append("statements", JSON.stringify(statements));
      }
      
      if (qType === "short_answer") {
        // Short answer - use blocks
        const saContent = saAnswerBlocks
          .filter(b => b.value.trim())
          .map(b => ({
            type: b.type === 'formula' ? 'math' : 'text',
            value: b.value
          }));
        fd.append("correct_answer", saContent.length > 0 ? saContent[0].value : "");
      }

      if (isEdit) {
        await updateQuestion(id, fd);
      } else {
        await createQuestion(fd);
      }
      navigate("/teacher/questions");
    } catch (e) {
      alert("Lỗi: " + (e.response?.data?.error || "Không thể lưu câu hỏi"));
    } finally {
      setLoading(false);
    }
  };

  // Helper render cây chuyên đề (radio - chỉ chọn 1)
  const renderTopicNode = (node) => (
    <div key={node.id} className="ml-6 mt-2">
      <label className="flex items-center gap-3 group cursor-pointer">
        <input
          type="radio"
          name="topic"
          value={node.id}
          checked={selectedTopicId === node.id}
          onChange={() => setSelectedTopicId(node.id)}
          className="w-5 h-5 rounded-full border-2 border-gray-200 text-[#f5a623] focus:ring-[#f5a623]"
        />
        <span
          className={`text-sm font-medium ${selectedTopicId === node.id ? "text-[#1e3a5f] font-bold" : "text-gray-500"}`}
        >
          {node.name}
        </span>
      </label>
      {node.children?.length > 0 && (
        <div className="border-l-2 border-gray-50 ml-2.5">
          {node.children.map(renderTopicNode)}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/teacher/questions")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-[#1e3a5f]" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-[#1e3a5f]">
              {isEdit ? "Chỉnh sửa câu hỏi" : "Tạo câu hỏi mới"}
            </h1>
            <p className="text-sm text-gray-400">
              Điền thông tin và nhập công thức bằng MathLive.
            </p>
          </div>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-black transition-all ${
                step === i
                  ? "bg-[#f5a623] text-white shadow-lg"
                  : step > i
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 text-gray-400"
              }`}
            >
              {step > i ? <CheckCircle2 size={20} /> : i}
            </div>
          ))}
        </div>
      </div>

      {/* STEP 1: Nội dung & Đáp án */}
      {step === 1 && (
        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                  Loại câu hỏi
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "mcq", label: "MCQ" },
                    { value: "true_false", label: "T/F" },
                    { value: "short_answer", label: "SA" },
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setQType(t.value)}
                      className={`py-2 text-xs font-bold rounded-xl border-2 transition-all ${
                        qType === t.value
                          ? "border-[#f5a623] bg-orange-50 text-[#f5a623]"
                          : "border-gray-50 text-gray-400 hover:border-gray-200"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                  Độ khó: {difficulty.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={difficulty}
                  onChange={(e) => setDifficulty(Number(e.target.value))}
                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#f5a623]"
                />
                <div className="flex justify-between mt-1 px-1">
                  <span className="text-[10px] font-bold text-gray-300">0 (Dễ)</span>
                  <span className="text-[10px] font-bold text-gray-300">1 (Khó)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                  Nội dung câu hỏi (text + công thức)
                </label>
                <MixedInput blocks={questionBlocks} onChange={setQuestionBlocks} />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase mb-2">
                  Hình ảnh đính kèm (không bắt buộc)
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          try {
                            const result = await uploadImage(file);
                            if (result.success) {
                              setImageUrl(result.image_url);
                              setImage(null);
                            }
                          } catch (err) {
                            console.error("Upload failed:", err);
                            alert("Không thể tải ảnh lên");
                          }
                        }
                      }}
                    />
                    <div className="py-8 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:bg-gray-50 transition-colors">
                      <ImageIcon size={32} className="mb-2" />
                      <span className="text-xs font-bold">
                        {imageUrl ? "Đã tải ảnh" : "Click để tải ảnh"}
                      </span>
                    </div>
                  </label>
                  {imageUrl && (
                    <div className="w-20 h-20 bg-gray-300 rounded-2xl overflow-hidden border border-gray-300 relative">
                      <img
                        src={imageUrl}
                        alt="Question"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = ""; }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImage(null);
                          setImageUrl("");
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full shadow-lg"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <h3 className="font-black text-[#1e3a5f] uppercase tracking-wider text-sm">
              Thiết lập đáp án
            </h3>

            {qType === "short_answer" ? (
              <div>
                <label className="block text-xs font-black text-gray-400 mb-2">
                  Đáp án đúng (Kết quả cuối cùng)
                </label>
                <MixedInput blocks={saAnswerBlocks} onChange={setSaAnswerBlocks} canDelete={false} />
              </div>
            ) : qType === "true_false" ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-500 mb-2">
                  Nhập 4 mệnh đề a, b, c, d và chọn Đúng/Sai cho mỗi mệnh đề:
                </p>
                {tfStatements.map((stmt, i) => (
                  <div key={i} className="w-full bg-gray-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-6 text-sm font-black text-[#1e3a5f]">
                        {String.fromCharCode(97 + i)}.
                      </span>
                      <MixedInput
                        blocks={stmt.blocks}
                        onChange={(newBlocks) => {
                          const newStmts = [...tfStatements];
                          newStmts[i].blocks = newBlocks;
                          setTfStatements(newStmts);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-6 ml-8">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`tf-${i}`}
                          checked={stmt.is_true === true}
                          onChange={() => {
                            const newStmts = [...tfStatements];
                            newStmts[i].is_true = true;
                            setTfStatements(newStmts);
                          }}
                          className="w-4 h-4 text-green-500"
                        />
                        <span className="text-xs font-bold text-green-600">Đúng</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`tf-${i}`}
                          checked={stmt.is_true === false}
                          onChange={() => {
                            const newStmts = [...tfStatements];
                            newStmts[i].is_true = false;
                            setTfStatements(newStmts);
                          }}
                          className="w-4 h-4 text-red-500"
                        />
                        <span className="text-xs font-bold text-red-600">Sai</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {options.map((opt, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase">
                        Lựa chọn {String.fromCharCode(65 + i)}
                      </label>
                      <button
                        onClick={() => toggleOptionCorrect(i)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                          opt.is_correct
                            ? "bg-green-500 text-white shadow-lg shadow-green-100"
                            : "bg-gray-300 text-gray-500"
                        }`}
                      >
                        {opt.is_correct ? "Đáp án đúng" : "Đánh dấu đúng"}
                      </button>
                    </div>
                    <MixedInput 
                      blocks={opt.blocks} 
                      onChange={(newBlocks) => {
                        const newOpts = [...options];
                        newOpts[i].blocks = newBlocks;
                        setOptions(newOpts);
                      }} 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 2: Gắn chuyên đề */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6 animate-in slide-in-from-right-4 duration-300">
          <div>
            <h3 className="text-xl font-bold text-[#1e3a5f]">Chọn chuyên đề</h3>
            <p className="text-sm text-gray-400">
              Câu hỏi này thuộc về những phần kiến thức nào?
            </p>
          </div>
          <div className="max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
            {topics.map(renderTopicNode)}
          </div>
          {!selectedTopicId && (
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={14} /> Bạn nên chọn ít nhất 1 chuyên đề.
            </p>
          )}
        </div>
      )}

      {/* STEP 3: Review & Save */}
      {step === 3 && (
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-8 animate-in slide-in-from-right-4 duration-300">
          <div>
            <h3 className="text-xl font-bold text-[#1e3a5f]">
              Kiểm tra lại lần cuối
            </h3>
            <p className="text-sm text-gray-400">
              Đảm bảo mọi thứ đã chính xác trước khi lưu vào ngân hàng.
            </p>
          </div>

          <div className="p-6 bg-gray-50 rounded-2xl space-y-4">
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-[10px] font-bold uppercase rounded">
                {qType === "true_false" ? "T/F" : qType}
              </span>
              <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] font-bold uppercase rounded">
                Độ khó: {difficulty.toFixed(2)}
              </span>
            </div>
            <div className="text-lg font-bold text-gray-800">
              {questionBlocks.map((b, i) => (
                <span key={i}>
                  {b.type === 'formula' ? <InlineMath math={b.value} /> : <span>{b.value}</span>}
                  {i < questionBlocks.length - 1 && " "}
                </span>
              ))}
            </div>
            {(image || imageUrl) && (
              <div className="w-40 h-40 rounded-xl overflow-hidden border border-white shadow-sm">
                <img
                  src={image ? URL.createObjectURL(image) : imageUrl}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {qType === "true_false" ? (
            <div className="space-y-3">
              {tfStatements.map((stmt, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border-2 flex items-center gap-3 ${stmt.is_true ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${stmt.is_true ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}
                  >
                    {String.fromCharCode(97 + i)}
                  </span>
                  <div className="flex-1 text-sm font-bold text-gray-700">
                    {stmt.blocks.map((b, bi) => (
                      <span key={bi}>
                        {b.type === 'formula' 
                          ? <InlineMath math={b.value || "\\text{?}"} />
                          : <span>{b.value || ""}</span>}
                        {bi < stmt.blocks.length - 1 && " "}
                      </span>
                    ))}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${stmt.is_true ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                    {stmt.is_true ? "ĐÚNG" : "SAI"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {options.map((opt, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-xl border-2 flex items-center gap-3 ${opt.is_correct ? "border-green-500 bg-green-50" : "border-gray-100"}`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${opt.is_correct ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
<div className="text-sm font-bold text-gray-700">
                    {opt.blocks.map((b, bi) => (
                      <span key={bi}>
                        {b.type === 'formula' 
                          ? <InlineMath math={b.value || "\\text{?}"} />
                          : <span>{b.value || ""}</span>}
                        {bi < opt.blocks.length - 1 && " "}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-400 w-full mb-1">
              CHUYÊN ĐỀ ĐÃ CHỌN:
            </span>
            {selectedTopicId ? (
              (() => {
                const findName = (list) => {
                  for (let n of list) {
                    if (n.id === selectedTopicId) return n.name;
                    if (n.children) {
                      let r = findName(n.children);
                      if (r) return r;
                    }
                  }
                };
                return (
                  <span
                    className="px-3 py-1 bg-[#1e3a5f] text-white rounded-full text-[10px] font-bold"
                  >
                    {findName(topics)}
                  </span>
                );
              })()
            ) : (
              <span className="text-xs italic text-gray-300">
                Chưa chọn chuyên đề
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          disabled={step === 1}
          onClick={() => setStep((s) => s - 1)}
          className="px-6 py-3 bg-gray-300 text-gray-700 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-400 transition-all disabled:opacity-30"
        >
          <ChevronLeft size={20} /> Quay lại
        </button>

        {step < 3 ? (
          <button
            onClick={() => {
              // Validate before moving to next step
              if (step === 1) {
                // Validate question content - ALL blocks must have data
                const questionBlocksFilled = questionBlocks.every(b => b.value.trim());
                if (!questionBlocksFilled) {
                  alert("Vui lòng nhập đầy đủ nội dung câu hỏi (tất cả các ô nhập liệu)!");
                  return;
                }
                
                // Validate answers based on question type
                if (qType === 'mcq') {
                  // ALL options and ALL blocks in each option must have data
                  const allOptionsFilled = options.every(opt => 
                    opt.blocks.every(b => b.value.trim())
                  );
                  const hasCorrectAnswer = options.some(opt => opt.is_correct);
                  if (!allOptionsFilled) {
                    alert("Vui lòng nhập đầy đủ nội dung cho TẤT CẢ các lựa chọn!");
                    return;
                  }
                  if (!hasCorrectAnswer) {
                    alert("Vui lòng chọn đáp án đúng!");
                    return;
                  }
                } else if (qType === 'true_false') {
                  // ALL statements and ALL blocks in each statement must have data
                  const allStatementsFilled = tfStatements.every(stmt => 
                    stmt.blocks.every(b => b.value.trim())
                  );
                  if (!allStatementsFilled) {
                    alert("Vui lòng nhập đầy đủ nội dung cho TẤT CẢ các mệnh đề!");
                    return;
                  }
                } else if (qType === 'short_answer') {
                  // ALL blocks in answer must have data
                  const answerFilled = saAnswerBlocks.every(b => b.value.trim());
                  if (!answerFilled) {
                    alert("Vui lòng nhập đầy đủ đáp án!");
                    return;
                  }
                }
              }
              
              if (step === 2) {
                if (!selectedTopicId) {
                  alert("Vui lòng chọn ít nhất một chuyên đề!");
                  return;
                }
              }
              
              setStep((s) => s + 1);
            }}
            className="px-8 py-3 bg-[#1e3a5f] text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-[#162a45] transition-all shadow-lg"
          >
            Tiếp tục <ChevronRight size={20} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-10 py-3 bg-green-500 text-white rounded-2xl font-black flex items-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-green-100 active:scale-95 disabled:opacity-50"
          >
            {loading
              ? "Đang lưu..."
              : isEdit
                ? "Lưu thay đổi"
                : "Hoàn tất & Lưu"}{" "}
            <Save size={20} />
          </button>
        )}
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        
        /* Fix Visual Feedback Bug cho math-field */
        math-field {
          --caret-color: #1e3a5f;
          --selection-background-color: rgba(245, 166, 35, 0.3);
          --selection-color: #1e3a5f;
        }
        
        math-field::part(virtual-keyboard-toggle),
        math-field::part(virtual-keyboard) {
          display: none !important;
        }
        
        math-field *::selection {
          background: rgba(245, 166, 35, 0.3) !important;
          color: inherit !important;
        }
        
        math-field:focus-within {
          box-shadow: 0 0 0 3px rgba(245, 166, 35, 0.3) !important;
        }
        
        math-field::part(content) { 
          font-size: 1.1rem; 
        }
      `}</style>
    </div>
  );
}

export default QuestionForm;
