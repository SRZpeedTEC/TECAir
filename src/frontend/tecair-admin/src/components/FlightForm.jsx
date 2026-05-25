import { useState, useEffect } from 'react';

import AirportTypeahead from './AirportTypeahead.jsx';
import DatePicker       from './DatePicker.jsx';
import { searchPlanes } from '../services/planeService.js';
import { getAirportConnection } from '../services/airportService.js';

// Form de vuelo reutilizable para crear (sin valor inicial) y editar (con `initialValues`).
//
// La hora de llegada, la duracion y las millas ya no se piden al usuario: el
// backend las calcula a partir de la tabla airport_connection. El form muestra
// los valores calculados como preview consultando GET /api/airports/connection.
//
// `initialValues` shape (todos opcionales):
//   { departsFrom, arrivesTo, planePlate, gate, state,
//     departureDate, departureTime }
//
// `onSubmit(payload)` recibe el payload listo para la API (datetime en ISO).
// El padre se encarga de hacer la llamada (create/update) y de cerrar/limpiar.
//
// Props:
//   mode           — 'create' | 'edit'  → cambia el texto del botón submit.
//   initialValues  — objeto de valores precargados (modo edit).
//   onSubmit       — async (payload) → void. Si lanza, el form muestra el error.
//   onCancel       — () → void.  Botón Cancelar (en edit cierra el modal; en create resetea).
//   successMessage — string | null. Mensaje verde a mostrar (en create); en edit el padre cierra.

const EMPTY_FORM = {
  departsFrom:   null,
  arrivesTo:     null,
  planePlate:    '',
  gate:          '',
  state:         'UPCOMING',
  departureDate: '',
  departureTime: '',
};

function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return isNaN(d.getTime()) ? null : d;
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function formatArrival(date) {
  if (!date) return '—';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = MESES[date.getMonth()];
  const yy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${dd} ${mm} ${yy}, ${hh}:${mi}`;
}

export default function FlightForm({
  mode = 'create',
  initialValues,
  onSubmit,
  onCancel,
  successMessage,
}) {
  const [form,          setForm]          = useState({ ...EMPTY_FORM, ...(initialValues ?? {}) });
  const [fieldErrors,   setFieldErrors]   = useState({});
  const [loading,       setLoading]       = useState(false);
  const [submitError,   setSubmitError]   = useState(null);
  const [planes,        setPlanes]        = useState([]);
  const [planesLoading, setPlanesLoading] = useState(true);
  const [planesError,   setPlanesError]   = useState(null);

  // Conexion entre origen y destino (distancia + duracion). Se consulta cada
  // vez que cambia el par de aeropuertos. El backend la usa para calcular la
  // llegada al guardar; aqui la mostramos como preview para que el admin
  // confirme antes de hacer submit.
  const [connection,        setConnection]        = useState(null);
  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError,   setConnectionError]   = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await searchPlanes();
        if (!cancelled) setPlanes(data);
      } catch (err) {
        if (!cancelled) setPlanesError(err.message);
      } finally {
        if (!cancelled) setPlanesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Consulta la conexion cada vez que origen o destino cambian.
  useEffect(() => {
    const fromCode = form.departsFrom?.code;
    const toCode   = form.arrivesTo?.code;

    // Sin par completo no consultamos: el preview queda en su estado vacio.
    if (!fromCode || !toCode || fromCode === toCode) {
      setConnection(null);
      setConnectionError(null);
      setConnectionLoading(false);
      return;
    }

    let cancelled = false;
    setConnectionLoading(true);
    setConnectionError(null);
    (async () => {
      try {
        const data = await getAirportConnection(fromCode, toCode);
        if (!cancelled) setConnection(data);
      } catch (err) {
        if (!cancelled) {
          setConnection(null);
          setConnectionError(err.message);
        }
      } finally {
        if (!cancelled) setConnectionLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [form.departsFrom?.code, form.arrivesTo?.code]);

  const updateField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setSubmitError(null);
  };

  // Validaciones cliente — livianas, mismas reglas que el backend valida.
  const validate = () => {
    const errs = {};

    if (!form.departsFrom)   errs.departsFrom   = 'Selecciona un aeropuerto origen.';
    if (!form.arrivesTo)     errs.arrivesTo     = 'Selecciona un aeropuerto destino.';
    if (!form.planePlate)    errs.planePlate    = 'Selecciona un avión.';
    if (!form.gate.trim())   errs.gate          = 'Indica la puerta de embarque.';
    if (!form.departureDate) errs.departureDate = 'Indica la fecha de salida.';
    if (!form.departureTime) errs.departureTime = 'Indica la hora de salida.';

    if (form.departsFrom && form.arrivesTo && form.departsFrom.code === form.arrivesTo.code) {
      errs.arrivesTo = 'Origen y destino deben ser distintos.';
    }

    // Al crear, la fecha de salida no puede ser anterior a hoy. En modo edit
    // permitimos vuelos antiguos (por si se corrige un vuelo ya pasado).
    if (mode === 'create' && form.departureDate && !errs.departureDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const picked = new Date(`${form.departureDate}T00:00:00`);
      if (picked < today) {
        errs.departureDate = 'La fecha de salida no puede ser anterior a hoy.';
      }
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    setSubmitError(null);

    try {
      const payload = {
        planePlate:           form.planePlate,
        airportDepartsFromId: form.departsFrom.code.toUpperCase(),
        airportArrivesToId:   form.arrivesTo.code.toUpperCase(),
        state:                form.state || 'UPCOMING',
        gate:                 form.gate.trim(),
        // La llegada y las millas las calcula el backend a partir de airport_connection;
        // por eso el payload solo lleva la fecha y hora de salida.
        departureDatetime:    combineDateTime(form.departureDate, form.departureTime).toISOString(),
      };
      await onSubmit(payload);

      if (mode === 'create') {
        setForm(EMPTY_FORM);
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'create') {
      setForm(EMPTY_FORM);
      setFieldErrors({});
      setSubmitError(null);
    }
    onCancel?.();
  };

  const submitLabel = mode === 'edit' ? 'Guardar cambios' : 'Crear vuelo';

  // Llegada calculada solo cuando tenemos conexion + fecha + hora.
  const departureDate = combineDateTime(form.departureDate, form.departureTime);
  const calculatedArrival = (connection && departureDate)
    ? new Date(departureDate.getTime() + connection.estimatedDurationMinutes * 60_000)
    : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        <div className="col-md-6">
          <AirportTypeahead
            id="flight-origin"
            label="Aeropuerto origen *"
            value={form.departsFrom}
            onChange={(a) => updateField('departsFrom', a)}
            exclude={form.arrivesTo?.code}
            invalid={!!fieldErrors.departsFrom}
          />
          {fieldErrors.departsFrom && (
            <div className="invalid-feedback d-block">{fieldErrors.departsFrom}</div>
          )}
        </div>

        <div className="col-md-6">
          <AirportTypeahead
            id="flight-destination"
            label="Aeropuerto destino *"
            value={form.arrivesTo}
            onChange={(a) => updateField('arrivesTo', a)}
            exclude={form.departsFrom?.code}
            invalid={!!fieldErrors.arrivesTo}
          />
          {fieldErrors.arrivesTo && (
            <div className="invalid-feedback d-block">{fieldErrors.arrivesTo}</div>
          )}
        </div>

        <div className="col-md-6">
          <label htmlFor="flight-plane" className="form-label">Avión *</label>
          <select
            id="flight-plane"
            className={'form-select' + (fieldErrors.planePlate ? ' is-invalid' : '')}
            value={form.planePlate}
            onChange={(e) => updateField('planePlate', e.target.value)}
            disabled={planesLoading || !!planesError}
          >
            <option value="">
              {planesLoading ? 'Cargando aviones…' : planesError ? 'No se pudieron cargar los aviones' : 'Selecciona un avión…'}
            </option>
            {planes.map((p) => (
              <option key={p.plate} value={p.plate}>
                {p.plate} — {p.model}
              </option>
            ))}
          </select>
          {fieldErrors.planePlate && (
            <div className="invalid-feedback">{fieldErrors.planePlate}</div>
          )}
          {planesError && (
            <div className="form-text text-danger">{planesError}</div>
          )}
        </div>

        <div className="col-md-6">
          <label htmlFor="flight-gate" className="form-label">Puerta de embarque (gate) *</label>
          <input
            id="flight-gate"
            type="text"
            className={'form-control' + (fieldErrors.gate ? ' is-invalid' : '')}
            placeholder="Ej. A12"
            value={form.gate}
            onChange={(e) => updateField('gate', e.target.value)}
            maxLength={20}
          />
          {fieldErrors.gate && (
            <div className="invalid-feedback">{fieldErrors.gate}</div>
          )}
        </div>

        <div className="col-md-8">
          <DatePicker
            id="flight-departure-date"
            label="Fecha de salida *"
            value={form.departureDate}
            onChange={(v) => updateField('departureDate', v)}
            invalid={!!fieldErrors.departureDate}
            minDate={mode === 'create' ? new Date() : undefined}
          />
          {fieldErrors.departureDate && (
            <div className="invalid-feedback d-block">{fieldErrors.departureDate}</div>
          )}
        </div>

        <div className="col-md-4">
          <label htmlFor="flight-departure-time" className="form-label">Hora de salida *</label>
          <input
            id="flight-departure-time"
            type="time"
            className={'form-control' + (fieldErrors.departureTime ? ' is-invalid' : '')}
            value={form.departureTime}
            onChange={(e) => updateField('departureTime', e.target.value)}
          />
          {fieldErrors.departureTime && (
            <div className="invalid-feedback">{fieldErrors.departureTime}</div>
          )}
        </div>

        <div className="col-12">
          <ConnectionPreview
            from={form.departsFrom}
            to={form.arrivesTo}
            connection={connection}
            loading={connectionLoading}
            error={connectionError}
            calculatedArrival={calculatedArrival}
            hasDeparture={!!departureDate}
          />
        </div>

        {mode === 'edit' && (
          <div className="col-12">
            <div className="flight-state-readonly">
              <span className="flight-state-readonly-label">Estado actual</span>
              <span className={`flight-state-badge flight-state-${form.state?.toLowerCase() ?? 'upcoming'}`}>
                {form.state ?? 'UPCOMING'}
              </span>
              <span className="flight-state-readonly-hint">
                Cambia el estado desde Apertura o Cierre de Vuelos.
              </span>
            </div>
          </div>
        )}
      </div>

      {submitError && (
        <div className="admin-alert admin-alert-error mt-4" role="alert">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{submitError}</span>
        </div>
      )}

      {successMessage && (
        <div className="admin-alert admin-alert-success mt-4" role="status">
          <i className="bi bi-check-circle-fill"></i>
          <span>{successMessage}</span>
        </div>
      )}

      <div className="d-flex justify-content-end gap-2 mt-4">
        <button
          type="button"
          className="btn-burgundy-outline"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-burgundy" disabled={loading}>
          {loading && <span className="spinner-border spinner-border-sm me-2"></span>}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// Tarjeta de preview que comunica al usuario lo que el backend va a calcular.
// Cubre cuatro estados: faltan datos, cargando ruta, ruta no configurada, ruta ok.
function ConnectionPreview({ from, to, connection, loading, error, calculatedArrival, hasDeparture }) {
  const baseStyle = {
    background: 'var(--burgundy-soft, #f7eef2)',
    border: '1px solid var(--burgundy-line, #e6d5dd)',
    borderRadius: 12,
    padding: '14px 18px',
  };

  if (!from || !to) {
    return (
      <div style={baseStyle} className="d-flex align-items-center gap-2">
        <i className="bi bi-info-circle text-muted-small"></i>
        <span className="text-muted-small">
          Selecciona origen y destino para ver la duración y la llegada calculada.
        </span>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={baseStyle} className="d-flex align-items-center gap-2">
        <span className="spinner-border spinner-border-sm"></span>
        <span className="text-muted-small">Buscando ruta entre {from.code} y {to.code}…</span>
      </div>
    );
  }

  if (error) {
    // Distinguimos entre "ruta no existe" (mensaje claro al admin) y cualquier
    // otro error (mostramos el mensaje crudo para no esconder el problema real,
    // como un backend desactualizado o caido).
    const isMissingRoute = /no configured airport connection/i.test(error)
      || /no hay ruta/i.test(error);
    return (
      <div className="admin-alert admin-alert-error m-0" role="alert">
        <i className="bi bi-exclamation-circle-fill"></i>
        <span>
          {isMissingRoute ? (
            <>
              No hay ruta configurada entre <strong>{from.code}</strong> y <strong>{to.code}</strong>.
              El vuelo no podrá crearse hasta que la conexión exista en el sistema.
            </>
          ) : (
            <>No se pudo consultar la ruta {from.code} → {to.code}: {error}</>
          )}
        </span>
      </div>
    );
  }

  if (!connection) return null;

  return (
    <div style={baseStyle}>
      <div className="d-flex align-items-center gap-2 mb-2">
        <i className="bi bi-calculator text-burgundy"></i>
        <strong>Llegada calculada por el sistema</strong>
      </div>
      <div className="row g-3">
        <PreviewField label="Duración estimada" value={formatDuration(connection.estimatedDurationMinutes)} />
        <PreviewField label="Distancia" value={`${connection.distanceMiles.toLocaleString('es-CR')} millas`} />
        <PreviewField
          label="Llegada calculada"
          value={hasDeparture ? formatArrival(calculatedArrival) : 'Ingresa fecha y hora de salida'}
          muted={!hasDeparture}
        />
      </div>
    </div>
  );
}

function PreviewField({ label, value, muted }) {
  return (
    <div className="col-md-4">
      <div className="text-muted-small text-uppercase" style={{ fontSize: 11, letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: '1rem', color: muted ? 'var(--muted)' : 'var(--ink)' }}>
        {value}
      </div>
    </div>
  );
}
