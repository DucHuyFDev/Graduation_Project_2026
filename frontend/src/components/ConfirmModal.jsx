/**
 * ConfirmModal — Modal xác nhận dùng chung toàn app.
 * Props:
 *   open: boolean
 *   title: string
 *   message: string
 *   confirmLabel: string (mặc định "Xác nhận")
 *   cancelLabel: string  (mặc định "Hủy")
 *   confirmVariant: "danger" | "warning" | "primary"
 *   onConfirm: () => void
 *   onCancel: () => void
 *   icon: ReactNode (tuỳ chọn)
 */
function ConfirmModal({
  open,
  title = 'Xác nhận',
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  icon,
}) {
  if (!open) return null

  const variantBtn = {
    danger:  'bg-red-500 hover:bg-red-600 shadow-red-200',
    warning: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
    primary: 'bg-[#1e3a5f] hover:bg-[#16304f] shadow-blue-200',
  }

  const variantIcon = {
    danger:  'bg-red-50 text-red-500',
    warning: 'bg-amber-50 text-amber-500',
    primary: 'bg-blue-50 text-[#1e3a5f]',
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 modal-overlay"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl modal-content overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Body */}
        <div className="p-7 flex flex-col items-center text-center">
          {icon && (
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${variantIcon[confirmVariant]}`}>
              {icon}
            </div>
          )}
          <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
          {message && <p className="text-gray-500 text-sm leading-relaxed">{message}</p>}
        </div>

        {/* Actions */}
        <div className="flex border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-100"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3.5 text-sm font-bold text-white shadow-lg transition-all active:scale-95 ${variantBtn[confirmVariant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
