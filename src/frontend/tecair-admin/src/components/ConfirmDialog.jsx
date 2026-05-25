import Modal from './Modal.jsx';

// Diálogo de confirmación binario (Cancelar / Confirmar). Útil para acciones destructivas.
// Props:
//   open, onCancel, onConfirm     — control habitual.
//   title                         — encabezado del modal.
//   message                       — texto principal (string o ReactNode).
//   confirmLabel, cancelLabel     — etiquetas de botones (defaults: 'Confirmar' / 'Cancelar').
//   destructive                   — si true, botón confirm en rojo/burgundy.
//   loading                       — deshabilita botones y muestra spinner en confirm.
//   error                         — string a mostrar como banner de error dentro del modal.
export default function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title         = 'Confirmar acción',
  message       = '¿Estás seguro?',
  confirmLabel  = 'Confirmar',
  cancelLabel   = 'Cancelar',
  destructive   = false,
  loading       = false,
  error         = null,
}) {
  return (
    <Modal open={open} onClose={loading ? () => {} : onCancel} title={title} size="sm">
      <div className="confirm-dialog-body">
        {typeof message === 'string' ? <p className="m-0">{message}</p> : message}
      </div>

      {error && (
        <div className="admin-alert admin-alert-error mt-3" role="alert">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{error}</span>
        </div>
      )}

      <div className="d-flex justify-content-end gap-2 mt-4">
        <button
          type="button"
          className="btn-burgundy-outline"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={destructive ? 'btn-danger-burgundy' : 'btn-burgundy'}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
