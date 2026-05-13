import { useState, useEffect, useMemo } from 'react';

import AirportTypeahead             from './AirportTypeahead.js';
import { listOpenFlightsByDeparture } from '../services/flightService.js';

const pad2 = (n) => String(n).padStart(2, '0');

// "dd/mm HH:MM"
function fmtDateTimeShort(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Diferencia entre dos fechas en formato "Xh Ym"
function fmtConnection(arrival, nextDeparture) {
  const a = new Date(arrival);
  const b = new Date(nextDeparture);
  const diff = b - a;
  if (isNaN(diff) || diff < 0) return '—';
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m`;
}

const MAX_CONNECTION_MS = 24 * 60 * 60 * 1000;

// Constructor visual de itinerarios.
//
// Props:
//   mode           — 'create' | 'edit'
//   initialPrice   — number (default 0). Para edit, el precio actual.
//   initialLegs    — array de "flight" (mismo shape del service /flights/open) precargado para edit.
//   onSubmit       — async (payload) → void. payload = { price, flights: [{ flightId, flightOrder }] }
//   onCancel       — opcional. En modo create resetea; en edit cierra modal.
//   successMessage — string mostrado como banner verde.
export default function ItineraryBuilder({
  mode           = 'create',
  initialPrice   = 0,
  initialLegs    = [],
  onSubmit,
  onCancel,
  successMessage,
}) {
  const [originAirport, setOriginAirport] = useState(null);
  const [legs,          setLegs]          = useState(initialLegs);
  const [price,         setPrice]         = useState(initialPrice ? String(initialPrice) : '');

  // Panel de selección activo: 'first' | 'next' | null
  // 'first' aparece tras elegir originAirport y antes del primer leg.
  // 'next'  aparece cuando el admin pulsa "Agregar siguiente tramo".
  const [pickerMode, setPickerMode] = useState(null);

  const [availableFlights, setAvailableFlights] = useState([]);
  const [loadingFlights,   setLoadingFlights]   = useState(false);
  const [flightsError,     setFlightsError]     = useState(null);

  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Si entramos en edit con legs precargados, ajustamos visualmente para que el picker arranque cerrado.
  useEffect(() => {
    if (mode === 'edit' && initialLegs.length > 0) {
      setLegs(initialLegs);
      setPickerMode(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastLeg     = legs.length > 0 ? legs[legs.length - 1] : null;
  const cursorCode  = lastLeg ? lastLeg.arrivalCode : originAirport?.code;
  const cursorCity  = lastLeg ? lastLeg.arrivalCity : originAirport?.city;

  // Vuelos del picker filtrados por conexión válida (sólo cuando es un "next").
  const filteredFlights = useMemo(() => {
    if (!lastLeg || pickerMode !== 'next') return availableFlights;
    const arrivalMs = new Date(lastLeg.arrivalDatetime).getTime();
    return availableFlights.filter((f) => {
      const dep = new Date(f.departureDatetime).getTime();
      const diff = dep - arrivalMs;
      return diff >= 0 && diff <= MAX_CONNECTION_MS;
    });
  }, [availableFlights, lastLeg, pickerMode]);

  const fetchFlightsFrom = async (code) => {
    setLoadingFlights(true);
    setFlightsError(null);
    setAvailableFlights([]);
    try {
      const data = await listOpenFlightsByDeparture(code);
      setAvailableFlights(data);
    } catch (err) {
      setFlightsError(err.message);
    } finally {
      setLoadingFlights(false);
    }
  };

  const handleOriginChange = (ap) => {
    setOriginAirport(ap);
    setLegs([]);
    setSubmitError(null);
    if (ap) {
      setPickerMode('first');
      fetchFlightsFrom(ap.code);
    } else {
      setPickerMode(null);
      setAvailableFlights([]);
    }
  };

  const handlePickFlight = (flight) => {
    setLegs((prev) => [...prev, flight]);
    setPickerMode(null);
    setAvailableFlights([]);
    setSubmitError(null);
  };

  const handleAddNext = () => {
    if (!lastLeg) return;
    setPickerMode('next');
    fetchFlightsFrom(lastLeg.arrivalCode);
  };

  const handleClosePicker = () => {
    setPickerMode(null);
    setAvailableFlights([]);
  };

  // Quita el último vuelo de la cadena.
  const handleRemoveLast = () => {
    setLegs((prev) => prev.slice(0, -1));
    setPickerMode(null);
    setAvailableFlights([]);
    setSubmitError(null);
  };

  const handleReset = () => {
    setOriginAirport(null);
    setLegs([]);
    setPrice('');
    setPickerMode(null);
    setAvailableFlights([]);
    setFlightsError(null);
    setSubmitError(null);
    onCancel?.();
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    if (legs.length < 1) {
      setSubmitError('Agrega al menos un vuelo a la cadena.');
      return;
    }
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setSubmitError('Indica un precio válido (mayor o igual a 0).');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        price: priceNum,
        flights: legs.map((f, i) => ({
          flightId:    f.flightId,
          flightOrder: i + 1,
        })),
      };
      await onSubmit(payload);

      if (mode === 'create') {
        // Reset suave: dejamos el origen para que pueda crear otro itinerario similar
        setLegs([]);
        setPrice('');
        setPickerMode(null);
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="itinerary-builder">
      {/* ─── 1. Cabecera: origen del itinerario ─── */}
      <div className="ib-section">
        <div className="ib-section-head">
          <span className="ib-section-num">1</span>
          <div>
            <h4 className="ib-section-title">Aeropuerto de salida</h4>
            <p className="ib-section-sub">¿Desde dónde inicia este itinerario?</p>
          </div>
        </div>
        <div className="ib-section-body">
          <AirportTypeahead
            id="ib-origin"
            value={originAirport}
            onChange={handleOriginChange}
          />
        </div>
      </div>

      {/* ─── 2. Cadena de vuelos (timeline) ─── */}
      {(originAirport || legs.length > 0) && (
        <div className="ib-section">
          <div className="ib-section-head">
            <span className="ib-section-num">2</span>
            <div>
              <h4 className="ib-section-title">Construcción de la ruta</h4>
              <p className="ib-section-sub">
                {legs.length === 0
                  ? 'Elige el primer vuelo de la cadena.'
                  : `${legs.length} vuelo${legs.length === 1 ? '' : 's'} en la cadena · destino actual: ${cursorCity} (${cursorCode})`}
              </p>
            </div>
          </div>

          <div className="ib-section-body">
            <div className="ib-timeline">
              {/* Nodo de inicio */}
              <div className="ib-node ib-node-airport">
                <div className="ib-node-code">{originAirport?.code ?? '—'}</div>
                <div className="ib-node-city">{originAirport?.city ?? ''}</div>
                <div className="ib-node-tag">Origen</div>
              </div>

              {legs.map((leg, idx) => {
                const nextLeg     = legs[idx + 1];
                const isLastLeg   = idx === legs.length - 1;
                return (
                  <div key={`${leg.flightId}-${idx}`} className="ib-leg-wrapper">
                    {/* Chip del vuelo */}
                    <div className="ib-connector"></div>
                    <div className="ib-leg-chip">
                      <div className="ib-leg-chip-row">
                        <span className="ib-leg-id">#{leg.flightId}</span>
                        {leg.planePlate && <span className="ib-leg-plate">{leg.planePlate}</span>}
                        {isLastLeg && (
                          <button
                            type="button"
                            className="ib-leg-remove"
                            onClick={handleRemoveLast}
                            aria-label="Quitar último vuelo"
                            title="Quitar este vuelo"
                          >
                            <i className="bi bi-x-lg"></i>
                          </button>
                        )}
                      </div>
                      <div className="ib-leg-route">
                        <span className="ib-leg-airport">
                          <span className="ib-leg-code">{leg.departureCode}</span>
                          <span className="ib-leg-time">{fmtDateTimeShort(leg.departureDatetime)}</span>
                        </span>
                        <span className="ib-leg-arrow"><i className="bi bi-arrow-right"></i></span>
                        <span className="ib-leg-airport">
                          <span className="ib-leg-code">{leg.arrivalCode}</span>
                          <span className="ib-leg-time">{fmtDateTimeShort(leg.arrivalDatetime)}</span>
                        </span>
                      </div>
                      {leg.gate && (
                        <div className="ib-leg-meta">Gate {leg.gate}</div>
                      )}
                    </div>

                    {/* Nodo intermedio (aeropuerto de llegada de este leg) */}
                    <div className="ib-connector"></div>
                    <div className={'ib-node ib-node-airport' + (isLastLeg ? ' ib-node-current' : '')}>
                      <div className="ib-node-code">{leg.arrivalCode}</div>
                      <div className="ib-node-city">{leg.arrivalCity}</div>
                      {nextLeg && (
                        <div className="ib-node-tag ib-node-tag-stop">
                          Escala · conexión {fmtConnection(leg.arrivalDatetime, nextLeg.departureDatetime)}
                        </div>
                      )}
                      {isLastLeg && (
                        <div className="ib-node-tag ib-node-tag-current">Destino actual</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTAs después de la cadena */}
            {legs.length > 0 && pickerMode !== 'next' && (
              <div className="ib-cta-row">
                <button type="button" className="btn-burgundy-outline" onClick={handleAddNext}>
                  <i className="bi bi-plus-lg me-1"></i>
                  Agregar siguiente tramo desde {cursorCode}
                </button>
                <span className="ib-cta-or">o</span>
                <span className="ib-cta-hint">
                  <i className="bi bi-check-circle me-1"></i>
                  Si {cursorCode} es el destino final, baja a fijar el precio.
                </span>
              </div>
            )}

            {/* Panel de selección de vuelo */}
            {pickerMode && (
              <div className="ib-picker">
                <div className="ib-picker-head">
                  <div>
                    <h5 className="ib-picker-title">
                      {pickerMode === 'first'
                        ? `Vuelos disponibles desde ${cursorCode}`
                        : `Conexiones desde ${cursorCode}`}
                    </h5>
                    <p className="ib-picker-sub">
                      {pickerMode === 'next'
                        ? 'Solo vuelos OPEN que salen después de la llegada anterior y dentro de las próximas 24 horas.'
                        : 'Solo vuelos en estado OPEN.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ib-picker-close"
                    onClick={handleClosePicker}
                    aria-label="Cerrar panel"
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                </div>

                {loadingFlights && (
                  <div className="ib-picker-msg">
                    <span className="spinner-border spinner-border-sm me-2"></span>Buscando vuelos…
                  </div>
                )}

                {flightsError && !loadingFlights && (
                  <div className="admin-alert admin-alert-error" role="alert">
                    <i className="bi bi-exclamation-circle-fill"></i>
                    <span>{flightsError}</span>
                  </div>
                )}

                {!loadingFlights && !flightsError && filteredFlights.length === 0 && (
                  <div className="ib-picker-empty">
                    <i className="bi bi-airplane"></i>
                    <p className="m-0">
                      {pickerMode === 'next'
                        ? `No hay conexiones válidas desde ${cursorCode} dentro de las próximas 24 horas.`
                        : `No hay vuelos OPEN saliendo de ${cursorCode}.`}
                    </p>
                  </div>
                )}

                {!loadingFlights && filteredFlights.length > 0 && (
                  <ul className="ib-picker-list">
                    {filteredFlights.map((f) => (
                      <li key={f.flightId}>
                        <button
                          type="button"
                          className="ib-picker-item"
                          onClick={() => handlePickFlight(f)}
                        >
                          <div className="ib-picker-item-main">
                            <div className="ib-picker-item-row">
                              <span className="ib-picker-flight-id">#{f.flightId}</span>
                              <span className="ib-picker-plate">{f.planePlate}</span>
                              <span className={`flight-state-badge flight-state-${f.state?.toLowerCase()}`}>
                                {f.state}
                              </span>
                            </div>
                            <div className="ib-picker-route">
                              <strong>{f.departureCode}</strong> {fmtDateTimeShort(f.departureDatetime)}
                              <i className="bi bi-arrow-right mx-2"></i>
                              <strong>{f.arrivalCode}</strong> {fmtDateTimeShort(f.arrivalDatetime)}
                              {f.gate && <span className="ib-picker-gate"> · Gate {f.gate}</span>}
                            </div>
                            <div className="ib-picker-cities">
                              {f.departureCity} → {f.arrivalCity}
                            </div>
                          </div>
                          <span className="ib-picker-add">
                            <i className="bi bi-plus-lg"></i>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── 3. Precio y submit ─── */}
      {legs.length > 0 && (
        <div className="ib-section">
          <div className="ib-section-head">
            <span className="ib-section-num">3</span>
            <div>
              <h4 className="ib-section-title">Precio base del itinerario</h4>
              <p className="ib-section-sub">
                {legs[0].departureCity} ({legs[0].departureCode}) →{' '}
                {lastLeg.arrivalCity} ({lastLeg.arrivalCode})
                {legs.length > 1 && ` · ${legs.length - 1} escala${legs.length - 1 === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>

          <div className="ib-section-body">
            <div className="ib-price-row">
              <div className="ib-price-input-wrap">
                <span className="ib-price-prefix">₡</span>
                <input
                  type="number"
                  className="form-control ib-price-input"
                  placeholder="0"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>

              <div className="ib-summary">
                <div className="ib-summary-row">
                  <span>Total de tramos</span>
                  <strong>{legs.length}</strong>
                </div>
                <div className="ib-summary-row">
                  <span>Escalas</span>
                  <strong>{Math.max(legs.length - 1, 0)}</strong>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="admin-alert admin-alert-error mt-3" role="alert">
                <i className="bi bi-exclamation-circle-fill"></i>
                <span>{submitError}</span>
              </div>
            )}

            {successMessage && (
              <div className="admin-alert admin-alert-success mt-3" role="status">
                <i className="bi bi-check-circle-fill"></i>
                <span>{successMessage}</span>
              </div>
            )}

            <div className="d-flex justify-content-end gap-2 mt-4">
              <button
                type="button"
                className="btn-burgundy-outline"
                onClick={handleReset}
                disabled={submitting}
              >
                {mode === 'edit' ? 'Cancelar' : 'Empezar de nuevo'}
              </button>
              <button
                type="button"
                className="btn-burgundy"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting && <span className="spinner-border spinner-border-sm me-2"></span>}
                {mode === 'edit' ? 'Guardar cambios' : 'Crear itinerario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
