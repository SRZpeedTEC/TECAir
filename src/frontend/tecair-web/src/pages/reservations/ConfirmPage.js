import Nav       from '../../components/Nav.js';
import { fmtCRC } from '../../utils/format.js';

// Pantalla de confirmación final de la reserva
export default function ConfirmPage({ state, goHome, goToMisViajes, currentUser, onOpenAuth, onLogout, onStudentProgram }) {
  const f        = state.selectedFlight;
  const total    = state.pax.adults;
  const subtotal = f ? f.price * total : 0;
  const tax      = Math.round(subtotal * 0.13); // IVA 13%

  // Número de confirmación único generado al renderizar (solo demo local)
  const confirmId = 'AT-' + Math.floor(Math.random() * 900000 + 100000);

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
            {/* Pasajeros (asiento se asigna en check-in) */}
            <div className="col-md-6">
              <div className="small text-muted">Pasajeros</div>
              {(state.passengers || []).map((p, i) => (
                <div key={i} className="small">
                  {p.firstName} {p.lastName} — <span className="text-muted">asiento por asignar</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Acciones post-confirmación */}
        <div className="d-flex gap-3 justify-content-center flex-wrap mt-4">
          <button className="btn btn-burgundy-outline" onClick={goHome}>
            Volver al inicio
          </button>
          <button className="btn btn-burgundy" onClick={goToMisViajes}>
            <i className="bi bi-ticket-perforated me-2"></i>Ver mis viajes
          </button>
        </div>
      </div>
    </>
  );
}
