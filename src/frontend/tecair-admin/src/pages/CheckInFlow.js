import { useState, useMemo } from 'react';

import SeatIcon                from '../components/SeatIcon.js';
import { searchReservations } from '../services/reservationService.js';
import { getItineraryById }   from '../services/itineraryService.js';

// Flujo de check-in con cuatro pasos:
//   1. search    → buscar reservacion por pasaporte o nombre
//   2. flight    → elegir vuelo OPEN del itinerario asociado
//   3. seat      → elegir asiento en el mapa del avion (mock por ahora)
//   4. confirm   → resumen final del check-in registrado
//
// El componente mantiene todo el estado en memoria y no persiste todavia el
// check-in en backend (los asientos ocupados son datos mock).

const ROWS    = 30;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

const pad2 = (n) => String(n).padStart(2, '0');
const fmtDateTime = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export default function CheckInFlow() {
  const [step, setStep] = useState('search');

  // Estado compartido entre pasos
  const [reservation, setReservation] = useState(null);
  const [itinerary,   setItinerary]   = useState(null);
  const [flight,      setFlight]      = useState(null);
  const [seat,        setSeat]        = useState(null);

  // Numero de confirmacion mock que se muestra al finalizar
  const [confirmationNumber, setConfirmationNumber] = useState(null);

  const goToFlight = async (res) => {
    setReservation(res);
    setItinerary(null);
    setStep('flight');
    try {
      const detail = await getItineraryById(res.itineraryId);
      detail.flights.sort((a, b) => a.flightOrder - b.flightOrder);
      setItinerary(detail);
    } catch (err) {
      setItinerary({ error: err.message });
    }
  };

  const goToSeat = (f) => {
    setFlight(f);
    setSeat(null);
    setStep('seat');
  };

  const finishCheckIn = () => {
    // Mock del numero de confirmacion mientras backend no acepta la creacion completa.
    setConfirmationNumber(Math.floor(Math.random() * 900000 + 100000));
    setStep('confirm');
  };

  const reset = () => {
    setReservation(null);
    setItinerary(null);
    setFlight(null);
    setSeat(null);
    setConfirmationNumber(null);
    setStep('search');
  };

  return (
    <div>
      <CheckInStepper step={step} />

      {step === 'search'  && <SearchStep onSelect={goToFlight} />}
      {step === 'flight'  && (
        <FlightStep
          reservation={reservation}
          itinerary={itinerary}
          onBack={() => setStep('search')}
          onSelect={goToSeat}
        />
      )}
      {step === 'seat'    && (
        <SeatStep
          reservation={reservation}
          flight={flight}
          seat={seat}
          onSeat={setSeat}
          onBack={() => setStep('flight')}
          onConfirm={finishCheckIn}
        />
      )}
      {step === 'confirm' && (
        <ConfirmStep
          reservation={reservation}
          flight={flight}
          seat={seat}
          confirmationNumber={confirmationNumber}
          onNew={reset}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Barra de progreso especifica del flujo de check-in.
// ──────────────────────────────────────────────────────────
function CheckInStepper({ step }) {
  const steps = [
    { key: 'search',  label: 'Reservación' },
    { key: 'flight',  label: 'Vuelo'       },
    { key: 'seat',    label: 'Asiento'     },
    { key: 'confirm', label: 'Confirmación' },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="stepper mb-4">
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: 'contents' }}>
          <div className={'step d-flex align-items-center ' + (i === activeIndex ? 'active' : i < activeIndex ? 'done' : '')}>
            <div className="step-dot">
              {i < activeIndex ? <i className="bi bi-check"></i> : i + 1}
            </div>
            <span className="step-label d-none d-md-inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={'step-line ' + (i < activeIndex ? 'done' : '')}></div>
          )}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Paso 1: buscar reservaciones por pasaporte o nombre.
// Reutiliza el endpoint GET /api/reservations/search ya existente.
// ──────────────────────────────────────────────────────────
function SearchStep({ onSelect }) {
  const [mode,      setMode]      = useState('passport'); // 'passport' | 'name'
  const [query,     setQuery]     = useState('');
  const [results,   setResults]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [touched,   setTouched]   = useState(false);

  const canSearch = query.trim().length > 0 && !loading;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setTouched(true);
    try {
      const data = await searchReservations(
        mode === 'passport'
          ? { passengerId: query.trim() }
          : { name: query.trim() }
      );
      setResults(data);
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-alert admin-alert-info mb-3" role="status">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          Busca la reservación del pasajero por pasaporte o nombre. Luego se mostrarán los
          vuelos del itinerario para hacer check-in en el que esté <strong>OPEN</strong>.
        </span>
      </div>

      <form onSubmit={submit}>
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label small text-muted">Buscar por</label>
            <select
              className="form-select"
              value={mode}
              onChange={(e) => { setMode(e.target.value); setResults([]); setTouched(false); }}
            >
              <option value="passport">Pasaporte</option>
              <option value="name">Nombre</option>
            </select>
          </div>
          <div className="col-md-7">
            <label className="form-label small text-muted">
              {mode === 'passport' ? 'Número de pasaporte' : 'Nombre o apellido'}
            </label>
            <input
              type="text"
              className="form-control"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'passport' ? 'A12345678' : 'María'}
              autoFocus
            />
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn-burgundy w-100" disabled={!canSearch}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Buscando…</>
                : <><i className="bi bi-search me-2"></i>Buscar</>}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="admin-alert admin-alert-error mt-3" role="alert">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{error}</span>
        </div>
      )}

      {touched && !loading && !error && results.length === 0 && (
        <div className="flight-list-empty mt-3">
          <i className="bi bi-person-x"></i>
          <p className="m-0">No se encontraron reservaciones para esa búsqueda.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="flight-list-table-wrap mt-3">
          <table className="flight-list-table">
            <thead>
              <tr>
                <th>Reserva</th>
                <th>Pasajero</th>
                <th>Pasaporte</th>
                <th>Itinerario</th>
                <th>Estado</th>
                <th className="text-end">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.reservationId}>
                  <td className="mono">#{r.reservationId}</td>
                  <td>{r.passengerName}</td>
                  <td className="mono">{r.passengerId}</td>
                  <td className="mono">#{r.itineraryId}</td>
                  <td>
                    <span className="it-badge">{r.state}</span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn-burgundy"
                      onClick={() => onSelect(r)}
                    >
                      Seleccionar <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Paso 2: elegir un vuelo OPEN del itinerario asociado.
// ──────────────────────────────────────────────────────────
function FlightStep({ reservation, itinerary, onBack, onSelect }) {
  if (!itinerary) {
    return (
      <div className="admin-card">
        <div className="ib-picker-msg">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Cargando itinerario…
        </div>
      </div>
    );
  }

  if (itinerary.error) {
    return (
      <div className="admin-card">
        <div className="admin-alert admin-alert-error" role="alert">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{itinerary.error}</span>
        </div>
        <button type="button" className="btn-burgundy-outline mt-3" onClick={onBack}>
          <i className="bi bi-arrow-left me-2"></i>Volver
        </button>
      </div>
    );
  }

  return (
    <div className="admin-card">
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <div className="text-muted-small">Pasajero</div>
          <div className="serif fs-5">{reservation.passengerName}</div>
          <div className="text-muted-small">
            Reserva <span className="mono">#{reservation.reservationId}</span> · Itinerario{' '}
            <span className="mono">#{itinerary.itineraryId}</span>
          </div>
        </div>
        <button type="button" className="btn-burgundy-outline" onClick={onBack}>
          <i className="bi bi-arrow-left me-2"></i>Cambiar reserva
        </button>
      </div>

      <h6 className="serif mb-2">Vuelos del itinerario</h6>
      <p className="text-muted-small mb-3">
        Solo los vuelos en estado <strong>OPEN</strong> permiten check-in.
      </p>

      <div className="flight-list-table-wrap">
        <table className="flight-list-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Salida</th>
              <th>Llegada</th>
              <th>Puerta</th>
              <th>Estado</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {itinerary.flights.map((f) => {
              const isOpen = (f.state || '').toUpperCase() === 'OPEN';
              return (
                <tr key={f.flightOrder}>
                  <td className="mono">{f.flightOrder}</td>
                  <td className="mono">{f.departureCode}</td>
                  <td className="mono">{f.arrivalCode}</td>
                  <td className="mono">{fmtDateTime(f.departureDatetime)}</td>
                  <td className="mono">{fmtDateTime(f.arrivalDatetime)}</td>
                  <td className="mono">{f.gate ?? '—'}</td>
                  <td>
                    <span className={'it-badge ' + (isOpen ? '' : 'it-badge-muted')}>
                      {f.state}
                    </span>
                  </td>
                  <td className="text-end">
                    <button
                      type="button"
                      className="btn-burgundy"
                      disabled={!isOpen}
                      onClick={() => onSelect(f)}
                      title={isOpen ? 'Hacer check-in en este vuelo' : 'Vuelo cerrado'}
                    >
                      Check-in <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Paso 3: mapa de asientos del avion. Mock occupancy.
// ──────────────────────────────────────────────────────────
function SeatStep({ reservation, flight, seat, onSeat, onBack, onConfirm }) {
  // Set de asientos "ocupados" generado de forma deterministica por flightId,
  // de modo que el mismo vuelo siempre muestre la misma disposicion.
  const occupiedSet = useMemo(() => {
    const s    = new Set();
    const seed = Number(flight.flightId) || 0;
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 0; c < 6; c++) {
        if ((r * 7 + c * 3 + seed) % 11 < 3) s.add(`${r}${LETTERS[c]}`);
      }
    }
    return s;
  }, [flight.flightId]);

  const pickSeat = (id) => {
    if (occupiedSet.has(id)) return;
    onSeat(seat === id ? null : id);
  };

  return (
    <div className="admin-card">
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <div className="text-muted-small">Asignando asiento a</div>
          <div className="serif fs-5">{reservation.passengerName}</div>
          <div className="text-muted-small">
            Vuelo <span className="mono">#{flight.flightId}</span> ·{' '}
            <span className="mono">{flight.departureCode}</span> →{' '}
            <span className="mono">{flight.arrivalCode}</span> ·{' '}
            <span className="mono">{fmtDateTime(flight.departureDatetime)}</span>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn-burgundy-outline" onClick={onBack}>
            <i className="bi bi-arrow-left me-2"></i>Cambiar vuelo
          </button>
          <button
            type="button"
            className="btn-burgundy"
            disabled={!seat}
            onClick={onConfirm}
          >
            Confirmar asiento{seat ? ` ${seat}` : ''} <i className="bi bi-check2 ms-1"></i>
          </button>
        </div>
      </div>

      <div className="admin-alert admin-alert-info mb-3" role="status">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          Selecciona un asiento disponible. Los datos de ocupación son simulados mientras
          se conecta el endpoint de disponibilidad real.
        </span>
      </div>

      {/* Leyenda */}
      <div className="d-flex gap-3 small mb-3 align-items-center flex-wrap">
        <span className="d-flex align-items-center gap-1"><SeatIcon variant="available" size={22} /> Disponible</span>
        <span className="d-flex align-items-center gap-1"><SeatIcon variant="selected"  size={22} /> Asiento elegido</span>
        <span className="d-flex align-items-center gap-1"><SeatIcon variant="occupied"  size={22} /> Ocupado</span>
      </div>

      <div className="fuselage-wrap">
        <div className="fuselage">
          <div className="text-center small text-muted mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Frente del avión
          </div>

          <div className="d-flex justify-content-center align-items-center gap-1 mb-2">
            <div className="row-label"></div>
            {LETTERS.slice(0, 3).map((l) => <div key={l} className="seat-label">{l}</div>)}
            <div className="row-label"></div>
            {LETTERS.slice(3).map((l) => <div key={l} className="seat-label">{l}</div>)}
          </div>

          {Array.from({ length: ROWS }, (_, r) => {
            const row = r + 1;
            return (
              <div key={row}>
                {row === 12 && (
                  <div className="d-flex align-items-center my-2" style={{ justifyContent: 'space-between' }}>
                    <span style={{ flex: 1, borderTop: '1px dashed var(--burgundy-line)' }}></span>
                    <span className="px-2" style={{ color: 'var(--burgundy)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.68rem', fontWeight: 600 }}>
                      <i className="bi bi-door-open me-1"></i>Salida emergencia
                    </span>
                    <span style={{ flex: 1, borderTop: '1px dashed var(--burgundy-line)' }}></span>
                  </div>
                )}
                <div className="d-flex justify-content-center align-items-center gap-1 mb-1">
                  <div className="row-label">{row}</div>
                  {LETTERS.slice(0, 3).map((l) => renderSeatBtn(row, l, occupiedSet, seat, pickSeat))}
                  <div className="row-label">{row}</div>
                  {LETTERS.slice(3).map((l) => renderSeatBtn(row, l, occupiedSet, seat, pickSeat))}
                </div>
              </div>
            );
          })}

          <div className="text-center small text-muted mt-3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Cola del avión
          </div>
        </div>
      </div>
    </div>
  );
}

function renderSeatBtn(row, letter, occupiedSet, seat, pickSeat) {
  const id      = `${row}${letter}`;
  const isOcc   = occupiedSet.has(id);
  const variant = isOcc ? 'occupied' : seat === id ? 'selected' : 'available';
  return (
    <button
      key={id}
      type="button"
      className={'seat-btn' + (isOcc ? ' occupied' : '')}
      onClick={() => pickSeat(id)}
      title={id}
    >
      <SeatIcon variant={variant} />
    </button>
  );
}

// ──────────────────────────────────────────────────────────
// Paso 4: resumen del check-in con datos clave para el pase de abordar.
// El pase de abordar (impresion/correo/movil) se implementara en la
// siguiente iteracion.
// ──────────────────────────────────────────────────────────
function ConfirmStep({ reservation, flight, seat, confirmationNumber, onNew }) {
  return (
    <div className="admin-card text-center" style={{ maxWidth: 640, margin: '0 auto' }}>
      <div
        className="d-inline-flex align-items-center justify-content-center mb-3"
        style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--burgundy-soft)', color: 'var(--burgundy)', fontSize: '2rem' }}
      >
        <i className="bi bi-check2"></i>
      </div>

      <h3 className="serif mb-1">Check-in registrado</h3>
      <p className="text-muted-small mb-4">
        Confirmación <span className="mono">#{confirmationNumber}</span> · El asiento queda asignado para este vuelo.
      </p>

      <div className="admin-card text-start mb-3" style={{ borderColor: 'var(--burgundy-line)' }}>
        <div className="row g-3">
          <div className="col-6">
            <div className="text-muted-small">Pasajero</div>
            <div className="fw-semibold">{reservation.passengerName}</div>
            <div className="text-muted-small mono">{reservation.passengerId}</div>
          </div>
          <div className="col-6">
            <div className="text-muted-small">Reservación</div>
            <div className="mono">#{reservation.reservationId}</div>
          </div>
          <div className="col-6">
            <div className="text-muted-small">Vuelo</div>
            <div className="mono">#{flight.flightId}</div>
            <div className="text-muted-small mono">{flight.departureCode} → {flight.arrivalCode}</div>
          </div>
          <div className="col-6">
            <div className="text-muted-small">Salida</div>
            <div className="mono">{fmtDateTime(flight.departureDatetime)}</div>
          </div>
          <div className="col-6">
            <div className="text-muted-small">Puerta</div>
            <div className="mono">{flight.gate ?? '—'}</div>
          </div>
          <div className="col-6">
            <div className="text-muted-small">Asiento</div>
            <div className="serif fs-4 text-burgundy">{seat}</div>
          </div>
        </div>
      </div>

      <div className="admin-alert admin-alert-info mb-3" role="status">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          El envío del pase de abordar (impresión, correo o móvil) se implementará en la
          siguiente iteración.
        </span>
      </div>

      <button type="button" className="btn-burgundy" onClick={onNew}>
        <i className="bi bi-arrow-clockwise me-2"></i>Nuevo check-in
      </button>
    </div>
  );
}
