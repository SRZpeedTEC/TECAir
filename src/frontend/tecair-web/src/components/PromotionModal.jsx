import { useEffect } from 'react';
import { fmtCRC } from '../utils/format.js';
import { resolveImageUrl } from '../services/api.js';

const MESES_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  return `${d} ${MESES_ABBR[Number(m) - 1] ?? m} ${y}`;
}

// Modal con el detalle de una promoción. Se abre desde HomePage al hacer
// click en una tarjeta de oferta. El botón "Reservar ahora" delega en
// onReserve para que la página padre configure el estado y navegue a la
// página de resultados.
export default function PromotionModal({ promo, onClose, onReserve }) {
  useEffect(() => {
    if (!promo) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [promo, onClose]);

  if (!promo) return null;

  const destCity   = promo.destinationCity || promo.destinationCode;
  const originCity = promo.originCity      || promo.originCode;
  const showSavings = promo.basePrice && promo.basePrice > promo.promoPrice;

  return (
    <div
      className="promo-modal-backdrop"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="promo-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="promo-modal-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <i className="bi bi-x-lg"></i>
        </button>

        <div className="promo-modal-hero">
          {promo.imageUrl
            ? <img src={resolveImageUrl(promo.imageUrl)} alt={destCity} />
            : <div className="promo-modal-hero-ph"></div>}
          <div className="promo-modal-hero-overlay"></div>
          <div className="promo-modal-badge">{promo.discountPercent}% OFF</div>
          <div className="promo-modal-hero-text">
            <h3 className="serif promo-modal-title">{destCity}</h3>
          </div>
        </div>

        <div className="promo-modal-body">
          <div className="promo-modal-route">
            <i className="bi bi-geo-alt-fill text-burgundy me-2"></i>
            <span className="fw-semibold">{originCity}</span>
            <i className="bi bi-arrow-right mx-2 text-burgundy"></i>
            <span className="fw-semibold">{destCity}</span>
            <span className="ms-2 text-muted small">
              ({promo.originCode} → {promo.destinationCode})
            </span>
          </div>

          <div className="promo-modal-period">
            <i className="bi bi-calendar-event me-2 text-burgundy"></i>
            Promoción válida hasta <strong>{fmtDate(promo.endDate)}</strong>
          </div>

          <div className="promo-modal-pricing">
            <div className="promo-modal-pricing-label">Precio promocional</div>
            <div className="promo-modal-pricing-main">
              <span className="promo-modal-price-now">{fmtCRC(promo.promoPrice)}</span>
              {showSavings && (
                <span className="promo-modal-price-old">{fmtCRC(promo.basePrice)}</span>
              )}
            </div>
            {showSavings && (
              <div className="promo-modal-savings">
                Ahorras {fmtCRC(promo.basePrice - promo.promoPrice)} por pasajero
              </div>
            )}
          </div>

          <button
            type="button"
            className="btn btn-burgundy w-100 mt-3"
            onClick={() => onReserve(promo)}
          >
            <i className="bi bi-airplane me-2"></i>
            Reservar ahora
          </button>

          <p className="small text-muted text-center mt-2 mb-0">
            Te llevamos a la búsqueda con esta ruta prellenada.
          </p>
        </div>
      </div>
    </div>
  );
}
