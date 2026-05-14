import { useState } from 'react';

import AirportTypeahead   from '../components/AirportTypeahead.js';
import Modal              from '../components/Modal.js';
import PromotionForm      from '../components/PromotionForm.js';
import { searchItineraries } from '../services/itineraryService.js';
import { createPromotion }   from '../services/promotionService.js';

const pad2 = (n) => String(n).padStart(2, '0');

function fmtDateTime(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function fmtPriceCRC(n) {
  if (n == null || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
}

// Tab "Crear promoción": el admin busca itinerarios por origen+destino, los ve
// en un grid de tarjetas y elige uno para aplicarle una promoción.
export default function PromotionCreateTab() {
  const [origin,      setOrigin]      = useState(null);
  const [destination, setDestination] = useState(null);
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadError,   setLoadError]   = useState(null);
  const [touched,     setTouched]     = useState(false);

  // Itinerario seleccionado para crear promo (abre el modal)
  const [selected,     setSelected]    = useState(null);
  const [submitting,   setSubmitting]  = useState(false);
  const [submitError,  setSubmitError] = useState(null);
  const [toast,        setToast]       = useState(null);

  const canSearch = !!origin && !!destination && origin.code !== destination.code;

  const handleSearch = async () => {
    if (!canSearch) return;
    setLoading(true);
    setLoadError(null);
    setTouched(true);
    setToast(null);
    try {
      const data = await searchItineraries(origin.code, destination.code);
      setResults(data);
    } catch (err) {
      setLoadError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (payload) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await createPromotion(payload);
      setToast(`Promoción "${created.promotionCode}" creada correctamente para el itinerario #${created.itineraryId}.`);
      setSelected(null);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="admin-alert admin-alert-info mb-3" role="status">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          Busca itinerarios por origen y destino. Elige uno del grid para aplicarle un descuento,
          el período de vigencia y, opcionalmente, una imagen.
        </span>
      </div>

      <div className="admin-card">
        <div className="row g-3 align-items-end">
          <div className="col-md-5">
            <AirportTypeahead
              id="promo-origin"
              label="Origen"
              value={origin}
              onChange={setOrigin}
              exclude={destination?.code}
            />
          </div>
          <div className="col-md-5">
            <AirportTypeahead
              id="promo-destination"
              label="Destino"
              value={destination}
              onChange={setDestination}
              exclude={origin?.code}
            />
          </div>
          <div className="col-md-2 d-flex gap-2">
            <button
              type="button"
              className="btn-burgundy w-100"
              onClick={handleSearch}
              disabled={!canSearch || loading}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Buscando…</>
                : <><i className="bi bi-search me-2"></i>Buscar</>}
            </button>
          </div>
        </div>

        {toast && (
          <div className="admin-alert admin-alert-success mt-3" role="status">
            <i className="bi bi-check-circle-fill"></i>
            <span>{toast}</span>
          </div>
        )}

        {loadError && (
          <div className="admin-alert admin-alert-error mt-3" role="alert">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{loadError}</span>
          </div>
        )}

        {touched && !loading && !loadError && results.length === 0 && (
          <div className="flight-list-empty mt-3">
            <i className="bi bi-map"></i>
            <p className="m-0">
              No hay itinerarios de <strong>{origin?.code}</strong> a <strong>{destination?.code}</strong>.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="promo-itinerary-grid mt-3">
            {results.map((it) => (
              <article key={it.itineraryId} className="promo-itinerary-card">
                <header className="promo-itinerary-card-head">
                  <div className="promo-itinerary-card-route">
                    <span className="mono">{it.originCode}</span>
                    <i className="bi bi-arrow-right mx-2" aria-hidden="true"></i>
                    <span className="mono">{it.destinationCode}</span>
                  </div>
                  <span className="promo-itinerary-card-id">#{it.itineraryId}</span>
                </header>

                <dl className="promo-itinerary-card-meta">
                  <div>
                    <dt>Salida</dt>
                    <dd className="mono">{fmtDateTime(it.departureDatetime)}</dd>
                  </div>
                  <div>
                    <dt>Llegada</dt>
                    <dd className="mono">{fmtDateTime(it.arrivalDatetime)}</dd>
                  </div>
                  <div>
                    <dt>Tramos</dt>
                    <dd>
                      <span className="it-badge">
                        {it.totalFlights} {it.totalFlights === 1 ? 'directo' : 'vuelos'}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Precio base</dt>
                    <dd className="mono">{fmtPriceCRC(it.price)}</dd>
                  </div>
                </dl>

                <footer className="promo-itinerary-card-footer">
                  <button
                    type="button"
                    className="btn-burgundy w-100"
                    onClick={() => { setSubmitError(null); setSelected(it); }}
                  >
                    <i className="bi bi-tag me-2"></i>
                    Aplicar promoción
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!selected}
        onClose={submitting ? () => {} : () => setSelected(null)}
        title={selected ? `Nueva promoción para itinerario #${selected.itineraryId}` : ''}
        size="lg"
      >
        {selected && (
          <PromotionForm
            mode="create"
            itinerary={selected}
            onSubmit={handleCreate}
            onCancel={() => setSelected(null)}
            submitting={submitting}
            submitError={submitError}
          />
        )}
      </Modal>
    </div>
  );
}
