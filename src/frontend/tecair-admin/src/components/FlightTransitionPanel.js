import { useEffect, useState } from 'react';

import ConfirmDialog from './ConfirmDialog.js';
import {
  listFlightsByDepartureWindow,
  transitionFlightState,
} from '../services/flightService.js';

// Panel compartido para Apertura (UPCOMING → OPEN) y Cierre (OPEN → CLOSED).
// La página padre solo decide qué transición se aplica; toda la regla de qué
// vuelos se pueden listar y qué transiciones son válidas vive en backend.
//
// Props:
//   fromState     — estado actual que listamos ('UPCOMING' | 'OPEN')
//   toState       — estado destino del botón de acción ('OPEN' | 'CLOSED')
//   actionLabel   — texto del botón ("Abrir vuelo" | "Cerrar vuelo")
//   actionVerb    — verbo para mensajes ("abrir" | "cerrar")
//   icon          — clase bootstrap-icons para el badge de empty/encabezado
//   windowHours   — ventana en horas que pedimos al backend (default 4)

const pad2 = (n) => String(n).padStart(2, '0');
const fmtDateTime = (value) => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export default function FlightTransitionPanel({
  fromState,
  toState,
  actionLabel,
  actionVerb,
  icon = 'bi-airplane',
  windowHours = 4,
}) {
  const [flights,   setFlights]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [touched,   setTouched]   = useState(false);

  const [target,        setTarget]        = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [actionError,   setActionError]   = useState(null);

  const [toast, setToast] = useState(null);

  const fetchFlights = async () => {
    setLoading(true);
    setLoadError(null);
    setTouched(true);
    try {
      const data = await listFlightsByDepartureWindow({ state: fromState, hours: windowHours });
      setFlights(data);
    } catch (err) {
      setLoadError(err.message);
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  // Carga inicial al montar y cuando cambia el filtro de estado.
  useEffect(() => {
    fetchFlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromState]);

  const openConfirm = (flight) => {
    setToast(null);
    setActionError(null);
    setTarget(flight);
  };

  const handleConfirm = async () => {
    if (!target) return;
    setTransitioning(true);
    setActionError(null);
    try {
      await transitionFlightState(target.flightId, toState);
      setToast(`Vuelo #${target.flightId} ahora está en estado ${toState}.`);
      setTarget(null);
      await fetchFlights();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <div>
      <div className="admin-alert admin-alert-info mb-3" role="status">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          Se muestran los vuelos en estado <strong>{fromState}</strong> cuya salida ocurre en las
          próximas <strong>{windowHours} horas</strong>. Al confirmar, el vuelo pasa a estado{' '}
          <strong>{toState}</strong>.
        </span>
      </div>

      <div className="admin-card">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <div>
            <h6 className="serif mb-1">Vuelos por {actionVerb}</h6>
            <p className="text-muted-small m-0">
              Ventana: próximas {windowHours} horas · Estado actual: {fromState}
            </p>
          </div>
          <button
            type="button"
            className="btn-burgundy-outline"
            onClick={fetchFlights}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner-border spinner-border-sm me-2"></span>Cargando…</>
              : <><i className="bi bi-arrow-clockwise me-2"></i>Refrescar</>}
          </button>
        </div>

        {toast && (
          <div className="admin-alert admin-alert-success mb-3" role="status">
            <i className="bi bi-check-circle-fill"></i>
            <span>{toast}</span>
          </div>
        )}

        {loadError && (
          <div className="admin-alert admin-alert-error mb-3" role="alert">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{loadError}</span>
          </div>
        )}

        {touched && !loading && !loadError && flights.length === 0 && (
          <div className="flight-list-empty">
            <i className={`bi ${icon}`}></i>
            <p className="m-0">
              No hay vuelos en estado <strong>{fromState}</strong> dentro de la ventana de{' '}
              {windowHours} horas.
            </p>
          </div>
        )}

        {flights.length > 0 && (
          <div className="flight-list-table-wrap">
            <table className="flight-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Avión</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Salida</th>
                  <th>Llegada</th>
                  <th>Gate</th>
                  <th>Estado</th>
                  <th className="text-end">Acción</th>
                </tr>
              </thead>
              <tbody>
                {flights.map((f) => (
                  <tr key={f.flightId}>
                    <td className="mono">{f.flightId}</td>
                    <td className="mono">{f.planePlate}</td>
                    <td>
                      <div className="flight-cell-city">{f.departureCity}</div>
                      <div className="flight-cell-code">{f.departureCode}</div>
                    </td>
                    <td>
                      <div className="flight-cell-city">{f.arrivalCity}</div>
                      <div className="flight-cell-code">{f.arrivalCode}</div>
                    </td>
                    <td className="mono">{fmtDateTime(f.departureDatetime)}</td>
                    <td className="mono">{fmtDateTime(f.arrivalDatetime)}</td>
                    <td className="mono">{f.gate ?? '—'}</td>
                    <td>
                      <span className={`flight-state-badge flight-state-${f.state?.toLowerCase()}`}>
                        {f.state}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn-burgundy"
                        onClick={() => openConfirm(f)}
                      >
                        {actionLabel} <i className="bi bi-arrow-right ms-1"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!target}
        onCancel={() => { setTarget(null); setActionError(null); }}
        onConfirm={handleConfirm}
        title={`${actionLabel}`}
        loading={transitioning}
        error={actionError}
        confirmLabel={actionLabel}
        message={
          target && (
            <>
              <p className="m-0">
                Vas a {actionVerb} el vuelo <strong>#{target.flightId}</strong>{' '}
                <span className="mono">({target.planePlate})</span> de{' '}
                <strong>{target.departureCity}</strong> a{' '}
                <strong>{target.arrivalCity}</strong>.
              </p>
              <p className="m-0 mt-2 text-muted-small">
                Salida programada: <span className="mono">{fmtDateTime(target.departureDatetime)}</span>.
                El estado pasará de <strong>{fromState}</strong> a <strong>{toState}</strong>.
              </p>
            </>
          )
        }
      />
    </div>
  );
}
