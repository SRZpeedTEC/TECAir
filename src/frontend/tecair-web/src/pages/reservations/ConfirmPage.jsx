import Nav       from '../../components/Nav.jsx';
import { fmtCRC } from '../../utils/format.js';
import { printReceipt, buildReceiptDataFromState } from '../../utils/receipt.js';

// Pantalla de confirmación final de la reserva
export default function ConfirmPage({ state, goHome, goToMisViajes, currentUser, onOpenAuth, onLogout, onStudentProgram }) {
  const f        = state.selectedFlight;
  const total    = state.pax.adults;
  const subtotal = f ? f.price * total : 0;
  const tax      = Math.round(subtotal * 0.13); // IVA 13%

  // Lista de reservaciones reales creadas en backend (una por pasajero).
  const reservations = state.reservations || [];
  const primaryId    = reservations[0]?.reservationId;
  const confirmId    = primaryId ? `AT-${String(primaryId).padStart(6, '0')}` : '—';

  return (
    <>
      <Nav onLogoClick={goHome} onOpenAuth={onOpenAuth} onLogout={onLogout} onStudentProgram={onStudentProgram} onMisViajes={goToMisViajes} currentUser={currentUser} />

      <div className="container py-5 text-center" style={{ maxWidth: 680 }}>
        {/* Ícono de éxito */}
        <div
          className="d-inline-flex align-items-center justify-content-center mb-3"
          style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--burgundy-soft)', color: 'var(--burgundy)', fontSize: '2rem' }}
        >
          <i className="bi bi-check2"></i>
        </div>

        <h1 className="serif" style={{ fontSize: '2.2rem' }}>Itinerario reservado</h1>
        <p className="text-muted">
          Te enviamos los detalles a tu correo. El asiento se asignará al hacer check-in en el aeropuerto.
          Llega 2 horas antes para vuelos internacionales.
        </p>

        {/* Tarjeta con detalles de la reserva */}
        <div className="bg-white border rounded-3 p-4 text-start mt-4" style={{ borderColor: 'var(--line)' }}>
          <div className="d-flex justify-content-between">
            <div>
              <div className="small text-muted">Confirmación</div>
              <div className="serif fs-4">{confirmId}</div>
            </div>
            <div className="text-end">
              <div className="small text-muted">Total pagado</div>
              <div className="serif fs-4 text-burgundy">{fmtCRC(subtotal + tax)}</div>
            </div>
          </div>
          <hr />
          <div className="row">
            {/* Datos del vuelo */}
            <div className="col-md-6">
              <div className="small text-muted">Vuelo</div>
              <div className="fw-semibold">{state.from?.code} → {state.to?.code}</div>
              <div className="small">{f?.depart} — {f?.arrive} · {f?.duration}</div>
            </div>
            {/* Pasajeros con su numero de reservacion real (asiento se asigna en check-in) */}
            <div className="col-md-6">
              <div className="small text-muted">Pasajeros</div>
              {(state.passengers || []).map((p, i) => {
                const resId = reservations[i]?.reservationId;
                return (
                  <div key={i} className="small">
                    {p.firstName} {p.lastName}
                    {resId
                      ? <> — <span className="text-burgundy">reserva #{resId}</span></>
                      : <> — <span className="text-muted">asiento por asignar</span></>
                    }
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Acciones post-confirmación */}
        <div className="d-flex gap-3 justify-content-center flex-wrap mt-4">
          <button className="btn btn-burgundy-outline" onClick={goHome}>
            Volver al inicio
          </button>
          <button className="btn btn-burgundy-outline" onClick={() => printReceipt(buildReceiptDataFromState(state))}>
            <i className="bi bi-file-earmark-pdf me-2"></i>Descargar factura
          </button>
          <button className="btn btn-burgundy" onClick={goToMisViajes}>
            <i className="bi bi-ticket-perforated me-2"></i>Ver mis viajes
          </button>
        </div>
      </div>
    </>
  );
}
