import Nav        from '../../components/Nav.js';
import TicketCard from '../../components/TicketCard.js';
import { MOCK_TRIPS } from '../../data/trips.js';

// Pantalla de historial de viajes: reservas próximas y vuelos anteriores
export default function MisViajesPage({ state, goHome, goToMisViajes, currentUser, onOpenAuth, onLogout, onStudentProgram }) {
  const f = state.selectedFlight;

  // Construye el viaje recién reservado desde el estado global (si existe)
  const newTrip = f && state.passengers?.length ? {
    id: 'AT-' + Math.floor(Math.random() * 900000 + 100000),
    status: 'proxim',
    from:     state.from,
    to:       state.to,
    depart:   f.depart,
    arrive:   f.arrive,
    date:     state.depart
      ? state.depart.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—',
    duration:   f.duration,
    flight:     f.id,
    seat:       state.seats?.[0] || '—',
    passengers: state.passengers,
    price:      f.price * state.pax.adults,
  } : null;

  // Combina el viaje nuevo (si hay) con los viajes de demostración
  const allTrips = newTrip ? [newTrip, ...MOCK_TRIPS] : MOCK_TRIPS;
  const proximos = allTrips.filter((t) => t.status === 'proxim');
  const pasados  = allTrips.filter((t) => t.status !== 'proxim');

  return (
    <>
      <Nav onLogoClick={goHome} onOpenAuth={onOpenAuth} onLogout={onLogout} onStudentProgram={onStudentProgram} onMisViajes={goToMisViajes} currentUser={currentUser} />

      <div className="container py-5" style={{ maxWidth: 860 }}>
        {/* Encabezado de sección */}
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h2 className="serif mb-1" style={{ fontSize: '2rem' }}>Mis viajes</h2>
            <p className="text-muted mb-0">Historial y reservas activas de tu cuenta</p>
          </div>
          <button className="btn btn-burgundy" onClick={goHome}>
            <i className="bi bi-plus me-2"></i>Nuevo vuelo
          </button>
        </div>

        {/* Próximos vuelos */}
        {proximos.length > 0 && (
          <section className="mb-5">
            <h5
              className="serif mb-3"
              style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Próximos vuelos
            </h5>
            {proximos.map((t, i) => (
              // Marca como "isNew" solo el primero si fue recién reservado en esta sesión
              <TicketCard key={t.id} trip={t} isNew={i === 0 && !!newTrip} />
            ))}
          </section>
        )}

        {/* Vuelos anteriores */}
        {pasados.length > 0 && (
          <section>
            <h5
              className="serif mb-3"
              style={{ color: 'var(--muted)', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Vuelos anteriores
            </h5>
            {pasados.map((t) => (
              <TicketCard key={t.id} trip={t} isNew={false} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
