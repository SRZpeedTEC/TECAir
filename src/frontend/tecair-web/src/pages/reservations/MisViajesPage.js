import { useEffect, useState } from 'react';

import Nav from '../../components/Nav.js';
import TicketCard from '../../components/TicketCard.js';
import { getReservationsByEmail } from '../../services/reservationService.js';
import { getItineraryById } from '../../services/itineraryService.js';
import { fmtTime, calcDuration } from '../../utils/format.js';

const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function fmtTripDate(d) {
  if (!d) return '—';
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

// Convierte un grupo (itinerario + reservaciones de ese itinerario) al shape que espera TicketCard.
// Las reservaciones de un mismo itinerario para el mismo usuario son distintos pasajeros
// del mismo viaje, asi que se colapsan en una sola tarjeta con varios pasajeros.
function buildTripFromGroup(itinerary, reservations) {
  const flights = (itinerary.flights ?? [])
    .slice()
    .sort((a, b) => a.flightOrder - b.flightOrder);
  const first = flights[0];
  const last = flights[flights.length - 1];

  const departure = first ? new Date(first.departureDatetime) : null;
  const arrival = last ? new Date(last.arrivalDatetime) : null;

  // Un viaje se considera "completado" si ya paso la hora de llegada.
  // El estado de la reservacion en si (PAID/CHECKED) no determina si el vuelo ya ocurrio.
  const now = new Date();
  const status = arrival && arrival < now ? 'completado' : 'proxim';

  // Si todas las reservaciones estan canceladas, la tarjeta se muestra como cancelada.
  // (Hoy el backend solo deja PAID y CHECKED, asi que esto es defensivo.)
  const allCancelled = reservations.length > 0 &&
    reservations.every((r) => (r.state ?? '').toUpperCase() === 'CANCELLED');
  const finalStatus = allCancelled ? 'cancelado' : status;

  // Cada reservacion individual = un pasajero distinto en el mismo itinerario.
  const passengers = reservations.map((r) => {
    const parts = (r.passengerName ?? '').trim().split(/\s+/);
    return {
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
    };
  });

  // Usamos el reservationId mas alto como identificador visible de la tarjeta.
  const reservationCode = reservations
    .map((r) => r.reservationId)
    .sort((a, b) => b - a)[0];

  return {
    id: `AT-${String(reservationCode).padStart(6, '0')}`,
    status: finalStatus,
    from: {
      code: first?.departureCode ?? '—',
      city: first?.departureCity ?? '',
    },
    to: {
      code: last?.arrivalCode ?? '—',
      city: last?.arrivalCity ?? '',
    },
    depart: departure ? fmtTime(departure) : '—',
    arrive: arrival ? fmtTime(arrival) : '—',
    date: fmtTripDate(departure),
    duration: departure && arrival ? calcDuration(departure, arrival) : '—',
    // Numero de vuelo: usamos el id del primer vuelo del itinerario como referencia
    // visible. El backend no expone un codigo IATA por vuelo.
    flight: first ? `AT${String(first.flightId).padStart(3, '0')}` : '—',
    // Por ahora no tenemos el asiento asignado en este endpoint; cuando exista
    // un check-in se podra resolver desde ahi.
    seat: 'Por asignar',
    passengers,
    price: Number(itinerary.price ?? 0) * (passengers.length || 1),
    // Para ordenar despues por fecha.
    _departureMs: departure ? departure.getTime() : 0,
  };
}

// Pantalla de historial de viajes: reservas próximas y vuelos anteriores
export default function MisViajesPage({
  goHome,
  goToMisViajes,
  currentUser,
  onOpenAuth,
  onLogout,
  onStudentProgram,
}) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!currentUser?.email) {
      setTrips([]);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const reservations = await getReservationsByEmail(currentUser.email);

        // Sin reservaciones: mostramos la pantalla vacia sin gastar fetches extra.
        if (reservations.length === 0) {
          if (!cancelled) setTrips([]);
          return;
        }

        // Agrupamos las reservaciones por itinerario.
        const groups = new Map();
        for (const r of reservations) {
          if (!groups.has(r.itineraryId)) groups.set(r.itineraryId, []);
          groups.get(r.itineraryId).push(r);
        }

        // Una sola peticion por itinerario unico (un usuario tipico tiene pocos).
        const itineraryIds = Array.from(groups.keys());
        const itineraries = await Promise.all(
          itineraryIds.map((id) => getItineraryById(id).catch(() => null)),
        );

        const built = itineraries
          .map((it, idx) => {
            if (!it) return null;
            return buildTripFromGroup(it, groups.get(itineraryIds[idx]));
          })
          .filter(Boolean)
          .sort((a, b) => b._departureMs - a._departureMs);

        if (!cancelled) setTrips(built);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [currentUser?.email]);

  const proximos = trips.filter((t) => t.status === 'proxim');
  const pasados = trips.filter((t) => t.status !== 'proxim');

  const sectionHeading = {
    color: 'var(--muted)',
    fontWeight: 600,
    fontSize: '0.85rem',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
  };

  return (
    <>
      <Nav
        onLogoClick={goHome}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        onStudentProgram={onStudentProgram}
        onMisViajes={goToMisViajes}
        currentUser={currentUser}
      />

      <div className="container py-5" style={{ maxWidth: 860 }}>
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h2 className="serif mb-1" style={{ fontSize: '2rem' }}>Mis viajes</h2>
            <p className="text-muted mb-0">Historial y reservas activas de tu cuenta</p>
          </div>
          <button className="btn btn-burgundy" onClick={goHome}>
            <i className="bi bi-plus me-2"></i>Nuevo vuelo
          </button>
        </div>

        {!currentUser && (
          <div
            className="text-center p-5 rounded-4"
            style={{ background: '#fff', boxShadow: '0 0 0 1.5px var(--burgundy-line)' }}
          >
            <i className="bi bi-person-lock" style={{ fontSize: '2.5rem', color: 'var(--burgundy)' }}></i>
            <h5 className="serif mt-3 mb-2">Inicia sesión para ver tus viajes</h5>
            <p className="text-muted mb-3">Necesitamos tu cuenta para mostrar tus reservaciones.</p>
            <button className="btn btn-burgundy" onClick={onOpenAuth}>
              <i className="bi bi-box-arrow-in-right me-2"></i>Iniciar sesión
            </button>
          </div>
        )}

        {currentUser && loading && (
          <div className="text-center py-5 text-muted">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Cargando tus reservaciones…
          </div>
        )}

        {currentUser && !loading && error && (
          <div
            className="p-4 rounded-4"
            style={{ background: '#fde8ee', color: '#9b2335', border: '1px solid #f5c6cf' }}
          >
            <i className="bi bi-exclamation-circle-fill me-2"></i>
            No se pudieron cargar tus viajes: {error}
          </div>
        )}

        {currentUser && !loading && !error && trips.length === 0 && (
          <div
            className="text-center p-5 rounded-4"
            style={{ background: '#fff', boxShadow: '0 0 0 1.5px var(--burgundy-line)' }}
          >
            <i className="bi bi-airplane" style={{ fontSize: '2.5rem', color: 'var(--muted)' }}></i>
            <h5 className="serif mt-3 mb-2">Aún no tienes viajes registrados</h5>
            <p className="text-muted mb-3">Cuando reserves tu primer vuelo aparecerá aquí.</p>
            <button className="btn btn-burgundy" onClick={goHome}>
              <i className="bi bi-search me-2"></i>Buscar vuelos
            </button>
          </div>
        )}

        {currentUser && !loading && !error && proximos.length > 0 && (
          <section className="mb-5">
            <h5 className="serif mb-3" style={sectionHeading}>Próximos vuelos</h5>
            {proximos.map((t) => (
              <TicketCard key={t.id} trip={t} isNew={false} />
            ))}
          </section>
        )}

        {currentUser && !loading && !error && pasados.length > 0 && (
          <section>
            <h5 className="serif mb-3" style={sectionHeading}>Vuelos anteriores</h5>
            {pasados.map((t) => (
              <TicketCard key={t.id} trip={t} isNew={false} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
