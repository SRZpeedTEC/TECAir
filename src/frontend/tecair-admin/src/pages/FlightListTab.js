import { useState } from 'react';

import AirportTypeahead from '../components/AirportTypeahead.js';
import FlightForm       from '../components/FlightForm.js';
import Modal            from '../components/Modal.js';
import ConfirmDialog    from '../components/ConfirmDialog.js';
import {
  listOpenFlightsByDeparture,
  updateFlight,
  deleteFlight,
} from '../services/flightService.js';

const pad2 = (n) => String(n).padStart(2, '0');

// Separa un ISO/Date en { date: 'YYYY-MM-DD', time: 'HH:MM' } en zona local.
function splitDateTime(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

// Formatea una fecha ISO como "dd/mm/yyyy HH:MM" en zona local, para la tabla.
function fmtDateTime(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// Construye el shape que espera FlightForm en modo edit a partir de un vuelo
// devuelto por GET /api/flights/open.
function flightToFormValues(flight) {
  const dep = splitDateTime(flight.departureDatetime);
  const arr = splitDateTime(flight.arrivalDatetime);
  return {
    departsFrom: {
      code:    flight.departureCode,
      city:    flight.departureCity,
      name:    flight.departureAirportName,
      country: '', // OpenFlightResponse no devuelve country; el typeahead no lo necesita para mostrar
    },
    arrivesTo: {
      code:    flight.arrivalCode,
      city:    flight.arrivalCity,
      name:    flight.arrivalAirportName,
      country: '',
    },
    planePlate:    flight.planePlate,
    gate:          flight.gate ?? '',
    state:         flight.state ?? 'OPEN',
    departureDate: dep.date,
    departureTime: dep.time,
    arrivalDate:   arr.date,
    arrivalTime:   arr.time,
  };
}

export default function FlightListTab() {
  const [airport,   setAirport]   = useState(null);
  const [flights,   setFlights]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [touched,   setTouched]   = useState(false); // marca si el usuario ya buscó al menos una vez

  // Estado para edición
  const [editingFlight, setEditingFlight] = useState(null);

  // Estado para eliminación
  const [deletingFlight, setDeletingFlight] = useState(null);
  const [deleting,       setDeleting]       = useState(false);
  const [deleteError,    setDeleteError]    = useState(null);

  // Banner global de éxito (post-update / post-delete)
  const [toast, setToast] = useState(null);

  const fetchFlights = async (code) => {
    setLoading(true);
    setLoadError(null);
    setTouched(true);
    try {
      const data = await listOpenFlightsByDeparture(code);
      setFlights(data);
    } catch (err) {
      setLoadError(err.message);
      setFlights([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAirportChange = (ap) => {
    setAirport(ap);
    setToast(null);
    if (ap) {
      fetchFlights(ap.code);
    } else {
      setFlights([]);
      setTouched(false);
      setLoadError(null);
    }
  };

  const handleRefresh = () => {
    if (airport) fetchFlights(airport.code);
  };

  // ─── Editar ───
  const openEdit = (flight) => {
    setToast(null);
    setEditingFlight(flight);
  };

  const handleEditSubmit = async (payload) => {
    // FlightForm ya respeta state actual; aun así, garantizamos enviar el estado original
    // del vuelo (no permitir cambios desde esta pantalla por decisión de producto).
    const finalPayload = { ...payload, state: editingFlight.state };
    await updateFlight(editingFlight.flightId, finalPayload);
    setToast(`Vuelo #${editingFlight.flightId} actualizado correctamente.`);
    setEditingFlight(null);
    if (airport) fetchFlights(airport.code);
  };

  // ─── Eliminar ───
  const openDelete = (flight) => {
    setToast(null);
    setDeleteError(null);
    setDeletingFlight(flight);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFlight) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteFlight(deletingFlight.flightId);
      setToast(`Vuelo #${deletingFlight.flightId} eliminado correctamente.`);
      setDeletingFlight(null);
      if (airport) fetchFlights(airport.code);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="admin-alert admin-alert-info mb-3" role="status">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          Esta consulta usa <code>GET /api/flights/open</code>: solo se muestran vuelos en estado{' '}
          <strong>OPEN</strong> filtrados por aeropuerto de salida. Cuando backend agregue{' '}
          <code>GET /api/flights</code> esta vista listará todos los vuelos.
        </span>
      </div>

      <div className="admin-card">
        <div className="row g-3 align-items-end">
          <div className="col-md-8">
            <AirportTypeahead
              id="list-departure"
              label="Aeropuerto de salida"
              value={airport}
              onChange={handleAirportChange}
            />
          </div>
          <div className="col-md-4 d-flex gap-2">
            <button
              type="button"
              className="btn-burgundy-outline w-100"
              onClick={handleRefresh}
              disabled={!airport || loading}
            >
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Buscando…</>
                : <><i className="bi bi-arrow-clockwise me-2"></i>Refrescar</>}
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

        {touched && !loading && !loadError && flights.length === 0 && (
          <div className="flight-list-empty">
            <i className="bi bi-airplane"></i>
            <p className="m-0">
              No hay vuelos OPEN saliendo de <strong>{airport?.city} ({airport?.code})</strong>.
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
                  <th className="text-end">Acciones</th>
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
                        className="flight-action-btn"
                        onClick={() => openEdit(f)}
                        aria-label={`Editar vuelo ${f.flightId}`}
                        title="Editar"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        type="button"
                        className="flight-action-btn flight-action-danger"
                        onClick={() => openDelete(f)}
                        aria-label={`Eliminar vuelo ${f.flightId}`}
                        title="Eliminar"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <Modal
        open={!!editingFlight}
        onClose={() => setEditingFlight(null)}
        title={editingFlight ? `Editar vuelo #${editingFlight.flightId}` : ''}
        size="lg"
      >
        {editingFlight && (
          <FlightForm
            mode="edit"
            initialValues={flightToFormValues(editingFlight)}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditingFlight(null)}
          />
        )}
      </Modal>

      {/* Confirmación de eliminación */}
      <ConfirmDialog
        open={!!deletingFlight}
        onCancel={() => { setDeletingFlight(null); setDeleteError(null); }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar vuelo"
        destructive
        loading={deleting}
        error={deleteError}
        confirmLabel="Eliminar vuelo"
        message={
          deletingFlight && (
            <>
              <p className="m-0">
                Vas a eliminar el vuelo <strong>#{deletingFlight.flightId}</strong>{' '}
                <span className="mono">({deletingFlight.planePlate})</span> de{' '}
                <strong>{deletingFlight.departureCity}</strong> a{' '}
                <strong>{deletingFlight.arrivalCity}</strong>.
              </p>
              <p className="m-0 mt-2 text-muted-small">
                Esta acción no puede deshacerse. Si el vuelo ya forma parte de un itinerario,
                el sistema impedirá la eliminación.
              </p>
            </>
          )
        }
      />
    </div>
  );
}
