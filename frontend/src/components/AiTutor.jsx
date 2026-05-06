import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { X, Send, Loader2, BookOpen, MessageCircle, Sparkles } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { createAiSession, getSessionMessages, sendMessage as apiSendMessage } from '../api/aiTutor'

// ─── Typing indicator (3 chấm nhấp nháy) ─────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-2 h-2 bg-gray-400 rounded-full"
          style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Chips gợi ý khi chat trống ───────────────────────────────
const DEFAULT_CHIPS = [
  'Giải thích khái niệm đạo hàm',
  'Cách tính tích phân từng phần',
  'Ôn tập công thức lượng giác',
]

/**
 * AiTutor — Widget chat AI cố định góc dưới phải.
 * Props:
 *   currentQuestion — object câu hỏi hiện tại (nếu student đang làm bài luyện tập)
 */
function AiTutor({ currentQuestion }) {
  const { isAuthenticated, hasRole } = useAuth()
  const location = useLocation()

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])       // [{role, content, id?}]
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [initError, setInitError] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Ẩn hoàn toàn khi ở exam-room
  const isExamRoom = location.pathname.startsWith('/exam-room')
  // Chỉ hiện cho student đã đăng nhập
  const shouldShow = isAuthenticated && hasRole('student') && !isExamRoom

  // ─── Khởi tạo session khi widget mở lần đầu ───────────────
  const initSession = useCallback(async () => {
    const savedId = localStorage.getItem('ai_session_id')
    if (savedId) {
      // Có session cũ → load lịch sử
      try {
        const data = await getSessionMessages(parseInt(savedId))
        setSessionId(parseInt(savedId))
        setMessages(data.messages ?? [])
      } catch {
        // Session cũ hết hạn → tạo mới
        localStorage.removeItem('ai_session_id')
        await createNewSession()
      }
    } else {
      await createNewSession()
    }
  }, [])

  const createNewSession = async () => {
    try {
      const data = await createAiSession('general')
      setSessionId(data.session_id)
      localStorage.setItem('ai_session_id', String(data.session_id))
      setMessages([])
    } catch (err) {
      console.error('[AiTutor] tạo session thất bại:', err)
      setInitError(true)
    }
  }

  // Init session một lần khi shouldShow thay đổi thành true
  useEffect(() => {
    if (shouldShow && sessionId === null && !initError) {
      initSession()
    }
  }, [shouldShow, sessionId, initError, initSession])

  // Auto-scroll xuống cuối sau mỗi tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input khi mở popup
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  // ─── Gửi tin nhắn ─────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    const trimmed = text.trim()
    if (!trimmed || !sessionId || isLoading) return

    setInputText('')
    // Thêm user message ngay vào UI
    const userMsg = { role: 'user', content: trimmed, _local: true }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)

    try {
      const res = await apiSendMessage(sessionId, trimmed)
      setMessages(prev => [...prev, { role: 'assistant', content: res.content }])
      // Đếm unread nếu popup đang đóng
      if (!isOpen) setUnreadCount(prev => prev + 1)
    } catch (err) {
      const errorText = err.response?.data?.error || err.message || ''
      // Kiểm tra lỗi 503 (High demand) hoặc chuỗi lỗi chứa 503
      if (err.response?.status === 503 || errorText.includes('503')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Mình đang xử lý việc cho anh Huy, bạn vui lòng đợi mình khoảng 30p nhé. Cảm ơn bạn'
        }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `Xin lỗi bạn, hệ thống đã lỗi. Đừng phốt nhé ! 30p nữa quay lại đây :))` }])
      }
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, isLoading, isOpen])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputText)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    setUnreadCount(0)
  }

  // ─── Chip gợi ý câu hỏi hiện tại ─────────────────────────
  const handleQuestionChip = () => {
    if (!currentQuestion) return
    const ctx = currentQuestion.content_json
    const questionText = typeof ctx === 'string'
      ? ctx
      : (ctx?.blocks?.[0]?.content?.map(c => c.value).join('') ?? 'câu hỏi toán')
    sendMessage(`Gợi ý câu này: ${questionText}`)
  }

  if (!shouldShow) return null

  return (
    <>
      {/* ═══ POPUP CHAT ════════════════════════════════════════ */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 z-50 flex flex-col rounded-2xl shadow-2xl border border-gray-100 bg-white overflow-hidden"
          style={{ width: '380px', height: '520px' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#1e3a5f] flex-shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-[#f5a623] flex items-center justify-center text-xl flex-shrink-0">
                👨‍🏫
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#1e3a5f]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Trợ lý của anh Huy</p>
              <p className="text-white/60 text-xs truncate">Hỗ trợ học Toán THPT · MathPro</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/15 transition-colors text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
            {/* Tin chào nếu chưa có messages */}
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">👨‍🏫</div>
                <p className="text-gray-700 font-semibold text-sm mb-1">Xin chào! Tôi là trợ lý của anh Huy</p>
                <p className="text-gray-400 text-xs mb-4">Tôi sẽ giúp bạn gợi ý hướng giải bài tập nhé!</p>

                {/* Suggestion chips */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {currentQuestion && (
                    <button
                      onClick={handleQuestionChip}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] rounded-full text-xs font-medium hover:bg-[#f5a623]/20 transition-colors"
                    >
                      <Sparkles size={11} /> Gợi ý câu này
                    </button>
                  )}
                  {DEFAULT_CHIPS.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(chip)}
                      className="px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-full text-xs hover:border-[#1e3a5f]/40 hover:text-[#1e3a5f] transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Danh sách tin nhắn */}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5">
                    👨‍🏫
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${msg.role === 'user'
                    ? 'bg-[#1e3a5f] text-white rounded-br-sm'
                    : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
                    }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-[#f5a623] flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5">
                  👨‍🏫
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chip gợi ý câu hỏi (khi đang làm bài và đã có messages) */}
          {currentQuestion && messages.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-white flex-shrink-0">
              <button
                onClick={handleQuestionChip}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5a623]/10 border border-[#f5a623]/30 text-[#f5a623] rounded-full text-xs font-medium hover:bg-[#f5a623]/20 transition-colors"
              >
                <Sparkles size={11} /> Gợi ý câu hỏi này
              </button>
            </div>
          )}

          {/* Input area */}
          <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 bg-white flex-shrink-0">
            <input
              ref={inputRef}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu hỏi Toán..."
              className="flex-1 px-3.5 py-2 bg-[#f0f4f8] rounded-xl text-sm outline-none text-gray-800 placeholder-gray-400 focus:bg-gray-100 transition-colors"
            />
            <button
              onClick={() => sendMessage(inputText)}
              disabled={!inputText.trim() || isLoading}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${inputText.trim() && !isLoading
                ? 'bg-[#f5a623] text-white hover:bg-[#e09410]'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                }`}
            >
              {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
        </div>
      )}

      {/* ═══ NÚT TRÒN (đóng) ══════════════════════════════════ */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-[#f5a623] text-white rounded-full shadow-xl hover:bg-[#e09410] hover:scale-110 transition-all duration-200 flex items-center justify-center"
          title="Trợ lý AI MathPro"
        >
          <span className="text-2xl leading-none">👨‍🏫</span>
          {/* Badge unread */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}
    </>
  )
}

export default AiTutor
