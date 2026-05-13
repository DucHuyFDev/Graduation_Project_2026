import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, Send, Trash2, Pencil, Reply, Loader2, X, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { getComments, createComment, editComment, deleteComment } from '../api/comments'

// ─── Tiện ích: thời gian tương đối (vi) ──────────────────────
const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' })

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = (new Date(dateStr) - Date.now()) / 1000   // giây, âm = quá khứ
  const abs  = Math.abs(diff)
  if (abs < 60)   return rtf.format(Math.round(diff), 'second')
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  return rtf.format(Math.round(diff / 86400), 'day')
}

// ─── Avatar: 1-2 ký tự + màu hash từ user_id ─────────────────
const AVATAR_COLORS = [
  '#1e3a5f', '#2d5a8e', '#7c3aed', '#059669', '#d97706',
  '#dc2626', '#0891b2', '#9333ea', '#16a34a', '#ea580c',
]

function Avatar({ username, userId, size = 8 }) {
  const initials = (username || 'U').slice(0, 2).toUpperCase()
  const color    = AVATAR_COLORS[(userId || 0) % AVATAR_COLORS.length]
  const px       = size * 4  // tailwind w-8 = 32px

  return (
    <div
      className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white`}
      style={{ width: px, height: px, background: color, fontSize: px * 0.38 }}
    >
      {initials}
    </div>
  )
}

// ─── Box nhập comment / reply ─────────────────────────────────
function CommentInput({ placeholder = 'Viết bình luận...', onSubmit, onCancel, loading, autoFocus = false }) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    if (!text.trim()) return
    onSubmit(text.trim())
    setText('')
  }

  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus={autoFocus}
        className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl resize-none
          focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]/40"
        onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit() }}
      />
      <div className="flex items-center gap-2 justify-end">
        {onCancel && (
          <button onClick={onCancel}
            className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg flex items-center gap-1">
            <X size={13} /> Hủy
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading || !text.trim()}
          className="px-4 py-1.5 text-xs font-bold bg-[#1e3a5f] text-white rounded-lg
            hover:bg-[#16304f] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
          Gửi
        </button>
      </div>
    </div>
  )
}

// ─── Inline edit textarea ─────────────────────────────────────
function EditInput({ initialContent, onSave, onCancel, loading }) {
  const [text, setText] = useState(initialContent)

  return (
    <div className="flex flex-col gap-2 mt-1">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={2}
        autoFocus
        className="w-full px-3 py-2 text-sm border border-[#1e3a5f]/30 rounded-xl resize-none
          focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg flex items-center gap-1">
          <X size={13} /> Hủy
        </button>
        <button
          onClick={() => onSave(text.trim())}
          disabled={loading || !text.trim()}
          className="px-4 py-1.5 text-xs font-bold bg-[#1e3a5f] text-white rounded-lg
            hover:bg-[#16304f] disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          Lưu
        </button>
      </div>
    </div>
  )
}

// ─── 1 item comment (dùng cho cả root và reply) ───────────────
function CommentItem({
  comment,
  isReply = false,
  currentUserId,
  currentRole,
  replyingTo,
  editingId,
  actionLoading,
  onReply,
  onCancelReply,
  onSubmitReply,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}) {
  const isDeleted = comment.is_deleted
  const isOwner   = comment.user_id === currentUserId
  const canDelete = isOwner || currentRole === 'teacher'
  const canEdit   = isOwner
  const isEditing = editingId === comment.id

  return (
    <div className={`flex gap-3 ${isReply ? 'pl-8' : ''}`}>
      {/* Avatar */}
      <Avatar username={comment.username} userId={comment.user_id} size={isReply ? 7 : 9} />

      <div className="flex-1 min-w-0">
        {isDeleted ? (
          <p className="text-sm italic text-gray-400">[Bình luận đã bị xóa]</p>
        ) : (
          <>
            {/* Header: username + time */}
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-bold text-gray-800">{comment.username}</span>
              <span className="text-xs text-gray-400">{relativeTime(comment.created_at)}</span>
              {comment.updated_at && (
                <span className="text-[10px] text-gray-300 italic">(đã chỉnh sửa)</span>
              )}
            </div>

            {/* Nội dung hoặc EditInput */}
            {isEditing ? (
              <EditInput
                initialContent={comment.content}
                loading={actionLoading === `edit-${comment.id}`}
                onSave={text => onSaveEdit(comment.id, text)}
                onCancel={onCancelEdit}
              />
            ) : (
              <p className="text-sm text-gray-700 mt-0.5 leading-relaxed whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            )}

            {/* Actions */}
            {!isEditing && (
              <div className="flex items-center gap-3 mt-1.5">
                {/* Trả lời — chỉ hiện ở cấp 1 */}
                {!isReply && currentUserId && (
                  <button
                    onClick={() => onReply(comment.id)}
                    className="text-xs text-gray-400 hover:text-[#1e3a5f] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Reply size={12} /> Trả lời
                  </button>
                )}
                {/* Sửa */}
                {canEdit && (
                  <button
                    onClick={() => onEdit(comment.id)}
                    className="text-xs text-gray-400 hover:text-blue-600 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Pencil size={11} /> Sửa
                  </button>
                )}
                {/* Xóa */}
                {canDelete && (
                  <button
                    onClick={() => onDelete(comment.id, comment.parent_id !== null)}
                    disabled={actionLoading === `delete-${comment.id}`}
                    className="text-xs text-gray-400 hover:text-red-500 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    {actionLoading === `delete-${comment.id}`
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Trash2 size={11} />}
                    Xóa
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Inline reply box */}
        {replyingTo === comment.id && (
          <div className="mt-3">
            <CommentInput
              placeholder={`Trả lời ${comment.username}...`}
              loading={actionLoading === `reply-${comment.id}`}
              onSubmit={text => onSubmitReply(comment.id, text)}
              onCancel={onCancelReply}
              autoFocus
            />
          </div>
        )}

        {/* Replies (chỉ render ở cấp 1) */}
        {!isReply && comment.replies?.length > 0 && (
          <div className="mt-3 flex flex-col gap-4">
            {comment.replies.map(reply => (
              <CommentItem
                key={reply.id}
                comment={reply}
                isReply
                currentUserId={currentUserId}
                currentRole={currentRole}
                replyingTo={replyingTo}
                editingId={editingId}
                actionLoading={actionLoading}
                onReply={onReply}
                onCancelReply={onCancelReply}
                onSubmitReply={onSubmitReply}
                onEdit={onEdit}
                onCancelEdit={onCancelEdit}
                onSaveEdit={onSaveEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CommentSection chính ─────────────────────────────────────
/**
 * CommentSection — hiển thị và quản lý bình luận cho 1 target (video/document).
 * Props: targetType ('video' | 'document'), targetId (number)
 */
export default function CommentSection({ targetType, targetId }) {
  const { isAuthenticated, user, hasRole } = useAuth()

  const [comments,       setComments]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [submitting,     setSubmitting]     = useState(false)
  const [actionLoading,  setActionLoading]  = useState(null)  // 'reply-id' | 'edit-id' | 'delete-id'
  const [replyingTo,     setReplyingTo]     = useState(null)  // comment_id đang reply
  const [editingId,      setEditingId]      = useState(null)  // comment_id đang edit

  // Load comments
  const loadComments = useCallback(async () => {
    if (!targetId) return
    try {
      const res = await getComments(targetType, targetId)
      setComments(res.results || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [targetType, targetId])

  useEffect(() => { setLoading(true); loadComments() }, [loadComments])

  // Đếm tổng (gốc + replies)
  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)

  // ── Gửi comment gốc ──
  const handleSubmitRoot = async (content) => {
    setSubmitting(true)
    try {
      await createComment({ target_type: targetType, target_id: targetId, content })
      await loadComments()
    } catch { /* ignore */ }
    finally { setSubmitting(false) }
  }

  // ── Gửi reply ──
  const handleSubmitReply = async (parentId, content) => {
    setActionLoading(`reply-${parentId}`)
    try {
      await createComment({ target_type: targetType, target_id: targetId, content, parent_id: parentId })
      setReplyingTo(null)
      await loadComments()
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  // ── Lưu edit ──
  const handleSaveEdit = async (commentId, content) => {
    setActionLoading(`edit-${commentId}`)
    try {
      await editComment(commentId, content)
      setEditingId(null)
      await loadComments()
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  // ── Xóa ──
  const handleDelete = async (commentId) => {
    setActionLoading(`delete-${commentId}`)
    try {
      await deleteComment(commentId)
      await loadComments()
    } catch { /* ignore */ }
    finally { setActionLoading(null) }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageCircle size={18} className="text-[#1e3a5f]" />
        <h2 className="text-base font-bold text-gray-800">
          Bình luận
          {totalCount > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-400">({totalCount})</span>
          )}
        </h2>
      </div>

      {/* Box nhập comment gốc */}
      {isAuthenticated ? (
        <div className="flex gap-3">
          <Avatar username={user?.username} userId={user?.id} size={9} />
          <div className="flex-1">
            <CommentInput
              placeholder="Chia sẻ suy nghĩ của bạn về video này..."
              loading={submitting}
              onSubmit={handleSubmitRoot}
            />
          </div>
        </div>
      ) : (
        <div className="py-4 px-5 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-sm text-gray-500 text-center">
          <Link to="/login" className="text-[#1e3a5f] font-semibold hover:underline">
            Đăng nhập
          </Link>{' '}
          để bình luận
        </div>
      )}

      {/* Danh sách comment */}
      {loading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 size={18} className="animate-spin mr-2" /> Đang tải bình luận...
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <MessageCircle size={32} className="mx-auto mb-2 text-gray-200" />
          Chưa có bình luận nào. Hãy là người đầu tiên!
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={user?.id}
              currentRole={user?.role}
              replyingTo={replyingTo}
              editingId={editingId}
              actionLoading={actionLoading}
              onReply={id => { setReplyingTo(id); setEditingId(null) }}
              onCancelReply={() => setReplyingTo(null)}
              onSubmitReply={handleSubmitReply}
              onEdit={id => { setEditingId(id); setReplyingTo(null) }}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={handleSaveEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
