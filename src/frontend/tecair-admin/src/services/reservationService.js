import { apiFetch } from './api.js';

// Busca reservaciones por pasaporte exacto o por coincidencia parcial de nombre/apellido.
// Corresponde a: GET /api/reservations/search?passengerId=...&name=...
// Backend exige al menos uno de los dos parametros.
//
// Respuesta normalizada a camelCase:
//   { reservationId, itineraryId, userEmail, passengerId, passengerName,
//     state, paymentReference, preferredPlanePlate, preferredSeatNumber }
export async function searchReservations({ passengerId, name }) {
  const params = new URLSearchParams();
  if (passengerId) params.set('passengerId', passengerId);
  if (name)        params.set('name', name);

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
