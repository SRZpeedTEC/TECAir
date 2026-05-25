import { apiFetch } from './api.js';

// Crea una reservación pagada. Corresponde a POST /api/reservations.
// payload: { itineraryId, userEmail, passengerId, state ('PAID'|'CHECKED'),
//   paymentReference, planePlate?, seatNumber? }
// Errores: 404 itinerario/usuario/pasajero no existen, 409 paymentReference duplicada.
export async function createReservation(payload) {
  return apiFetch('/reservations', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// Identificador de pago razonablemente único para la demo.
// Limitado a 60 caracteres (VARCHAR(60) en la BD).
export function generatePaymentReference(index) {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `PAY-${ts}-${rand}-${index}`.toUpperCase();
}

// Busca reservaciones por id exacto, pasaporte exacto o coincidencia parcial de nombre/apellido.
// Corresponde a: GET /api/reservations/search?reservationId=...&passengerId=...&name=...
// Backend exige al menos uno de los tres parametros.
//
// Respuesta normalizada a camelCase:
//   { reservationId, itineraryId, userEmail, passengerId, passengerName,
//     state, paymentReference, preferredPlanePlate, preferredSeatNumber }
export async function searchReservations({ reservationId, passengerId, name }) {
  const params = new URLSearchParams();
  if (reservationId) params.set('reservationId', reservationId);
  if (passengerId)   params.set('passengerId', passengerId);
  if (name)          params.set('name', name);

  const data = await apiFetch(`/reservations/search?${params}`);

  return data.map((r) => ({
    reservationId:       r.reservationId       ?? r.ReservationId,
    itineraryId:         r.itineraryId         ?? r.ItineraryId,
    userEmail:           r.userEmail           ?? r.UserEmail,
    passengerId:         r.passengerId         ?? r.PassengerId,
    passengerName:       r.passengerName       ?? r.PassengerName,
    state:               r.state               ?? r.State,
    paymentReference:    r.paymentReference    ?? r.PaymentReference,
    preferredPlanePlate: r.preferredPlanePlate ?? r.PreferredPlanePlate,
    preferredSeatNumber: r.preferredSeatNumber ?? r.PreferredSeatNumber,
  }));
}
