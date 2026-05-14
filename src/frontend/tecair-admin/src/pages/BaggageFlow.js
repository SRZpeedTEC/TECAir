import { useEffect, useState } from 'react';

import { searchReservations }         from '../services/reservationService.js';
import { getCheckInsByReservation }   from '../services/checkInService.js';
import { getItineraryById }           from '../services/itineraryService.js';
import {
  getBaggagesByCheckIn,
  createBaggage,
  deleteBaggage,
  feeForBagAt,
  totalFee,
} from '../services/baggageService.js';

// Flujo de control de equipajes con dos pasos:
//   1. find  → buscar reservacion y elegir un check-in ya existente
//   2. bags  → registrar maletas del pasajero
//
// Reglas de cobro (encapsuladas en baggageService.feeForBagAt):
//   1ra maleta: $0
//   2da maleta: $50
//   3ra+ maletas: $75 cada una

const MAX_WEIGHT = 32; // limite duro del backend
const WARN_WEIGHT = 23; // por encima de esto se considera sobrepeso visual

const pad2 = (n) => String(n).padStart(2, '0');
const fmtDateTime = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export default function BaggageFlow() {
  const [step, setStep] = useState('find');

  const [reservation, setReservation] = useState(null);
  const [checkIn,     setCheckIn]     = useState(null);
  const [flightInfo,  setFlightInfo]  = useState(null);

  const goToBags = (res, ci, fi) => {
    setReservation(res);
    setCheckIn(ci);
    setFlightInfo(fi);
    setStep('bags');
  };

  const reset = () => {
    setReservation(null);
    setCheckIn(null);
    setFlightInfo(null);
    setStep('find');
  };

  return (
    <div>
      <BaggageStepper step={step} />
      {step === 'find' && <FindStep onSelect={goToBags} />}
      {step === 'bags' && (
        <BagsStep
          reservation={reservation}
          checkIn={checkIn}
          flightInfo={flightInfo}
          onBack={reset}
        />
      )}
    </div>
  );
}

function BaggageStepper({ step }) {
  const steps = [
    { key: 'find', label: 'Pasajero chequeado' },
    { key: 'bags', label: 'Maletas'            },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);
  return (
    <div className="stepper mb-4">
      {steps.map((s, i) => (
        <div key={s.key} style={{ display: 'contents' }}>
          <div className={'step d-flex align-items-center ' + (i === activeIndex ? 'active' : i < activeIndex ? 'done' : '')}>
            <div className="step-dot">{i < activeIndex ? <i className="bi bi-check"></i> : i + 1}</div>
            <span className="step-label d-none d-md-inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className={'step-line ' + (i < activeIndex ? 'done' : '')}></div>}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Paso 1: encontrar al pasajero ya chequeado.
// Busca reservacion por pasaporte/nombre y, dentro de los check-ins
// existentes para esa reserva, deja elegir el vuelo donde se entregaran
// las maletas.
// ──────────────────────────────────────────────────────────
function FindStep({ onSelect }) {
  const [mode, setMode]     = useState('passport');
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [touched, setTouched] = useState(false);

  // Cache por reservationId → { checkIns, itinerary, loading, error }.
  const [details, setDetails] = useState({});

  const canSearch = query.trim().length > 0 && !loading;

  const submit = async (e) => {
    e?.preventDefault?.();
    if (!canSearch) return;
    setLoading(true);
    setError(null);
    setTouched(true);
    try {
      const data = await searchReservations(
        mode === 'passport' ? { passengerId: query.trim() } : { name: query.trim() }
      );
      setResults(data);
      setDetails({});
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Carga check-ins + itinerario al expandir una fila por primera vez.
  const expand = async (reservationId, itineraryId) => {
    if (details[reservationId]) return; // ya cargado o cargando
    setDetails((prev) => ({ ...prev, [reservationId]: { loading: true } }));
    try {
      const [checkIns, itinerary] = await Promise.all([
        getCheckInsByReservation(reservationId),
        getItineraryById(itineraryId),
      ]);
      itinerary.flights.sort((a, b) => a.flightOrder - b.flightOrder);
      setDetails((prev) => ({
        ...prev,
        [reservationId]: { loading: false, checkIns, itinerary },
      }));
    } catch (err) {
      setDetails((prev) => ({
        ...prev,
        [reservationId]: { loading: false, error: err.message },
      }));
    }
  };

  return (
    <div className="admin-card">
      <div className="admin-alert admin-alert-info mb-3" role="status">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          Las maletas se asignan al <strong>check-in</strong> del pasajero. Primero busca su
          reservación y luego elige el tramo donde ya hizo check-in.
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
        <div className="mt-3 d-flex flex-column gap-3">
          {results.map((r) => (
            <ReservationCard
              key={r.reservationId}
              reservation={r}
              detail={details[r.reservationId]}
              onExpand={() => expand(r.reservationId, r.itineraryId)}
              onPick={(ci, flightInfo) => onSelect(r, ci, flightInfo)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationCard({ reservation, detail, onExpand, onPick }) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    if (!open) onExpand();
    setOpen((v) => !v);
  };

  return (
    <div className="admin-card" style={{ padding: '1rem 1.25rem' }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <div className="serif fs-5">{reservation.passengerName}</div>
          <div className="text-muted-small">
            Reserva <span className="mono">#{reservation.reservationId}</span> ·{' '}
            Pasaporte <span className="mono">{reservation.passengerId}</span> ·{' '}
            Itinerario <span className="mono">#{reservation.itineraryId}</span>
          </div>
        </div>
        <button
          type="button"
          className="btn-burgundy-outline"
          onClick={toggle}
          aria-expanded={open}
        >
          {open ? <>Ocultar check-ins <i className="bi bi-chevron-up ms-1"></i></>
                : <>Ver check-ins <i className="bi bi-chevron-down ms-1"></i></>}
        </button>
      </div>

      {open && (
        <div className="mt-3">
          {!detail || detail.loading ? (
            <div className="ib-picker-msg">
              <span className="spinner-border spinner-border-sm me-2"></span>
              Cargando check-ins…
            </div>
          ) : detail.error ? (
            <div className="admin-alert admin-alert-error" role="alert">
              <i className="bi bi-exclamation-circle-fill"></i>
              <span>{detail.error}</span>
            </div>
          ) : detail.checkIns.length === 0 ? (
            <div className="admin-alert admin-alert-info" role="status">
              <i className="bi bi-info-circle-fill"></i>
              <span>
                Esta reservación aún no tiene check-ins. Ve a la pestaña{' '}
                <strong>Chequeo de Pasajeros</strong> para registrar uno antes de asignar maletas.
              </span>
            </div>
          ) : (
            <div className="flight-list-table-wrap">
              <table className="flight-list-table">
                <thead>
                  <tr>
                    <th>Confirmación</th>
                    <th>Tramo</th>
                    <th>Origen → Destino</th>
                    <th>Salida</th>
                    <th>Asiento</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.checkIns.map((ci) => {
                    const f = detail.itinerary.flights.find(
                      (x) => x.itineraryFlightId === ci.itineraryFlightId
                    );
                    return (
                      <tr key={ci.confirmationNumber}>
                        <td className="mono">#{ci.confirmationNumber}</td>
                        <td className="mono">{f?.flightOrder ?? '—'}</td>
                        <td className="mono">
                          {f ? `${f.departureCode} → ${f.arrivalCode}` : '—'}
                        </td>
                        <td className="mono">{f ? fmtDateTime(f.departureDatetime) : '—'}</td>
                        <td><span className="it-badge">Asiento {ci.seatNumber}</span></td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="btn-burgundy"
                            onClick={() => onPick(ci, f)}
                          >
                            Maletas <i className="bi bi-arrow-right ms-1"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Paso 2: balanza interactiva para registrar maletas.
// ──────────────────────────────────────────────────────────
function BagsStep({ reservation, checkIn, flightInfo, onBack }) {
  const [bags, setBags]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const [weight, setWeight]   = useState(15);
  const [color,  setColor]    = useState('');

  const [saving, setSaving]   = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [justAdded, setJustAdded] = useState(null); // bagNumber recien creado, para animar

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBaggagesByCheckIn(checkIn.confirmationNumber);
      setBags(data);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar las maletas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIn.confirmationNumber]);

  const nextBagIndex = bags.length + 1;
  const nextBagFee   = feeForBagAt(nextBagIndex);
  const totalSoFar   = totalFee(bags.length);
  const totalAfter   = totalFee(nextBagIndex);

  const overweight = weight > WARN_WEIGHT;
  const tooHeavy   = weight > MAX_WEIGHT;

  const canSubmit = !saving && !tooHeavy && weight > 0 && color.trim().length > 0;

  const addBag = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setSaveError(null);
    try {
      const created = await createBaggage({
        confirmationNumber: checkIn.confirmationNumber,
        weight,
        color: color.trim(),
      });
      setBags((prev) => [...prev, created]);
      setJustAdded(created.bagNumber);
      setColor('');
      setTimeout(() => setJustAdded(null), 1200);
    } catch (err) {
      setSaveError(err.message || 'No se pudo registrar la maleta.');
    } finally {
      setSaving(false);
    }
  };

  const removeBag = async (bagNumber) => {
    if (!window.confirm('¿Eliminar esta maleta del registro?')) return;
    try {
      await deleteBaggage(bagNumber);
      setBags((prev) => prev.filter((b) => b.bagNumber !== bagNumber));
    } catch (err) {
      setSaveError(err.message || 'No se pudo eliminar la maleta.');
    }
  };

  return (
    <div className="admin-card">
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <div className="text-muted-small">Maletas de</div>
          <div className="serif fs-5">{reservation.passengerName}</div>
          <div className="text-muted-small">
            Confirmación <span className="mono">#{checkIn.confirmationNumber}</span> ·{' '}
            Asiento <span className="mono">{checkIn.seatNumber}</span>
            {flightInfo && (
              <>
                {' '}· Vuelo{' '}
                <span className="mono">
                  {flightInfo.departureCode} → {flightInfo.arrivalCode}
                </span>{' '}
                · <span className="mono">{fmtDateTime(flightInfo.departureDatetime)}</span>
              </>
            )}
          </div>
        </div>
        <button type="button" className="btn-burgundy-outline" onClick={onBack}>
          <i className="bi bi-arrow-left me-2"></i>Cambiar pasajero
        </button>
      </div>

      {error && (
        <div className="admin-alert admin-alert-error mb-3" role="alert">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="ib-picker-msg">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Cargando maletas registradas…
        </div>
      ) : (
        <div className="row g-4">
          {/* Columna izquierda: formulario de nueva maleta */}
          <div className="col-lg-6">
            <h6 className="serif mb-2">Registrar nueva maleta</h6>
            <p className="text-muted-small mb-3">
              Indica peso y color. El peso máximo permitido es {MAX_WEIGHT} kg.
            </p>

            <div className="mb-3">
              <label className="form-label small text-muted d-flex justify-content-between">
                <span>Peso</span>
                <span className={'mono ' + (tooHeavy ? 'text-danger' : overweight ? 'text-warning' : '')}>
                  {weight.toFixed(1)} kg
                  {tooHeavy
                    ? ' · excede límite'
                    : overweight
                      ? ' · sobrepeso'
                      : ''}
                </span>
              </label>
              <input
                type="range"
                min="0.5"
                max={MAX_WEIGHT}
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className={'bag-weight-slider ' + (tooHeavy ? 'over' : overweight ? 'warn' : '')}
                aria-label="Peso de la maleta"
              />
              <div className="d-flex justify-content-between text-muted-small mono mt-1">
                <span>0</span><span>23</span><span>{MAX_WEIGHT}</span>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small text-muted">Color</label>
              <input
                type="text"
                className="form-control"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ej. Negro, azul marino, rojo…"
                maxLength={40}
              />
            </div>

            <FeePreview
              nextBagIndex={nextBagIndex}
              nextBagFee={nextBagFee}
              totalSoFar={totalSoFar}
              totalAfter={totalAfter}
            />

            {saveError && (
              <div className="admin-alert admin-alert-error mt-3" role="alert">
                <i className="bi bi-exclamation-circle-fill"></i>
                <span>{saveError}</span>
              </div>
            )}

            <button
              type="button"
              className="btn-burgundy w-100 mt-3"
              disabled={!canSubmit}
              onClick={addBag}
            >
              {saving
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Registrando maleta…</>
                : <><i className="bi bi-plus-lg me-2"></i>Registrar maleta #{nextBagIndex}
                    {nextBagFee > 0 ? <span className="ms-2 opacity-75">(+${nextBagFee})</span> : <span className="ms-2 opacity-75">(gratis)</span>}
                  </>}
            </button>
          </div>

          {/* Columna derecha: maletas registradas */}
          <div className="col-lg-6">
            <div className="d-flex justify-content-between align-items-baseline">
              <h6 className="serif mb-2">Maletas registradas</h6>
              <span className="text-muted-small">
                {bags.length} maleta{bags.length === 1 ? '' : 's'}
              </span>
            </div>

            {bags.length === 0 ? (
              <div className="flight-list-empty">
                <i className="bi bi-luggage"></i>
                <p className="m-0">Aún no hay maletas registradas para este pasajero.</p>
              </div>
            ) : (
              <ul className="bag-list">
                {bags.map((b, i) => (
                  <BagListItem
                    key={b.bagNumber}
                    bag={b}
                    position={i + 1}
                    fee={feeForBagAt(i + 1)}
                    isNew={justAdded === b.bagNumber}
                    onDelete={() => removeBag(b.bagNumber)}
                  />
                ))}
              </ul>
            )}

            <div className="bag-total-card">
              <div>
                <div className="text-muted-small">Cobro adicional total</div>
                <div className="bag-total-amount">${totalSoFar}</div>
              </div>
              <div className="bag-fee-breakdown">
                {bags.length === 0 && <span>—</span>}
                {bags.map((_, i) => {
                  const f = feeForBagAt(i + 1);
                  return (
                    <span key={i} className={'fee-pill ' + (f === 0 ? 'free' : '')}>
                      {f === 0 ? 'Gratis' : `+$${f}`}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeePreview({ nextBagIndex, nextBagFee, totalSoFar, totalAfter }) {
  return (
    <div className="bag-fee-preview mt-3">
      <div className="bag-fee-row">
        <span className="text-muted-small">Maleta #{nextBagIndex} costará</span>
        <span className={'fee-pill ' + (nextBagFee === 0 ? 'free' : '')}>
          {nextBagFee === 0 ? 'Gratis' : `+$${nextBagFee}`}
        </span>
      </div>
      <div className="bag-fee-row">
        <span className="text-muted-small">Total acumulado</span>
        <span className="bag-fee-amounts mono">
          ${totalSoFar} <i className="bi bi-arrow-right mx-1"></i>{' '}
          <strong>${totalAfter}</strong>
        </span>
      </div>
    </div>
  );
}

function BagListItem({ bag, position, fee, isNew, onDelete }) {
  return (
    <li className={'bag-list-item' + (isNew ? ' just-added' : '')}>
      <div className="bag-list-icon">
        <i className="bi bi-suitcase-fill"></i>
      </div>
      <div className="bag-list-body">
        <div className="bag-list-title">
          Maleta <span className="mono">#{bag.bagNumber}</span>
          <span className="bag-list-pos mono">· {position}ª</span>
        </div>
        <div className="text-muted-small">
          <span className="mono">{bag.weight.toFixed(1)} kg</span> · {bag.color}
        </div>
      </div>
      <div className="bag-list-right">
        <span className={'fee-pill ' + (fee === 0 ? 'free' : '')}>
          {fee === 0 ? 'Gratis' : `+$${fee}`}
        </span>
        <button
          type="button"
          className="btn-icon-danger"
          onClick={onDelete}
          title="Eliminar maleta"
          aria-label="Eliminar maleta"
        >
          <i className="bi bi-trash"></i>
        </button>
      </div>
    </li>
  );
}
