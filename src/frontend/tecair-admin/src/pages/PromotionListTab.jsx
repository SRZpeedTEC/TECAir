import { useEffect, useState } from 'react';

import Modal              from '../components/Modal.jsx';
import ConfirmDialog      from '../components/ConfirmDialog.jsx';
import PromotionForm      from '../components/PromotionForm.jsx';
import {
  getAllPromotions,
  updatePromotion,
  deletePromotion,
} from '../services/promotionService.js';
import { getItineraryById } from '../services/itineraryService.js';

const pad2 = (n) => String(n).padStart(2, '0');

function fmtDateOnly(value) {
  if (!value) return '—';
  const [y, m, d] = String(value).split('-');
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

function fmtPriceCRC(n) {
  if (n == null || isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 });
}

// Tab de consulta: lista todas las promociones (GET /api/promotions) y permite
// editar / eliminar cada una. Para editar necesitamos también el itinerario
// asociado (su precio para calcular el % de descuento).
export default function PromotionListTab() {
  const [promotions, setPromotions] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [loadError,  setLoadError]  = useState(null);
  const [toast,      setToast]      = useState(null);

  // Edición
  const [editing,       setEditing]       = useState(null); // { promotion, itinerary }
  const [editingLoad,   setEditingLoad]   = useState(false);
  const [editingError,  setEditingError]  = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState(null);

  // Eliminación
  const [deleting,     setDeleting]     = useState(null);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const [deleteError,  setDeleteError]  = useState(null);

  const loadPromotions = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getAllPromotions();
      setPromotions(data);
    } catch (err) {
      setLoadError(err.message);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPromotions(); }, []);

  // ─── Editar ───
  const openEdit = async (promotion) => {
    setToast(null);
    setSubmitError(null);
    setEditingError(null);
    setEditing({ promotion, itinerary: null });
    setEditingLoad(true);
    try {
      const detail = await getItineraryById(promotion.itineraryId);
      const first = detail.flights?.[0];
      const last  = detail.flights?.[detail.flights.length - 1];
      setEditing({
        promotion,
        itinerary: {
          itineraryId:       detail.itineraryId,
          price:             detail.price,
          originCode:        first?.departureCode ?? '—',
          destinationCode:   last?.arrivalCode    ?? '—',
          departureDatetime: first?.departureDatetime ?? null,
          arrivalDatetime:   last?.arrivalDatetime   ?? null,
        },
      });
    } catch (err) {
      setEditingError(err.message);
    } finally {
      setEditingLoad(false);
    }
  };

  const handleEditSubmit = async (payload) => {
    if (!editing?.promotion) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updatePromotion(editing.promotion.promotionCode, payload);
      setToast(`Promoción "${editing.promotion.promotionCode}" actualizada correctamente.`);
      setEditing(null);
      loadPromotions();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Eliminar ───
  const openDelete = (promotion) => {
    setToast(null);
    setDeleteError(null);
    setDeleting(promotion);
  };

  const handleDeleteConfirm = async () => {
    if (!deleting) return;
    setDeletingBusy(true);
    setDeleteError(null);
    try {
      await deletePromotion(deleting.promotionCode);
      setToast(`Promoción "${deleting.promotionCode}" eliminada correctamente.`);
      setDeleting(null);
      loadPromotions();
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeletingBusy(false);
    }
  };

  return (
    <div>
      <div className="admin-alert admin-alert-info mb-3" role="status">
        <i className="bi bi-info-circle-fill"></i>
        <span>
          Esta vista lista todas las promociones existentes (<code>GET /api/promotions</code>).
          Desde aquí puedes editar el precio promocional, el período o la imagen, o eliminar la promoción.
        </span>
      </div>

      <div className="admin-card">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3 className="serif m-0">Promociones registradas</h3>
          <button
            type="button"
            className="btn-burgundy-outline"
            onClick={loadPromotions}
            disabled={loading}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Recargar
          </button>
        </div>

        {toast && (
          <div className="admin-alert admin-alert-success mt-2" role="status">
            <i className="bi bi-check-circle-fill"></i>
            <span>{toast}</span>
          </div>
        )}

        {loadError && (
          <div className="admin-alert admin-alert-error mt-2" role="alert">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{loadError}</span>
          </div>
        )}

        {loading && (
          <div className="ib-picker-msg mt-3">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Cargando promociones…
          </div>
        )}

        {!loading && !loadError && promotions.length === 0 && (
          <div className="flight-list-empty mt-3">
            <i className="bi bi-tag"></i>
            <p className="m-0">No hay promociones registradas todavía.</p>
          </div>
        )}

        {!loading && promotions.length > 0 && (
          <div className="flight-list-table-wrap mt-3">
            <table className="flight-list-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Itinerario</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Descuento</th>
                  <th>Precio promo</th>
                  <th>Imagen</th>
                  <th className="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p) => (
                  <tr key={p.promotionCode}>
                    <td className="mono">{p.promotionCode}</td>
                    <td className="mono">#{p.itineraryId}</td>
                    <td className="mono">{fmtDateOnly(p.startDate)}</td>
                    <td className="mono">{fmtDateOnly(p.endDate)}</td>
                    <td className="mono">{p.discountPercent}%</td>
                    <td className="mono">{fmtPriceCRC(p.promoPrice)}</td>
                    <td>
                      {p.imageUrl
                        ? <a href={p.imageUrl} target="_blank" rel="noreferrer" className="promo-img-link">
                            <i className="bi bi-image"></i> Ver
                          </a>
                        : <span className="text-muted-small">—</span>}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="flight-action-btn"
                        onClick={() => openEdit(p)}
                        aria-label={`Editar promoción ${p.promotionCode}`}
                        title="Editar"
                      >
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button
                        type="button"
                        className="flight-action-btn flight-action-danger"
                        onClick={() => openDelete(p)}
                        aria-label={`Eliminar promoción ${p.promotionCode}`}
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

      <Modal
        open={!!editing}
        onClose={submitting ? () => {} : () => setEditing(null)}
        title={editing?.promotion ? `Editar promoción "${editing.promotion.promotionCode}"` : ''}
        size="lg"
      >
        {editingLoad && (
          <div className="ib-picker-msg">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Cargando itinerario…
          </div>
        )}
        {editingError && (
          <div className="admin-alert admin-alert-error" role="alert">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{editingError}</span>
          </div>
        )}
        {!editingLoad && !editingError && editing?.itinerary && (
          <PromotionForm
            mode="edit"
            itinerary={editing.itinerary}
            initialValues={editing.promotion}
            onSubmit={handleEditSubmit}
            onCancel={() => setEditing(null)}
            submitting={submitting}
            submitError={submitError}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onCancel={() => { setDeleting(null); setDeleteError(null); }}
        onConfirm={handleDeleteConfirm}
        title="Eliminar promoción"
        destructive
        loading={deletingBusy}
        error={deleteError}
        confirmLabel="Eliminar promoción"
        message={
          deleting && (
            <>
              <p className="m-0">
                Vas a eliminar la promoción <strong>"{deleting.promotionCode}"</strong> del itinerario{' '}
                <strong>#{deleting.itineraryId}</strong>.
              </p>
              <p className="m-0 mt-2 text-muted-small">
                Esta acción no puede deshacerse.
              </p>
            </>
          )
        }
      />
    </div>
  );
}
