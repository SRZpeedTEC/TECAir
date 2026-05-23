import { useState } from 'react';

import AirportTypeahead   from '../components/AirportTypeahead.jsx';
import Modal              from '../components/Modal.jsx';
import ConfirmDialog      from '../components/ConfirmDialog.jsx';
import ItineraryBuilder   from '../components/ItineraryBuilder.jsx';
import {
  searchItineraries,
  getItineraryById,
  updateItinerary,
  deleteItinerary,
} from '../services/itineraryService.js';

function getStateBadgeStyle(state) {
  if (state === 'PUBLIC') return { background: '#e8f5ee', color: '#2d7a4f' };
  if (state === 'CLOSED') return { background: '#fde8ee', color: '#9b2335' };
  return { background: '#fdf2e6', color: '#9b6d23' };
}

function getStateBadgeTitle(state) {
  if (state === 'PUBLIC') return 'Visible para clientes';
  if (state === 'CLOSED') return 'Cerrado (no visible para clientes)';
  return 'Borrador (no visible para clientes)';
}

function getStateBadgeLabel(state) {
  if (state === 'PUBLIC') return 'Publicado';
  if (state === 'CLOSED') return 'Cerrado';
  return 'Borrador';
}

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

// Convierte un vuelo del detalle (ItineraryFlightResponse) al shape que espera
// ItineraryBuilder en sus "legs" (basado en OpenFlightResponse).
// planePlate no viene en el detalle; se deja como '' para que el chip lo omita.
function detailFlightToLeg(f) {
  return {
    flightId:             f.flightId,
    planePlate:           '',
    departureAirportName: f.departureAirportName,
    departureCode:        f.departureCode,
    departureCity:        f.departureCity,
    arrivalAirportName:   f.arrivalAirportName,
    arrivalCode:          f.arrivalCode,
    arrivalCity:          f.arrivalCity,
    state:                f.state,
    gate:                 f.gate,
    departureDatetime:    f.departureDatetime,
    arrivalDatetime:      f.arrivalDatetime,
  };
}

export default function ItineraryListTab() {
  const [origin,      setOrigin]      = useState(null);
  const [destination, setDestination] = useState(null);
  const [results,     setResults]     = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [loadError,   setLoadError]   = useState(null);
  const [touched,     setTouched]     = useState(false);

  // Toast global tras editar/eliminar
  const [toast, setToast] = useState(null);

  // Estado del modal de edición
  const [editing,        setEditing]        = useState(null); // { id, price, legs }
  const [loadingDetail,  setLoadingDetail]  = useState(false);
  const [detailError,    setDetailError]    = useState(null);

  // Estado de eliminación
  const [deleting,       setDeleting]       = useState(null); // itinerary object
  const [deletingBusy,   setDeletingBusy]   = useState(false);
  const [deleteError,    setDeleteError]    = useState(null);

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

  // ─── Editar ───
  const openEdit = async (itinerary) => {
    setToast(null);
    setEditing({ id: itinerary.itineraryId, price: itinerary.price, state: itinerary.state, legs: [] });
    setLoadingDetail(true);
    setDetailError(null);
    try {
      const detail = await getItineraryById(itinerary.itineraryId);
      const legs = [...detail.flights]
        .sort((a, b) => a.flightOrder - b.flightOrder)
        .map(detailFlightToLeg);
      setEditing({ id: detail.itineraryId, price: detail.price, state: detail.state, legs });
    } catch (err) {
      setDetailError(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleEditSubmit = async (payload) => {
    if (!editing) return;
    await updateItinerary(editing.id, payload);
    setToast(`Itinerario #${editing.id} actualizado correctamente.`);
    setEditing(null);
    handleSearch();
  };

  // ─── Eliminar ───
  const openDelete = (itinerary) => {
    setToast(null);
    setDeleteError(null);
    setDeleting(itinerary);
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError(null);
    try {
      await deleteItinerary(deleting.itineraryId);
      setToast(`Itinerario #${deleting.itineraryId} eliminado correctamente.`);
      setDeleting(null);
      handleSearch();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-card">
        <div className="row g-3 align-items-end">
          <div className="col-md-5">
            <AirportTypeahead
              id="it-origin"
              label="Origen"
              value={origin}
              onChange={setOrigin}
              exclude={destination?.code}
            />
          </div>
          <div className="col-md-5">
            <AirportTypeahead
              id="it-destination"
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
          <div className="flight-list-table-wrap mt-3">
            <table className="flight-list-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Salida</th>
                  <th>Llegada</th>
                  <th>Tramos</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {results.map((it) => {
                  // Los estados PUBLIC y CLOSED se muestran solo para consulta; no se editan ni se cierran manualmente.
                  const canManage = it.state === 'EDITION';
                  return (
                  <tr key={it.itineraryId}>
                    <td className="mono">{it.itineraryId}</td>
                    <td className="mono">{it.originCode}</td>
                    <td className="mono">{it.destinationCode}</td>
                    <td className="mono">{fmtDateTime(it.departureDatetime)}</td>
                    <td className="mono">{fmtDateTime(it.arrivalDatetime)}</td>
                    <td>
                      <span className="it-badge">
                        {it.totalFlights} {it.totalFlights === 1 ? 'directo' : 'vuelos'}
                      </span>
                    </td>
                    <td className="mono">{fmtPriceCRC(it.price)}</td>
                    <td>
                      <span
                        className="it-badge"
                        style={getStateBadgeStyle(it.state)}
                        title={getStateBadgeTitle(it.state)}
                      >
                        {getStateBadgeLabel(it.state)}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="flight-action-btn"
                        onClick={() => openEdit(it)}
                        aria-label={`${canManage ? 'Editar' : 'Ver'} itinerario ${it.itineraryId}`}
                        title={canManage ? 'Editar' : 'Ver detalle'}
                      >
                        <i className={`bi ${canManage ? 'bi-pencil' : 'bi-eye'}`}></i>
                      </button>
                      {canManage && (
                        <button
                          type="button"
                          className="flight-action-btn flight-action-danger"
                          onClick={() => openDelete(it)}
                          aria-label={`Eliminar itinerario ${it.itineraryId}`}
                          title="Eliminar"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de edición */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${editing.state === 'EDITION' ? 'Editar' : 'Ver'} itinerario #${editing.id}` : ''}
        size="lg"
      >
        {loadingDetail && (
          <div className="ib-picker-msg">
            <span className="spinner-border spinner-border-sm me-2"></span>Cargando detalle…
          </div>
        )}
        {detailError && (
          <div className="admin-alert admin-alert-error" role="alert">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{detailError}</span>
          </div>
        )}
        {!loadingDetail && !detailError && editing && editing.legs.length > 0 && (
          <ItineraryBuilder
            mode="edit"
            initialPrice={editing.price}
            initialState={editing.state}
            initialLegs={editing.legs}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => { setDeleting(null); setDeleteError(null); }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar itinerario"
        destructive
        loading={deletingBusy}
        error={deleteError}
        confirmLabel="Eliminar itinerario"
        message={
          deleting && (
            <>
              <p className="m-0">
                Vas a eliminar el itinerario <strong>#{deleting.itineraryId}</strong> de{' '}
                <strong>{deleting.originCode}</strong> a <strong>{deleting.destinationCode}</strong>.
              </p>
              <p className="m-0 mt-2 text-muted-small">
                Esta acción no puede deshacerse. Si el itinerario ya tiene reservaciones, el sistema impedirá la eliminación.
              </p>
            </>
          )
        }
      />
    </div>
  );
}
