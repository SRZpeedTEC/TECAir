import { useState, useMemo } from 'react';
import DatePicker from './DatePicker.js';

// Formulario de promoción (create + edit).
//
// Props:
//   mode             — 'create' | 'edit'
//   itinerary        — { itineraryId, originCode, destinationCode, price, ... }
//                      precio del itinerario base (necesario para calcular discountPercent)
//   initialValues    — para mode='edit', valores iniciales de la promoción
//                      { promotionCode, startDate, endDate, promoPrice, imageUrl }
//   onSubmit         — async (payload) => void. payload listo para el backend.
//   onCancel         — () => void (solo render en modo edit)
//   submitting       — bool externo. Si true, deshabilita botón submit.
//   submitError      — string|null. Banner de error.
export default function PromotionForm({
  mode = 'create',
  itinerary,
  initialValues = null,
  onSubmit,
  onCancel,
  submitting = false,
  submitError = null,
}) {
  const [promotionCode, setPromotionCode] = useState(initialValues?.promotionCode ?? '');
  const [startDate,     setStartDate]     = useState(initialValues?.startDate     ?? '');
  const [endDate,       setEndDate]       = useState(initialValues?.endDate       ?? '');
  const [promoPrice,    setPromoPrice]    = useState(
    initialValues?.promoPrice != null ? String(initialValues.promoPrice) : ''
  );
  const [imageUrl,      setImageUrl]      = useState(initialValues?.imageUrl ?? '');

  const [touched, setTouched] = useState(false);

  const basePrice = Number(itinerary?.price ?? 0);

  // discountPercent calculado a partir del promoPrice ingresado y el precio del itinerario.
  // Solo informativo: el backend exige ambos campos y los enviamos juntos al submit.
  const discountPercent = useMemo(() => {
    const promo = Number(promoPrice);
    if (!basePrice || !Number.isFinite(promo) || promo < 0) return null;
    if (promo >= basePrice) return 0;
    return Number(((1 - promo / basePrice) * 100).toFixed(2));
  }, [promoPrice, basePrice]);

  // Validaciones
  const errors = {};
  if (mode === 'create' && !promotionCode.trim()) {
    errors.promotionCode = 'El código es obligatorio.';
  } else if (mode === 'create' && promotionCode.length > 20) {
    errors.promotionCode = 'Máximo 20 caracteres.';
  }
  if (!startDate) errors.startDate = 'Selecciona la fecha de inicio.';
  if (!endDate)   errors.endDate   = 'Selecciona la fecha de fin.';
  if (startDate && endDate && startDate > endDate) {
    errors.endDate = 'La fecha de fin debe ser igual o posterior a la de inicio.';
  }
  if (promoPrice === '' || promoPrice == null) {
    errors.promoPrice = 'Ingresa el precio promocional.';
  } else if (!Number.isFinite(Number(promoPrice)) || Number(promoPrice) < 0) {
    errors.promoPrice = 'Debe ser un número mayor o igual a 0.';
  } else if (!Number.isInteger(Number(promoPrice))) {
    errors.promoPrice = 'Debe ser un entero (sin decimales).';
  } else if (basePrice > 0 && Number(promoPrice) >= basePrice) {
    errors.promoPrice = `Debe ser menor al precio base (${basePrice}).`;
  }
  if (imageUrl && !/^https?:\/\//i.test(imageUrl.trim())) {
    errors.imageUrl = 'La URL debe comenzar con http:// o https://.';
  }

  const hasErrors = Object.keys(errors).length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (hasErrors) return;

    const payload = {
      itineraryId:     itinerary.itineraryId,
      startDate,
      endDate,
      promoPrice:      Number(promoPrice),
      discountPercent: discountPercent ?? 0,
      imageUrl:        imageUrl.trim() ? imageUrl.trim() : null,
    };
    if (mode === 'create') {
      payload.promotionCode = promotionCode.trim();
    }
    await onSubmit(payload);
  };

  const show = (field) => touched && errors[field];

  return (
    <form onSubmit={handleSubmit} className="promo-form" noValidate>
      {/* Resumen del itinerario al que se aplica */}
      <div className="promo-form-itinerary">
        <div className="promo-form-itinerary-route">
          <span className="mono">{itinerary?.originCode}</span>
          <i className="bi bi-arrow-right mx-2" aria-hidden="true"></i>
          <span className="mono">{itinerary?.destinationCode}</span>
          <span className="promo-form-itinerary-id ms-2">#{itinerary?.itineraryId}</span>
        </div>
        <div className="promo-form-itinerary-price">
          Precio base: <strong>{basePrice.toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 })}</strong>
        </div>
      </div>

      <div className="row g-3 mt-1">
        {mode === 'create' && (
          <div className="col-md-6">
            <label htmlFor="promo-code" className="form-label">Código de promoción</label>
            <input
              id="promo-code"
              type="text"
              className={'form-control' + (show('promotionCode') ? ' is-invalid' : '')}
              maxLength={20}
              value={promotionCode}
              onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
              placeholder="VERANO25"
              autoComplete="off"
            />
            {show('promotionCode') && <div className="invalid-feedback d-block">{errors.promotionCode}</div>}
          </div>
        )}

        <div className={mode === 'create' ? 'col-md-6' : 'col-md-12'}>
          <label htmlFor="promo-price" className="form-label">Precio promocional (CRC)</label>
          <input
            id="promo-price"
            type="number"
            className={'form-control' + (show('promoPrice') ? ' is-invalid' : '')}
            min={0}
            step={1}
            value={promoPrice}
            onChange={(e) => setPromoPrice(e.target.value)}
            placeholder="0"
          />
          {show('promoPrice') && <div className="invalid-feedback d-block">{errors.promoPrice}</div>}
          {!show('promoPrice') && discountPercent != null && (
            <div className="form-text">
              Descuento calculado: <strong>{discountPercent}%</strong>
            </div>
          )}
        </div>

        <div className="col-md-6">
          <DatePicker
            id="promo-start"
            label="Inicio de promoción"
            value={startDate}
            onChange={setStartDate}
            invalid={!!show('startDate')}
          />
          {show('startDate') && <div className="invalid-feedback d-block">{errors.startDate}</div>}
        </div>

        <div className="col-md-6">
          <DatePicker
            id="promo-end"
            label="Fin de promoción"
            value={endDate}
            onChange={setEndDate}
            invalid={!!show('endDate')}
          />
          {show('endDate') && <div className="invalid-feedback d-block">{errors.endDate}</div>}
        </div>

        <div className="col-12">
          <label htmlFor="promo-img" className="form-label">URL de imagen <span className="text-muted-small">(opcional)</span></label>
          <input
            id="promo-img"
            type="url"
            className={'form-control' + (show('imageUrl') ? ' is-invalid' : '')}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            autoComplete="off"
          />
          {show('imageUrl') && <div className="invalid-feedback d-block">{errors.imageUrl}</div>}
          {imageUrl && !errors.imageUrl && (
            <div className="promo-form-img-preview mt-2">
              <img src={imageUrl} alt="Vista previa" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
          )}
        </div>
      </div>

      {submitError && (
        <div className="admin-alert admin-alert-error mt-3" role="alert">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{submitError}</span>
        </div>
      )}

      <div className="d-flex justify-content-end gap-2 mt-4">
        {onCancel && (
          <button
            type="button"
            className="btn-burgundy-outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          className="btn-burgundy"
          disabled={submitting}
        >
          {submitting && <span className="spinner-border spinner-border-sm me-2"></span>}
          {mode === 'create' ? 'Crear promoción' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
