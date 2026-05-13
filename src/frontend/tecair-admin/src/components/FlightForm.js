import { useState, useEffect } from 'react';

import AirportTypeahead from './AirportTypeahead.js';
import DatePicker       from './DatePicker.js';
import { searchPlanes } from '../services/planeService.js';

// Form de vuelo reutilizable para crear (sin valor inicial) y editar (con `initialValues`).
//
// `initialValues` shape (todos opcionales):
//   { departsFrom, arrivesTo, planePlate, gate, state,
//     departureDate, departureTime, arrivalDate, arrivalTime }
//
// `onSubmit(payload)` recibe el payload listo para la API (datetimes en ISO).
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
  state:         'OPEN',
  departureDate: '',
  departureTime: '',
  arrivalDate:   '',
  arrivalTime:   '',
};

function combineDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const d = new Date(`${dateStr}T${timeStr}:00`);
  return isNaN(d.getTime()) ? null : d;
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

    if (!form.departsFrom)        errs.departsFrom   = 'Selecciona un aeropuerto origen.';
    if (!form.arrivesTo)          errs.arrivesTo     = 'Selecciona un aeropuerto destino.';
    if (!form.planePlate)         errs.planePlate    = 'Selecciona un avión.';
    if (!form.gate.trim())        errs.gate          = 'Indica la puerta de embarque.';
    if (!form.departureDate)      errs.departureDate = 'Indica la fecha de salida.';
    if (!form.departureTime)      errs.departureTime = 'Indica la hora de salida.';
    if (!form.arrivalDate)        errs.arrivalDate   = 'Indica la fecha de llegada.';
    if (!form.arrivalTime)        errs.arrivalTime   = 'Indica la hora de llegada.';

    if (form.departsFrom && form.arrivesTo && form.departsFrom.code === form.arrivesTo.code) {
      errs.arrivesTo = 'Origen y destino deben ser distintos.';
    }

    const dep = combineDateTime(form.departureDate, form.departureTime);
    const arr = combineDateTime(form.arrivalDate,   form.arrivalTime);
    if (dep && arr && arr <= dep) {
      errs.arrivalDate = 'La llegada debe ser posterior a la salida.';
      errs.arrivalTime = ' ';
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
        state:                form.state || 'OPEN',
        gate:                 form.gate.trim(),
        departureDatetime:    combineDateTime(form.departureDate, form.departureTime).toISOString(),
        arrivalDatetime:      combineDateTime(form.arrivalDate,   form.arrivalTime).toISOString(),
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
          {fieldErrors.departureTime && fieldErrors.departureTime.trim() && (
            <div className="invalid-feedback">{fieldErrors.departureTime}</div>
          )}
        </div>

        <div className="col-md-8">
          <DatePicker
            id="flight-arrival-date"
            label="Fecha de llegada *"
            value={form.arrivalDate}
            onChange={(v) => updateField('arrivalDate', v)}
            invalid={!!fieldErrors.arrivalDate}
          />
          {fieldErrors.arrivalDate && (
            <div className="invalid-feedback d-block">{fieldErrors.arrivalDate}</div>
          )}
        </div>

        <div className="col-md-4">
          <label htmlFor="flight-arrival-time" className="form-label">Hora de llegada *</label>
          <input
            id="flight-arrival-time"
            type="time"
            className={'form-control' + (fieldErrors.arrivalTime ? ' is-invalid' : '')}
            value={form.arrivalTime}
            onChange={(e) => updateField('arrivalTime', e.target.value)}
          />
          {fieldErrors.arrivalTime && fieldErrors.arrivalTime.trim() && (
            <div className="invalid-feedback">{fieldErrors.arrivalTime}</div>
          )}
        </div>

        {mode === 'edit' && (
          <div className="col-12">
            <div className="flight-state-readonly">
              <span className="flight-state-readonly-label">Estado actual</span>
              <span className={`flight-state-badge flight-state-${form.state?.toLowerCase() ?? 'open'}`}>
                {form.state ?? 'OPEN'}
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
