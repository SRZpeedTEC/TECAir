import { useState } from 'react';
import AirportTypeahead from '../components/AirportTypeahead.jsx';
import DatePicker from '../components/DatePicker.jsx';
import { getItineraryAvailability, searchPublicItinerariesWithPromotions } from '../services/itineraryService.js';
import { createPassenger, mapGenderToCode } from '../services/passengerService.js';
import { createReservation, generatePaymentReference } from '../services/reservationService.js';
import { buildReceiptDataFromAdminProps, printReceipt } from '../utils/receipt.js';

// Página unificada de búsqueda + reservación de vuelos para la Vista Aeropuerto.
// Reproduce el flujo del cliente (Inicio → Resultados → Pasajeros → Confirmación)
// pero más minimalista: sin promociones ni selección de asientos. Demuestra que la
// admin view consume exactamente los mismos endpoints que la client view.
//
// El admin captura el correo del cliente que ya tiene cuenta; ese email se envía
// al backend como user_email de la reservación.

const STEPS = ['Búsqueda', 'Resultados', 'Pasajeros', 'Confirmación'];

const fmtCRC = (n) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n ?? 0);

const fmtTime = (d) =>
  d.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit', hour12: false });

const calcDuration = (dep, arr) => {
  const ms = arr - dep;
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${h}h ${m}m`;
};

// Texto de escalas: "Directo", "Escala en JFK", "Escalas en JFK, DXB".
const stopsLabel = (stops) => {
  if (!Array.isArray(stops) || stops.length === 0) return 'Directo';
  const codes = stops.map((s) => s.code).filter(Boolean).join(', ');
  if (!codes) return `${stops.length} escala${stops.length > 1 ? 's' : ''}`;
  return stops.length === 1 ? `Escala en ${codes}` : `Escalas en ${codes}`;
};

// Lista de tramos de un itinerario con horarios y ruta de cada vuelo.
function SegmentList({ segments }) {
  if (!Array.isArray(segments) || segments.length === 0) return null;
  return (
    <div className="border rounded-3 p-2 mt-2" style={{ borderColor: 'var(--line)' }}>
      {segments.map((s, i) => {
        const dep = new Date(s.departureDatetime);
        const arr = new Date(s.arrivalDatetime);
        const hasTime = !isNaN(dep.getTime()) && !isNaN(arr.getTime());
        return (
          <div
            key={s.flightId ?? i}
            className={i > 0 ? 'mt-2 pt-2 border-top' : ''}
            style={i > 0 ? { borderColor: 'var(--line)' } : undefined}
          >
            <div className="small fw-semibold">{s.departureCode} → {s.arrivalCode}</div>
            <div className="small text-muted">{s.departureCity} — {s.arrivalCity}</div>
            {hasTime && (
              <div className="small text-muted">{fmtTime(dep)} — {fmtTime(arr)}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const EMPTY_PASSENGER = { firstName: '', lastName: '', passport: '', dob: '', gender: '' };

export default function ReservacionVuelosPage() {
  const [step, setStep] = useState(0);

  // Paso 1 — búsqueda
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [depart, setDepart] = useState('');
  const [adults, setAdults] = useState(1);
  const [searchErrs, setSearchErrs] = useState({});

  // Paso 2 — resultados
  const [itineraries, setItineraries] = useState([]);
  const [loadingItineraries, setLoadingItineraries] = useState(false);
  const [itinerariesError, setItinerariesError] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);

  // Paso 3 — pasajeros + email del cliente
  const [clientEmail, setClientEmail] = useState('');
  const [paxList, setPaxList] = useState([{ ...EMPTY_PASSENGER }]);
  const [paxErrs, setPaxErrs] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Paso 4 — confirmación
  const [reservations, setReservations] = useState([]);

  // ── Paso 1 → Paso 2 ─────────────────────────────────────────────────────
  const runSearch = async () => {
    const errs = {};
    if (!from) errs.from = true;
    if (!to) errs.to = true;
    if (!depart) errs.depart = true;
    if (adults < 1) errs.adults = true;
    setSearchErrs(errs);
    if (Object.keys(errs).length > 0) return;

    setLoadingItineraries(true);
    setItinerariesError(null);
    setItineraries([]);
    setSelectedFlight(null);
    try {
      // El servicio ya devuelve activePromotion / basePrice / displayPrice
      // embebidos por itinerario — un único GET (sin cruce client-side).
      const data = await searchPublicItinerariesWithPromotions(from.code, to.code);
      const enriched = data.map((it) => {
        const dep = new Date(it.departureDatetime);
        const arr = new Date(it.arrivalDatetime);
        return {
          ...it,
          depart: fmtTime(dep),
          arrive: fmtTime(arr),
          duration: calcDuration(dep, arr),
          stops: Math.max(0, (it.totalFlights ?? 1) - 1),
        };
      });
      setItineraries(enriched);
      setStep(1);
    } catch (err) {
      setItinerariesError(err.message ?? 'No se pudieron cargar los itinerarios.');
    } finally {
      setLoadingItineraries(false);
    }
  };

  // ── Paso 2 → Paso 3 ─────────────────────────────────────────────────────
  const selectItinerary = (it) => {
    // Si hay promoción activa, el precio efectivo es el promocional.
    setSelectedFlight({
      ...it,
      price: it.displayPrice ?? it.price,
      basePrice: it.basePrice ?? it.price,
      activePromotion: it.activePromotion ?? null,
    });
    setPaxList(Array.from({ length: adults }, () => ({ ...EMPTY_PASSENGER })));
    setStep(2);
  };

  // ── Paso 3 helpers ──────────────────────────────────────────────────────
  const updatePax = (i, key, val) => {
    const next = [...paxList];
    next[i] = { ...next[i], [key]: val };
    setPaxList(next);
  };

  const validatePax = () => {
    const e = {};
    if (!clientEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      e.clientEmail = true;
    }
    paxList.forEach((p, i) => {
      if (!p.firstName) e[i + 'firstName'] = true;
      if (!p.lastName) e[i + 'lastName'] = true;
      if (!p.passport || p.passport.length < 6) e[i + 'passport'] = true;
      if (!p.dob) e[i + 'dob'] = true;
      if (!p.gender) e[i + 'gender'] = true;
    });
    setPaxErrs(e);
    return Object.keys(e).length === 0;
  };

  // ── Paso 3 → Paso 4 ─────────────────────────────────────────────────────
  const confirmReservation = async () => {
    if (!validatePax()) return;
    if (!selectedFlight?.itineraryId) {
      setSubmitError('No hay itinerario seleccionado.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const userEmail = clientEmail.trim().toLowerCase();
      const created = [];
      const availability = await getItineraryAvailability(selectedFlight.itineraryId, paxList.length);
      if (!availability.canReserve) {
        setSubmitError('El itinerario seleccionado no tiene suficientes espacios disponibles.');
        return;
      }

      for (let i = 0; i < paxList.length; i++) {
        const p = paxList[i];
        const passportId = p.passport.trim().toUpperCase();

        // 1) Asegura el pasajero. 409 = ya existe, lo reusamos.
        try {
          await createPassenger({
            passportId,
            birthday: p.dob,
            gender: mapGenderToCode(p.gender),
            name: p.firstName.trim(),
            lname: p.lastName.trim(),
          });
        } catch (err) {
          if (!/409|already exists|exists with that passport|conflict/i.test(err.message)) {
            throw err;
          }
        }

        // 2) Reserva pagada para este pasajero.
        const reservation = await createReservation({
          itineraryId: selectedFlight.itineraryId,
          userEmail,
          passengerId: passportId,
          state: 'PAID',
          paymentReference: generatePaymentReference(i),
        });
        created.push(reservation);
      }

      setReservations(created);
      setStep(3);
    } catch (err) {
      setSubmitError(err.message ?? 'No se pudo crear la reservación.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reinicia el flujo ───────────────────────────────────────────────────
  const resetFlow = () => {
    setStep(0);
    setFrom(null);
    setTo(null);
    setDepart('');
    setAdults(1);
    setSearchErrs({});
    setItineraries([]);
    setSelectedFlight(null);
    setItinerariesError(null);
    setClientEmail('');
    setPaxList([{ ...EMPTY_PASSENGER }]);
    setPaxErrs({});
    setSubmitError(null);
    setReservations([]);
  };

  const totalPrice = selectedFlight ? selectedFlight.price * paxList.length : 0;

  return (
    <div>
      <header className="admin-page-header">
        <h2 className="serif admin-page-title">Búsqueda y Reservación de Vuelos</h2>
        <p className="admin-page-subtitle">
          Cotiza itinerarios disponibles y reserva en nombre de un cliente registrado.
        </p>
      </header>

      <AdminStepper step={step} />

      {step === 0 && (
        <SearchStep
          from={from} setFrom={setFrom}
          to={to} setTo={setTo}
          depart={depart} setDepart={setDepart}
          adults={adults} setAdults={setAdults}
          errs={searchErrs}
          loading={loadingItineraries}
          error={itinerariesError}
          onSearch={runSearch}
        />
      )}

      {step === 1 && (
        <ResultsStep
          from={from} to={to} depart={depart} adults={adults}
          itineraries={itineraries}
          onSelect={selectItinerary}
          onBack={() => setStep(0)}
        />
      )}

      {step === 2 && (
        <PaxStep
          paxList={paxList}
          updatePax={updatePax}
          clientEmail={clientEmail}
          setClientEmail={setClientEmail}
          errs={paxErrs}
          submitting={submitting}
          error={submitError}
          selectedFlight={selectedFlight}
          totalPrice={totalPrice}
          from={from} to={to}
          onBack={() => setStep(1)}
          onConfirm={confirmReservation}
        />
      )}

      {step === 3 && (
        <ConfirmStep
          reservations={reservations}
          selectedFlight={selectedFlight}
          from={from} to={to}
          depart={depart}
          paxList={paxList}
          clientEmail={clientEmail}
          totalPrice={totalPrice}
          onNew={resetFlow}
        />
      )}
    </div>
  );
}

// ── Stepper visual ────────────────────────────────────────────────────────
function AdminStepper({ step }) {
  return (
    <div className="d-flex align-items-center gap-2 flex-wrap mb-4">
      {STEPS.map((label, i) => {
        const isActive = i === step;
        const isDone = i < step;
        return (
          <div key={label} className="d-flex align-items-center gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center"
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: isActive || isDone ? 'var(--burgundy)' : 'var(--burgundy-soft)',
                color: isActive || isDone ? '#fff' : 'var(--burgundy)',
                fontSize: '0.85rem', fontWeight: 600,
                border: '1px solid var(--burgundy-line)',
              }}
            >
              {isDone ? <i className="bi bi-check2"></i> : i + 1}
            </span>
            <span style={{ fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--burgundy)' : 'var(--muted)' }}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <i className="bi bi-chevron-right mx-1" style={{ color: 'var(--burgundy-line)' }}></i>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Paso 1: búsqueda ───────────────────────────────────────────────────────
function SearchStep({ from, setFrom, to, setTo, depart, setDepart, adults, setAdults, errs, loading, error, onSearch }) {
  return (
    <div className="bg-white border rounded-3 p-4" style={{ borderColor: 'var(--line)' }}>
      <h5 className="serif mb-3">¿A dónde vamos?</h5>
      <div className="row g-3">
        <div className="col-md-6">
          <AirportTypeahead
            id="search-from"
            label="Origen"
            value={from}
            onChange={setFrom}
            exclude={to?.code}
            invalid={errs.from}
          />
        </div>
        <div className="col-md-6">
          <AirportTypeahead
            id="search-to"
            label="Destino"
            value={to}
            onChange={setTo}
            exclude={from?.code}
            invalid={errs.to}
          />
        </div>
        <div className="col-md-6">
          <DatePicker
            id="search-depart"
            label="Fecha de salida"
            value={depart}
            onChange={setDepart}
            invalid={errs.depart}
          />
        </div>
        <div className="col-md-6">
          <label htmlFor="search-adults" className="form-label">Pasajeros</label>
          <input
            id="search-adults"
            type="number"
            min={1}
            max={9}
            className={'form-control' + (errs.adults ? ' is-invalid' : '')}
            value={adults}
            onChange={(e) => setAdults(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </div>

      {error && (
        <div className="alert mt-3" style={{ background: '#fde8ee', color: '#9b2335', border: 'none', borderRadius: 12 }}>
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      <div className="d-flex justify-content-end mt-4">
        <button className="btn btn-burgundy" disabled={loading} onClick={onSearch}>
          {loading
            ? <><span className="spinner-border spinner-border-sm me-2"></span>Buscando…</>
            : <><i className="bi bi-search me-2"></i>Buscar itinerarios</>}
        </button>
      </div>
    </div>
  );
}

// ── Paso 2: resultados ─────────────────────────────────────────────────────
function ResultsStep({ from, to, depart, adults, itineraries, onSelect, onBack }) {
  return (
    <div>
      <div className="d-flex flex-wrap gap-3 align-items-center justify-content-between mb-3">
        <div>
          <div className="fw-semibold">
            {from?.city} <i className="bi bi-arrow-right mx-1 text-burgundy"></i> {to?.city}
          </div>
          <div className="small text-muted">
            {depart} · {adults} {adults === 1 ? 'pasajero' : 'pasajeros'} · {itineraries.length} resultados
          </div>
        </div>
        <button className="btn btn-burgundy-outline btn-sm" onClick={onBack}>
          <i className="bi bi-arrow-left me-2"></i>Modificar búsqueda
        </button>
      </div>

      {itineraries.length === 0 && (
        <div className="bg-white border rounded-3 p-4 text-center text-muted" style={{ borderColor: 'var(--line)' }}>
          No se encontraron itinerarios para esta ruta.
        </div>
      )}

      <div className="d-flex flex-column gap-3">
        {itineraries.map((it) => {
          const hasPromo = !!it.activePromotion;
          const shown = it.displayPrice ?? it.price;
          return (
            <div key={it.itineraryId} className="bg-white border rounded-3 p-3" style={{ borderColor: hasPromo ? 'var(--burgundy)' : 'var(--line)' }}>
              <div className="row align-items-center g-3">
                <div className="col-md-8">
                  <div className="small text-muted mb-1 d-flex flex-wrap align-items-center gap-2">
                    <span className="badge bg-burgundy-soft text-burgundy">IT{it.itineraryId}</span>
                    {hasPromo && (
                      <span className="badge bg-burgundy text-white">
                        <i className="bi bi-tag-fill me-1"></i>
                        {it.activePromotion.discountPercent}% OFF
                      </span>
                    )}
                    <span>
                      {it.duration} · {stopsLabel(it.stopAirports)}
                    </span>
                  </div>
                  <div className="row align-items-center">
                    <div className="col-4 text-center">
                      <div className="fs-5 fw-semibold">{it.depart}</div>
                      <div className="small text-muted">{from?.code}</div>
                    </div>
                    <div className="col-4 text-center small text-muted">
                      <i className="bi bi-airplane-fill text-burgundy"></i>
                    </div>
                    <div className="col-4 text-center">
                      <div className="fs-5 fw-semibold">{it.arrive}</div>
                      <div className="small text-muted">{to?.code}</div>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 text-md-end">
                  <div className="text-muted small">{hasPromo ? 'Precio promocional' : 'Precio'}</div>
                  <div className="serif" style={{ fontSize: '1.4rem', color: 'var(--burgundy)' }}>
                    {fmtCRC(shown)}
                  </div>
                  {hasPromo && it.basePrice > shown && (
                    <div className="small text-muted text-decoration-line-through">
                      {fmtCRC(it.basePrice)}
                    </div>
                  )}
                  <div className="text-muted small">por pasajero</div>
                  <button className="btn btn-burgundy btn-sm mt-2" onClick={() => onSelect(it)}>
                    Seleccionar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Paso 3: pasajeros ──────────────────────────────────────────────────────
function PaxStep({ paxList, updatePax, clientEmail, setClientEmail, errs, submitting, error, selectedFlight, totalPrice, from, to, onBack, onConfirm }) {
  return (
    <div className="row g-4">
      <div className="col-lg-8">
        <div className="bg-white border rounded-3 p-4 mb-3" style={{ borderColor: 'var(--line)' }}>
          <h5 className="serif mb-3">Cuenta del cliente</h5>
          <p className="small text-muted">
            El cliente debe tener una cuenta registrada en AirTEC. La reserva quedará vinculada a su correo.
          </p>
          <label htmlFor="client-email" className="form-label">Correo del cliente</label>
          <input
            id="client-email"
            type="email"
            className={'form-control' + (errs.clientEmail ? ' is-invalid' : '')}
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="cliente@ejemplo.com"
          />
          {errs.clientEmail && (
            <div className="invalid-feedback d-block">Ingresa un correo válido.</div>
          )}
        </div>

        {paxList.map((p, i) => (
          <div className="bg-white border rounded-3 p-4 mb-3" key={i} style={{ borderColor: 'var(--line)' }}>
            <div className="d-flex align-items-center gap-2 mb-3">
              <span
                className="d-inline-flex align-items-center justify-content-center"
                style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--burgundy)', color: '#fff', fontWeight: 600, fontSize: '0.85rem' }}
              >
                {i + 1}
              </span>
              <h6 className="mb-0 serif">Pasajero {i + 1}</h6>
            </div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label small text-muted">Nombre(s)</label>
                <input
                  className={'form-control' + (errs[i + 'firstName'] ? ' is-invalid' : '')}
                  value={p.firstName}
                  onChange={(e) => updatePax(i, 'firstName', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small text-muted">Apellidos</label>
                <input
                  className={'form-control' + (errs[i + 'lastName'] ? ' is-invalid' : '')}
                  value={p.lastName}
                  onChange={(e) => updatePax(i, 'lastName', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small text-muted">Pasaporte</label>
                <input
                  className={'form-control' + (errs[i + 'passport'] ? ' is-invalid' : '')}
                  value={p.passport}
                  onChange={(e) => updatePax(i, 'passport', e.target.value.toUpperCase())}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small text-muted">Fecha de nacimiento</label>
                <input
                  type="date"
                  className={'form-control' + (errs[i + 'dob'] ? ' is-invalid' : '')}
                  value={p.dob}
                  onChange={(e) => updatePax(i, 'dob', e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label small text-muted">Género</label>
                <select
                  className={'form-select' + (errs[i + 'gender'] ? ' is-invalid' : '')}
                  value={p.gender}
                  onChange={(e) => updatePax(i, 'gender', e.target.value)}
                >
                  <option value="">Selecciona…</option>
                  <option>Femenino</option>
                  <option>Masculino</option>
                  <option>Otro</option>
                </select>
              </div>
            </div>
          </div>
        ))}

        {error && (
          <div className="alert" style={{ background: '#fde8ee', color: '#9b2335', border: 'none', borderRadius: 12 }}>
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        <div className="d-flex justify-content-between mt-3">
          <button className="btn btn-burgundy-outline" onClick={onBack} disabled={submitting}>
            <i className="bi bi-arrow-left me-2"></i>Volver
          </button>
          <button className="btn btn-burgundy" onClick={onConfirm} disabled={submitting}>
            {submitting
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Creando…</>
              : <>Confirmar reservación <i className="bi bi-arrow-right ms-2"></i></>}
          </button>
        </div>
      </div>

      <div className="col-lg-4">
        <div className="bg-white border rounded-3 p-4" style={{ borderColor: 'var(--line)', position: 'sticky', top: '1rem' }}>
          <h6 className="serif mb-3">Resumen</h6>
          <div className="small text-muted">Itinerario</div>
          <div className="fw-semibold">{from?.code} → {to?.code}</div>
          <div className="small">
            {selectedFlight?.depart} — {selectedFlight?.arrive} · {selectedFlight?.duration}
          </div>
          <div className="small text-muted">{stopsLabel(selectedFlight?.stopAirports)}</div>
          <SegmentList segments={selectedFlight?.segments} />
          {selectedFlight?.activePromotion && (
            <div className="mt-2 small">
              <span className="badge bg-burgundy text-white">
                <i className="bi bi-tag-fill me-1"></i>
                {selectedFlight.activePromotion.discountPercent}% OFF
              </span>
              <span className="text-muted ms-2">
                {selectedFlight.activePromotion.promotionCode}
              </span>
            </div>
          )}
          <hr />
          <div className="d-flex justify-content-between">
            <span>Tarifa × {paxList.length}</span>
            <strong>{fmtCRC(totalPrice)}</strong>
          </div>
          {selectedFlight?.activePromotion && selectedFlight.basePrice > selectedFlight.price && (
            <div className="d-flex justify-content-between small text-muted">
              <span>Sin promoción</span>
              <span className="text-decoration-line-through">
                {fmtCRC(selectedFlight.basePrice * paxList.length)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Paso 4: confirmación ───────────────────────────────────────────────────
function ConfirmStep({ reservations, selectedFlight, from, to, depart, paxList, clientEmail, totalPrice, onNew }) {
  const primaryId = reservations[0]?.reservationId;
  const confirmId = primaryId ? `AT-${String(primaryId).padStart(6, '0')}` : '—';

  const handlePrint = () => {
    const data = buildReceiptDataFromAdminProps({ reservations, selectedFlight, from, to, paxList, clientEmail, depart });
    printReceipt(data);
  };

  return (
    <div className="bg-white border rounded-3 p-4" style={{ borderColor: 'var(--line)' }}>
      <div className="text-center mb-4">
        <div
          className="d-inline-flex align-items-center justify-content-center mb-2"
          style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--burgundy-soft)', color: 'var(--burgundy)', fontSize: '1.6rem' }}
        >
          <i className="bi bi-check2"></i>
        </div>
        <h4 className="serif mb-0">Reservación creada</h4>
        <div className="text-muted small">
          La reserva quedó registrada a nombre de <strong>{clientEmail}</strong>.
        </div>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="small text-muted">Confirmación</div>
          <div className="serif fs-5">{confirmId}</div>
          <div className="small text-muted mt-2">Vuelo</div>
          <div className="fw-semibold">{from?.code} → {to?.code}</div>
          <div className="small">
            {selectedFlight?.depart} — {selectedFlight?.arrive} · {selectedFlight?.duration}
          </div>
          <div className="small text-muted">{stopsLabel(selectedFlight?.stopAirports)}</div>
          <SegmentList segments={selectedFlight?.segments} />
        </div>
        <div className="col-md-6">
          <div className="small text-muted">Pasajeros</div>
          {paxList.map((p, i) => {
            const resId = reservations[i]?.reservationId;
            return (
              <div key={i} className="small">
                {p.firstName} {p.lastName}
                {resId
                  ? <> — <span className="text-burgundy">reserva #{resId}</span></>
                  : null}
              </div>
            );
          })}
          <div className="small text-muted mt-3">Total pagado</div>
          <div className="serif fs-5 text-burgundy">{fmtCRC(totalPrice)}</div>
        </div>
      </div>

      <div className="d-flex justify-content-center gap-3 flex-wrap mt-4">
        <button className="btn btn-burgundy-outline" onClick={handlePrint}>
          <i className="bi bi-file-earmark-pdf me-2"></i>Descargar factura
        </button>
        <button className="btn btn-burgundy" onClick={onNew}>
          <i className="bi bi-plus-lg me-2"></i>Nueva reservación
        </button>
      </div>
    </div>
  );
}
