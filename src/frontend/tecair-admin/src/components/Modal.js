import { useEffect } from 'react';

// Modal mínimo (sin dependencias) consistente con el resto del admin.
// Props:
//   open    — bool. Si false no renderiza nada.
//   title   — string, encabezado.
//   onClose — () → void. Se llama al hacer clic en el backdrop, en la X o presionar Esc.
//   size    — 'sm' | 'md' | 'lg'. Por defecto 'md'.
//   children — contenido del body.
export default function Modal({ open, title, onClose, size = 'md', children }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onMouseDown={onClose} role="dialog" aria-modal="true">
      <div
        className={`admin-modal admin-modal-${size}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="admin-modal-header">
          <h3 className="admin-modal-title">{title}</h3>
          <button
            type="button"
            className="admin-modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </header>
        <div className="admin-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}
