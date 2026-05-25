import { useState, useMemo, useRef } from 'react';
import DatePicker from './DatePicker.jsx';
import { uploadPromotionImage } from '../services/promotionService.js';

const MESES_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

const pad2 = (n) => String(n).padStart(2, '0');

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISODate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateOnly(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function diffDays(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function fmtFlightDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MESES_ABBR[d.getMonth()]} ${d.getFullYear()} · ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fmtPriceCRC(n) {
  if (n == null || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
}

function fmtShortDate(iso) {
  const d = parseISODate(iso);
  if (!d) return iso;
  return `${d.getDate()} ${MESES_ABBR[d.getMonth()]}`;
}

// Formulario de promoción (create + edit).
//
// Props:
//   mode             — 'create' | 'edit'
//   itinerary        — { itineraryId, originCode, destinationCode, price,
//                        departureDatetime, arrivalDatetime }
//   initialValues    — para mode='edit', valores iniciales de la promoción
//   onSubmit         — async (payload) => void.
//   onCancel         — () => void.
//   submitting       — bool externo, deshabilita botón submit.
//   submitError      — string|null, banner de error.
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
  // discountStr: campo de porcentaje bidireccional con promoPrice.
  const [discountStr,   setDiscountStr]   = useState(
    initialValues?.discountPercent != null ? String(initialValues.discountPercent) : ''
  );
  const [imageUrl,      setImageUrl]      = useState(initialValues?.imageUrl ?? '');
  // imageMode: 'url' | 'file' — controla el modo de entrada de imagen.
  const [imageMode,     setImageMode]     = useState('url');
  const [uploading,     setUploading]     = useState(false);
  const [uploadError,   setUploadError]   = useState(null);
  const [touched,       setTouched]       = useState(false);
  const fileInputRef = useRef(null);

  const basePrice    = Number(itinerary?.price ?? 0);
  const departureISO = itinerary?.departureDatetime ?? null;
  const arrivalISO   = itinerary?.arrivalDatetime   ?? null;

  const today        = dateOnly(new Date());
  const flightDay    = departureISO ? dateOnly(new Date(departureISO)) : null;
  const flightISO    = flightDay ? toISODate(flightDay) : null;
  const maxEndDay    = flightDay ? new Date(flightDay.getTime() - 86400000) : null;
  const maxEndISO    = maxEndDay ? toISODate(maxEndDay) : null;

  const startDay     = parseISODate(startDate);
  const endDay       = parseISODate(endDate);
  const daysToFlight = flightDay ? diffDays(flightDay, today) : null;

  const discountPercent = useMemo(() => {
    const p = Number(promoPrice);
    if (!basePrice || !Number.isFinite(p) || p < 0) return null;
    if (p >= basePrice) return 0;
    return Number(((1 - p / basePrice) * 100).toFixed(1));
  }, [promoPrice, basePrice]);

  // ─── Validaciones ───
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
  if (flightISO && endDate && endDate >= flightISO) {
    errors.endDate = 'La promo debe terminar antes del día del vuelo.';
  }
  if (promoPrice === '' || promoPrice == null) {
    errors.promoPrice = 'Ingresa el precio promocional.';
  } else if (!Number.isFinite(Number(promoPrice)) || Number(promoPrice) < 0) {
    errors.promoPrice = 'Debe ser un número mayor o igual a 0.';
  } else if (!Number.isInteger(Number(promoPrice))) {
    errors.promoPrice = 'Debe ser un entero (sin decimales).';
  } else if (basePrice > 0 && Number(promoPrice) >= basePrice) {
    errors.promoPrice = `Debe ser menor al precio base (${fmtPriceCRC(basePrice)}).`;
  }
  // Solo URLs http/https. Las imágenes subidas desde archivo pasan por el
  // backend (upload-image) y vuelven como URL pública servida en /uploads.
  if (imageUrl && !/^https?:\/\//i.test(imageUrl.trim())) {
    errors.imageUrl = 'La URL debe comenzar con http:// o https://.';
  }
  const hasErrors = Object.keys(errors).length > 0;

  // Cambia la fecha de inicio y descarta la de fin si quedara anterior al nuevo inicio.
  const handleStartDateChange = (v) => {
    setStartDate(v);
    if (endDate && v && endDate < v) setEndDate('');
  };

  // ─── Presets de período ───
  const applyPeriod = (windowDays) => {
    if (!maxEndDay) return;
    const end = maxEndDay;
    const desiredStart = new Date(end.getTime() - (windowDays - 1) * 86400000);
    const start = desiredStart < today ? today : desiredStart;
    setStartDate(toISODate(start));
    setEndDate(toISODate(end));
  };

  const applyFullPeriod = () => {
    if (!maxEndDay) return;
    const start = today > maxEndDay ? maxEndDay : today;
    setStartDate(toISODate(start));
    setEndDate(toISODate(maxEndDay));
  };

  // ─── Presets de precio ───
  const applyDiscount = (pct) => {
    if (!basePrice) return;
    setPromoPrice(String(Math.round(basePrice * (1 - pct / 100))));
    setDiscountStr(String(pct));
  };

  // Actualiza precio; sincroniza discountStr derivado.
  const handlePriceChange = (v) => {
    setPromoPrice(v);
    if (basePrice > 0) {
      const p = Number(v);
      if (Number.isFinite(p) && p >= 0 && p < basePrice) {
        setDiscountStr(((1 - p / basePrice) * 100).toFixed(1));
      } else {
        setDiscountStr('');
      }
    }
  };

  // Actualiza porcentaje; calcula y sincroniza promoPrice.
  const handleDiscountChange = (v) => {
    const clamped = Number(v) > 100 ? '100' : v;
    setDiscountStr(clamped);
    const pct = Number(clamped);
    if (basePrice > 0 && Number.isFinite(pct) && pct > 0 && pct <= 100) {
      setPromoPrice(String(Math.round(basePrice * (1 - pct / 100))));
    }
  };

  // Sube el archivo al backend; el backend lo guarda en wwwroot/uploads y
  // devuelve la URL pública que es lo único que persistimos en BD.
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadPromotionImage(file);
      setImageUrl(url);
    } catch (err) {
      setUploadError(err?.message ?? 'No se pudo subir la imagen.');
      setImageUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  // Cambia el modo de imagen y limpia el valor actual.
  const switchImageMode = (mode) => {
    setImageMode(mode);
    setImageUrl('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

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

  // ─── Timeline ───
  const renderTimeline = () => {
    if (!flightDay) return null;
    if (daysToFlight <= 0) {
      return (
        <div className="promo-timeline-empty">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          El vuelo es hoy o ya pasó: no tiene sentido crear una promoción.
        </div>
      );
    }
    const min = today.getTime();
    const max = flightDay.getTime();
    const span = max - min;
    const pct = (d) => {
      const c = Math.max(min, Math.min(max, d.getTime()));
      return ((c - min) / span) * 100;
    };
    const sPct = startDay ? pct(startDay) : null;
    const ePct = endDay   ? pct(endDay)   : null;
    const hasBar = sPct != null && ePct != null && ePct >= sPct;
    const promoDays = startDay && endDay ? diffDays(endDay, startDay) + 1 : null;

    return (
      <div className="promo-timeline">
        <div className="promo-timeline-track">
          {hasBar && (
            <div
              className="promo-timeline-bar"
              style={{ left: `${sPct}%`, width: `${Math.max(2, ePct - sPct)}%` }}
            />
          )}
          <span className="promo-timeline-dot promo-timeline-dot-today"></span>
          <span className="promo-timeline-dot promo-timeline-dot-flight"></span>
          <span className="promo-timeline-label promo-timeline-label-start">
            <i className="bi bi-geo-alt-fill me-1"></i>Hoy
          </span>
          <span className="promo-timeline-label promo-timeline-label-end">
            <i className="bi bi-airplane-fill me-1"></i>Vuelo
          </span>
          <span className="promo-timeline-date promo-timeline-date-start mono">
            {fmtShortDate(toISODate(today))}
          </span>
          <span className="promo-timeline-date promo-timeline-date-end mono">
            {fmtShortDate(flightISO)}
          </span>
        </div>
        <div className="promo-timeline-footer">
          {hasBar ? (
            <>
              Promoción activa durante <strong>{promoDays} {promoDays === 1 ? 'día' : 'días'}</strong>
              {' · '}
              <span className="mono">{fmtShortDate(startDate)}</span>
              {' → '}
              <span className="mono">{fmtShortDate(endDate)}</span>
            </>
          ) : (
            <span className="text-muted-small">Elige inicio y fin para ver la franja en la línea de tiempo.</span>
          )}
        </div>
      </div>
    );
  };

  const flightIsValid = !flightDay || daysToFlight > 0;

  return (
    <form onSubmit={handleSubmit} className="promo-form" noValidate>
      {/* ─── Header del itinerario ─── */}
      <div className="promo-form-header">
        <div className="promo-form-header-route">
          <span className="promo-form-header-code mono">{itinerary?.originCode}</span>
          <i className="bi bi-airplane-fill promo-form-header-arrow" aria-hidden="true"></i>
          <span className="promo-form-header-code mono">{itinerary?.destinationCode}</span>
          <span className="promo-form-header-id">#{itinerary?.itineraryId}</span>
        </div>
        <div className="promo-form-header-meta">
          {departureISO && (
            <div className="promo-form-header-row">
              <i className="bi bi-calendar-event"></i>
              <span className="promo-form-header-row-label">Salida</span>
              <span className="promo-form-header-row-value mono">{fmtFlightDateTime(departureISO)}</span>
            </div>
          )}
          {arrivalISO && (
            <div className="promo-form-header-row">
              <i className="bi bi-calendar-check"></i>
              <span className="promo-form-header-row-label">Llegada</span>
              <span className="promo-form-header-row-value mono">{fmtFlightDateTime(arrivalISO)}</span>
            </div>
          )}
          <div className="promo-form-header-row promo-form-header-row-price">
            <i className="bi bi-cash-coin"></i>
            <span className="promo-form-header-row-label">Precio base</span>
            <span className="promo-form-header-row-value">{fmtPriceCRC(basePrice)}</span>
          </div>
        </div>
      </div>

      {/* ─── Sección: Período ─── */}
      <section className="promo-form-section">
        <header className="promo-form-section-head">
          <h4 className="promo-form-section-title">
            <i className="bi bi-calendar3 me-2"></i>Período de la promoción
          </h4>
          {flightDay && flightIsValid && (
            <span className="promo-form-section-hint">
              Faltan <strong>{daysToFlight}</strong> {daysToFlight === 1 ? 'día' : 'días'} para el vuelo
            </span>
          )}
        </header>

        {flightIsValid && maxEndDay && (
          <div className="promo-form-presets">
            <span className="promo-form-presets-label">Presets:</span>
            <button type="button" className="promo-form-chip" onClick={applyFullPeriod}>
              <i className="bi bi-fast-forward-fill me-1"></i>Hoy → día previo
            </button>
            {daysToFlight >= 8 && (
              <button type="button" className="promo-form-chip" onClick={() => applyPeriod(7)}>
                Última semana
              </button>
            )}
            {daysToFlight >= 15 && (
              <button type="button" className="promo-form-chip" onClick={() => applyPeriod(14)}>
                Últimas 2 semanas
              </button>
            )}
            {daysToFlight >= 31 && (
              <button type="button" className="promo-form-chip" onClick={() => applyPeriod(30)}>
                Último mes
              </button>
            )}
          </div>
        )}

        <div className="row g-3">
          <div className="col-md-6">
            <DatePicker
              id="promo-start"
              label="Inicio"
              value={startDate}
              onChange={handleStartDateChange}
              invalid={!!show('startDate')}
              minDate={today}
            />
            {show('startDate') && <div className="invalid-feedback d-block">{errors.startDate}</div>}
          </div>
          <div className="col-md-6">
            <DatePicker
              id="promo-end"
              label="Fin"
              value={endDate}
              onChange={setEndDate}
              invalid={!!show('endDate')}
              minDate={startDay ?? today}
            />
            {show('endDate') && <div className="invalid-feedback d-block">{errors.endDate}</div>}
            {!show('endDate') && maxEndISO && (
              <div className="form-text">
                Tope: <span className="mono">{fmtShortDate(maxEndISO)}</span> (día previo al vuelo)
              </div>
            )}
          </div>
        </div>

        {renderTimeline()}
      </section>

      {/* ─── Sección: Precio ─── */}
      <section className="promo-form-section">
        <header className="promo-form-section-head">
          <h4 className="promo-form-section-title">
            <i className="bi bi-tag-fill me-2"></i>Precio promocional
          </h4>
          {discountPercent != null && !errors.promoPrice && (
            <span className={'promo-form-discount-badge' + (discountPercent <= 0 ? ' is-zero' : '')}>
              {discountPercent > 0 && <i className="bi bi-arrow-down-short"></i>}
              {discountPercent}%
            </span>
          )}
        </header>

        {basePrice > 0 && (
          <div className="promo-form-presets">
            <span className="promo-form-presets-label">Descuentos rápidos:</span>
            {[10, 15, 20, 25, 30].map((pct) => (
              <button
                key={pct}
                type="button"
                className="promo-form-chip"
                onClick={() => applyDiscount(pct)}
              >
                −{pct}%
              </button>
            ))}
          </div>
        )}

        {mode === 'create' && (
          <div className="row g-3">
            <div className="col-12">
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
          </div>
        )}

        <div className="row g-3">
          <div className="col-md-6">
            <label htmlFor="promo-price" className="form-label">Precio (CRC)</label>
            <input
              id="promo-price"
              type="number"
              className={'form-control' + (show('promoPrice') ? ' is-invalid' : '')}
              min={0}
              step={1000}
              value={promoPrice}
              onChange={(e) => handlePriceChange(e.target.value)}
              placeholder="0"
            />
            {show('promoPrice') && <div className="invalid-feedback d-block">{errors.promoPrice}</div>}
            {!show('promoPrice') && promoPrice !== '' && basePrice > 0 && Number(promoPrice) < basePrice && (
              <div className="form-text">
                Ahorro vs. base: <strong>{fmtPriceCRC(basePrice - Number(promoPrice))}</strong>
              </div>
            )}
          </div>
          <div className="col-md-6">
            <label htmlFor="promo-discount" className="form-label">% de descuento</label>
            <div className="input-group">
              <input
                id="promo-discount"
                type="number"
                className="form-control"
                min={0}
                max={100}
                step={0.1}
                value={discountStr}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="0"
                disabled={!basePrice}
              />
              <span className="input-group-text">%</span>
            </div>
            {!basePrice && (
              <div className="form-text">Requiere precio base del itinerario.</div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Sección: Imagen ─── */}
      <section className="promo-form-section">
        <header className="promo-form-section-head">
          <h4 className="promo-form-section-title">
            <i className="bi bi-image me-2"></i>Imagen
            <span className="promo-form-section-title-optional">(opcional)</span>
          </h4>
          <div className="promo-img-mode-tabs">
            <button
              type="button"
              className={'promo-img-mode-tab' + (imageMode === 'url' ? ' active' : '')}
              onClick={() => switchImageMode('url')}
            >
              <i className="bi bi-link-45deg me-1"></i>URL
            </button>
            <button
              type="button"
              className={'promo-img-mode-tab' + (imageMode === 'file' ? ' active' : '')}
              onClick={() => switchImageMode('file')}
            >
              <i className="bi bi-folder2-open me-1"></i>Archivo
            </button>
          </div>
        </header>

        {imageMode === 'url' ? (
          <>
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
          </>
        ) : (
          <div className="promo-img-file-area">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="d-none"
              onChange={handleFileSelect}
              disabled={uploading}
            />
            <button
              type="button"
              className="promo-img-file-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Subiendo imagen…
                </>
              ) : (
                <>
                  <i className="bi bi-folder2-open me-2"></i>
                  {imageUrl ? 'Cambiar imagen' : 'Elegir imagen desde equipo'}
                </>
              )}
            </button>
            {uploadError && (
              <p className="text-danger small m-0">
                <i className="bi bi-exclamation-circle me-1"></i>{uploadError}
              </p>
            )}
          </div>
        )}

        {imageUrl && !errors.imageUrl && (
          <div className="promo-form-img-preview mt-2">
            <img src={imageUrl} alt="Vista previa" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
        )}
      </section>

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
          disabled={submitting || uploading || !flightIsValid}
        >
          {submitting && <span className="spinner-border spinner-border-sm me-2"></span>}
          {mode === 'create' ? 'Crear promoción' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}
