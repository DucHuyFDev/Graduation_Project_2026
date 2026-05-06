import { useState } from 'react'
import { CheckCircle, XCircle, Check, X, ChevronRight } from 'lucide-react'
import MathRenderer from './MathRenderer'

// ─── Màu option sau khi submit ────────────────────────────────
function getMCQOptionClass(key, selected, correctAnswer, submitted) {
  if (!submitted) {
    return selected === key
      ? 'border-[#1e3a5f] bg-blue-50'
      : 'border-gray-200 hover:border-[#1e3a5f]/40 hover:bg-gray-50'
  }
  if (key === correctAnswer) return 'border-green-500 bg-green-50'
  if (key === selected && key !== correctAnswer) return 'border-red-400 bg-red-50'
  return 'border-gray-200 bg-white'
}

// ─── Nhãn chữ cái A B C D ─────────────────────────────────────
function OptionBadge({ label, selected, correct, wrong }) {
  let cls = 'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border-2 '
  if (correct) cls += 'bg-green-500 border-green-500 text-white'
  else if (wrong) cls += 'bg-red-400 border-red-400 text-white'
  else if (selected) cls += 'bg-[#1e3a5f] border-[#1e3a5f] text-white'
  else cls += 'border-gray-300 text-gray-500'
  return <div className={cls}>{label}</div>
}

// ─── Badge loại câu hỏi & độ khó ─────────────────────────────
function TypeBadge({ type }) {
  const map = { mcq: ['TRẮC NGHIỆM', 'text-blue-700 bg-blue-50 border-blue-200'], true_false: ['ĐÚNG / SAI', 'text-purple-700 bg-purple-50 border-purple-200'], short_answer: ['TRẢ LỜI NGẮN', 'text-orange-700 bg-orange-50 border-orange-200'] }
  const [label, cls] = map[type] ?? ['?', '']
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>{label}</span>
}

function DiffBadge({ difficulty }) {
  if (difficulty == null) return null
  const d = parseFloat(difficulty)
  let label, cls
  if (d <= 0.35) { label = 'DỄ'; cls = 'text-green-700 bg-green-50 border-green-200' }
  else if (d <= 0.65) { label = 'TRUNG BÌNH'; cls = 'text-yellow-700 bg-yellow-50 border-yellow-200' }
  else { label = 'KHÓ'; cls = 'text-red-700 bg-red-50 border-red-200' }
  return <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cls}`}>{label}</span>
}

// ═══════════════════════════════════════════════════════════════
// MCQ — Trắc nghiệm
// ═══════════════════════════════════════════════════════════════
function MCQCard({ question, onSubmit, showResult, result }) {
  const [selected, setSelected] = useState(null)
  const submitted = showResult && result

  const handleConfirm = () => {
    if (!selected || submitted) return
    onSubmit({ selected })
  }

  return (
    <div className="space-y-3">
      {(question.options ?? []).map((opt) => {
        const key = opt.option_key
        const isCorrect = submitted && key === result.correct_answer
        const isWrong = submitted && key === selected && key !== result.correct_answer

        return (
          <div
            key={key}
            onClick={() => !submitted && setSelected(key)}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 ${getMCQOptionClass(key, selected, result?.correct_answer, submitted)}`}
          >
            <OptionBadge
              label={key}
              selected={selected === key}
              correct={isCorrect}
              wrong={isWrong}
            />
            <span className="flex-1 text-gray-800 text-sm">
              <MathRenderer content={opt.content_json} />
            </span>
            {isCorrect && <CheckCircle size={18} className="text-green-500 flex-shrink-0" />}
            {isWrong && <XCircle size={18} className="text-red-400 flex-shrink-0" />}
          </div>
        )
      })}

      {!submitted && (
        <button
          onClick={handleConfirm}
          disabled={!selected}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mt-2 ${selected ? 'bg-[#1e3a5f] text-white hover:bg-[#2c5282]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          Xác nhận trả lời
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// TRUE/FALSE — Đúng/Sai
// ═══════════════════════════════════════════════════════════════
function TFCard({ question, onSubmit, showResult, result }) {
  const [tfAnswers, setTfAnswers] = useState({}) // { a: true/false, b: ... }
  const submitted = showResult && result
  const statements = question.statements ?? []

  const allAnswered = statements.length > 0 && statements.every(s => tfAnswers[s.statement_key] !== undefined)

  const handleToggle = (key, value) => {
    if (submitted) return
    setTfAnswers(prev => ({ ...prev, [key]: value }))
  }

  const handleConfirm = () => {
    if (!allAnswered || submitted) return
    onSubmit({ answers: tfAnswers })
  }

  // Đếm số ý đúng sau khi submit
  const correctCount = submitted
    ? statements.filter(s => result.per_statement?.[s.statement_key] === true).length
    : 0

  return (
    <div className="space-y-3">
      {statements.map((st) => {
        const key = st.statement_key
        const isStmtCorrect = submitted && result.per_statement?.[key] === true

        let rowCls = 'rounded-xl border-2 p-4 transition-all duration-150 '
        if (submitted) rowCls += isStmtCorrect ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'
        else rowCls += 'border-gray-200'

        return (
          <div key={key} className={rowCls}>
            <div className="flex items-start gap-3 mb-3">
              <span className="w-6 h-6 rounded-full bg-[#1e3a5f] text-white text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {key.toUpperCase()}
              </span>
              <span className="text-sm text-gray-800 flex-1">
                <MathRenderer content={st.content_json} />
              </span>
              {submitted && (
                isStmtCorrect
                  ? <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                  : <XCircle size={16} className="text-red-400 flex-shrink-0" />
              )}
            </div>
            <div className="flex gap-2 ml-9">
              <button
                onClick={() => handleToggle(key, true)}
                disabled={submitted}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${!submitted && tfAnswers[key] === true ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:border-green-300'}`}
              >
                <Check size={14} /> Đúng
              </button>
              <button
                onClick={() => handleToggle(key, false)}
                disabled={submitted}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${!submitted && tfAnswers[key] === false ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-600 hover:border-red-300'}`}
              >
                <X size={14} /> Sai
              </button>
            </div>
          </div>
        )
      })}

      {submitted && (
        <p className="text-center text-sm font-medium text-gray-600">
          Đúng <span className="text-green-600 font-bold">{correctCount}</span>/{statements.length} ý
        </p>
      )}

      {!submitted && (
        <button
          onClick={handleConfirm}
          disabled={!allAnswered}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all mt-2 ${allAnswered ? 'bg-[#1e3a5f] text-white hover:bg-[#2c5282]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          Xác nhận trả lời {allAnswered ? '' : `(còn ${statements.length - Object.keys(tfAnswers).length} ý)`}
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SHORT ANSWER — Trả lời ngắn
// ═══════════════════════════════════════════════════════════════
function SACard({ question, onSubmit, showResult, result }) {
  const [saValue, setSaValue] = useState('')
  const submitted = showResult && result

  const handleConfirm = () => {
    if (saValue === '' || submitted) return
    onSubmit({ value: parseFloat(saValue) })
  }

  return (
    <div className="space-y-3">
      <input
        type="number"
        step="0.01"
        placeholder="Nhập đáp án số..."
        value={saValue}
        onChange={(e) => !submitted && setSaValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
        className={`w-full px-4 py-3 rounded-xl border-2 text-gray-800 text-sm outline-none transition-all ${
          submitted
            ? result.is_correct
              ? 'border-green-500 bg-green-50'
              : 'border-red-400 bg-red-50'
            : 'border-gray-200 focus:border-[#1e3a5f]'
        }`}
        readOnly={submitted}
      />

      {submitted && (
        <div className={`flex items-center gap-2 text-sm font-medium ${result.is_correct ? 'text-green-600' : 'text-red-500'}`}>
          {result.is_correct
            ? <><CheckCircle size={16} /> Chính xác!</>
            : <><XCircle size={16} /> Đáp án đúng: <strong>{result.correct_answer}</strong></>
          }
        </div>
      )}

      {!submitted && (
        <button
          onClick={handleConfirm}
          disabled={saValue === ''}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${saValue !== '' ? 'bg-[#1e3a5f] text-white hover:bg-[#2c5282]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        >
          Xác nhận trả lời
        </button>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// QuestionCard — Component chính
// Props: question, onSubmit(answer_data), showResult, result, onNext
// ═══════════════════════════════════════════════════════════════
function QuestionCard({ question, onSubmit, showResult, result, onNext }) {
  if (!question) return null
  const submitted = showResult && result

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-50">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <TypeBadge type={question.question_type} />
          <DiffBadge difficulty={question.difficulty} />
        </div>

        {/* Nội dung câu hỏi */}
        <div className="text-gray-900 font-medium leading-relaxed text-base">
          <MathRenderer content={question.content_json} />
        </div>
      </div>

      {/* Body — render theo loại câu hỏi */}
      <div className="px-6 py-5">
        {/* Ảnh minh họa nếu có - hiển thị giữa câu hỏi và đáp án */}
        {question.image_url && (
          <img
            src={question.image_url}
            alt="Hình minh họa"
            className="mb-4 max-h-64 rounded-xl border border-gray-100 object-contain"
          />
        )}

        {question.question_type === 'mcq' && (
          <MCQCard question={question} onSubmit={onSubmit} showResult={showResult} result={result} />
        )}
        {question.question_type === 'true_false' && (
          <TFCard question={question} onSubmit={onSubmit} showResult={showResult} result={result} />
        )}
        {question.question_type === 'short_answer' && (
          <SACard question={question} onSubmit={onSubmit} showResult={showResult} result={result} />
        )}
      </div>

      {/* Footer sau khi submit */}
      {submitted && onNext && (
        <div className={`px-6 py-4 border-t flex items-center justify-between ${result.is_correct ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <div className={`flex items-center gap-2 text-sm font-semibold ${result.is_correct ? 'text-green-700' : 'text-red-600'}`}>
            {result.is_correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {result.is_correct ? 'Chính xác!' : 'Chưa đúng'}
          </div>
          <button
            onClick={onNext}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#f5a623] text-white rounded-lg text-sm font-semibold hover:bg-[#e09410] transition-colors"
          >
            Câu tiếp theo <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export default QuestionCard
