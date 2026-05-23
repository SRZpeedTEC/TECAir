import { useEffect, useState } from 'react';

import AirportTypeahead from './AirportTypeahead.jsx';
import ConfirmDialog    from './ConfirmDialog.jsx';
import {
  getFlightClosingReport,
  searchFlights,
  transitionFlightState,
} from '../services/flightService.js';
import { printFlightClosingReport } from '../utils/flightClosingReport.js';

// Panel compartido para Apertura (UPCOMING → OPEN) y Cierre (OPEN → CLOSED).
// La página padre solo decide qué transición se aplica; toda la regla de qué
// vuelos se pueden listar y qué transiciones son válidas vive en backend.
//
// Props:
//   fromState   — estado actual que listamos ('UPCOMING' | 'OPEN')
//   toState     — estado destino del botón de acción ('OPEN' | 'CLOSED')
//   actionLabel — texto del botón ("Abrir vuelo" | "Cerrar vuelo")
//   actionVerb  — verbo para mensajes ("abrir" | "cerrar")
//   icon        — clase bootstrap-icons para el estado vacío

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
  showClosingReport = false,
}) {
  const [flightId,    setFlightId]    = useState('');
  const [origin,      setOrigin]      = useState(null);
  const [destination, setDestination] = useState(null);
  const [departureDate, setDepartureDate] = useState('');

  const [flights,   setFlights]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [touched,   setTouched]   = useState(false);

  const [target,        setTarget]        = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [actionError,   setActionError]   = useState(null);
  const [reportLoadingFlightId, setReportLoadingFlightId] = useState(null);

  const [toast, setToast] = useState(null);

  const hasInvalidRoute = !!origin && !!destination && origin.code === destination.code;

  const fetchFlights = async () => {
    // El backend aplica filtros opcionales y el estado queda fijo por pantalla.
    const data = await searchFlights({
      flightId: flightId.trim(),
      state: fromState,
      departureCode: origin?.code,
      arrivalCode: destination?.code,
      departureDate,
    });
    setFlights(data);
  };

  const handleSearch = async (e) => {
    e?.preventDefault?.();
    if (hasInvalidRoute) return;
    setLoading(true);
    setLoadError(null);
    setTouched(true);
    setToast(null);
    try {
      await fetchFlights();
    } catch (err) {
      setLoadError(err.message);
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const openConfirm = (flight) => {
    setToast(null);
    setActionError(null);
    setTarget(flight);
  };

  const handleDownloadReport = async (flight) => {
    setToast(null);
    setActionError(null);
    setReportLoadingFlightId(flight.flightId);
    try {
      const report = await getFlightClosingReport(flight.flightId);
      printFlightClosingReport(report);
    } catch (err) {
      setActionError(err.message);
      setTarget(flight);
    } finally {
      setReportLoadingFlightId(null);
    }
  };

  const handleConfirm = async () => {
    if (!target) return;
    const shouldAutoDownloadReport = showClosingReport && toState === 'CLOSED';
    const reportWindow = shouldAutoDownloadReport
      ? window.open('', '_blank', 'width=1180,height=820')
      : null;

    if (reportWindow) {
      reportWindow.document.open();
      reportWindow.document.write('<!DOCTYPE html><html lang="es"><head><title>Generando reporte</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:32px;color:#1a1320;">Generando reporte de cierre...</body></html>');
      reportWindow.document.close();
    }

    setTransitioning(true);
    setActionError(null);
    try {
      await transitionFlightState(target.flightId, toState);
      if (shouldAutoDownloadReport) {
        const report = await getFlightClosingReport(target.flightId);
        printFlightClosingReport(report, reportWindow);
      }

      setToast(`Vuelo #${target.flightId} ahora está en estado ${toState}.`);
      setTarget(null);
      // Refresca la lista con los mismos filtros para que el vuelo recién
      // transicionado salga del listado actual.
      await fetchFlights();
    } catch (err) {
      reportWindow?.close();
      setActionError(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="admin-card">
        <form onSubmit={handleSearch}>
          <div className="row g-3 align-items-end">
            <div className="col-md-2">
              <label className="form-label"># Vuelo</label>
              <input
                type="number"
                className="form-control"
                min="1"
                value={flightId}
                onChange={(e) => setFlightId(e.target.value)}
                placeholder="Todos"
              />
            </div>
            <div className="col-md-3">
              <AirportTypeahead
                id="transition-origin"
                label="Aeropuerto origen"
                value={origin}
                onChange={setOrigin}
                exclude={destination?.code}
              />
            </div>
            <div className="col-md-3">
              <AirportTypeahead
                id="transition-destination"
                label="Aeropuerto destino"
                value={destination}
                onChange={setDestination}
                exclude={origin?.code}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Fecha salida</label>
              <input
                type="date"
                className="form-control"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <button type="submit" className="btn-burgundy w-100" disabled={hasInvalidRoute || loading}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Buscando…</>
                  : <><i className="bi bi-search me-2"></i>Buscar</>}
              </button>
            </div>
          </div>
        </form>

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

        {touched && !loading && !loadError && flights.length === 0 && (
          <div className="flight-list-empty">
            <i className={`bi ${icon}`}></i>
            <p className="m-0">
              No hay vuelos en estado <strong>{fromState}</strong> que coincidan con los filtros.
            </p>
          </div>
        )}

        {flights.length > 0 && (
          <div className="flight-list-table-wrap mt-3">
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
                      <div className="flight-row-actions">
                        {showClosingReport && (
                          <button
                            type="button"
                            className="flight-action-btn flight-report-btn"
                            onClick={() => handleDownloadReport(f)}
                            disabled={reportLoadingFlightId === f.flightId}
                          >
                            {reportLoadingFlightId === f.flightId
                              ? <><span className="spinner-border spinner-border-sm me-1"></span>Reporte</>
                              : <><i className="bi bi-file-earmark-pdf me-1"></i>Reporte</>}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-burgundy"
                          onClick={() => openConfirm(f)}
                        >
                          {actionLabel} <i className="bi bi-arrow-right ms-1"></i>
                        </button>
                      </div>
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
        title={actionLabel}
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
