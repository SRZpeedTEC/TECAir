import { apiFetch } from './api.js';

// Registra un check-in asignando un asiento a una reservacion en un vuelo.
// Corresponde a: POST /api/check-ins
//
// payload esperado:
//   { reservationId, itineraryFlightId, planePlate, seatNumber }
//
// Respuesta normalizada a camelCase:
//   { confirmationNumber, reservationId, itineraryFlightId, planePlate, seatNumber }
//
// Errores que devuelve la API:
//   404 → reservacion, tramo o asiento inexistente
//   409 → asiento ya tomado en ese tramo, o ya existe check-in para esta reservacion en ese vuelo
//   400 → datos invalidos
export async function createCheckIn(payload) {
  const data = await apiFetch('/check-ins', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  return {
    confirmationNumber: data.confirmationNumber ?? data.ConfirmationNumber,
    reservationId:      data.reservationId      ?? data.ReservationId,
    itineraryFlightId:  data.itineraryFlightId  ?? data.ItineraryFlightId,
    planePlate:         data.planePlate         ?? data.PlanePlate,
    seatNumber:         data.seatNumber         ?? data.SeatNumber,
  };
}
