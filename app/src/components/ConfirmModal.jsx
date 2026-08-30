import './ConfirmModal.css'

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {title && <h2 className="modal-title">{title}</h2>}
        <p className="modal-message">{message}</p>
        <div className="modal-actions">
          <button type="button" className="modal-button modal-button-danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
          <button type="button" className="modal-button modal-button-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
