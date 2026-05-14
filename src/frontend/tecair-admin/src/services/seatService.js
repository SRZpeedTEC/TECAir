import { apiFetch } from './api.js';

// Devuelve los asientos disponibles del avion asignado a un vuelo.
// Corresponde a: GET /api/seats/available/{flightId}
//
// El backend solo devuelve los asientos libres — los ocupados no aparecen
// en la respuesta. Para pintar el mapa completo, el frontend asume que
// cualquier asiento del layout que no este en este set esta ocupado.
//
// Respuesta normalizada a camelCase:
//   [{ planePlate, seatNumber, isAvailable }]
export async function getAvailableSeats(flightId) {
  const data = await apiFetch(`/seats/available/${flightId}`);

  return data.map((s) => ({
    planePlate:  s.planePlate  ?? s.PlanePlate,
    seatNumber:  s.seatNumber  ?? s.SeatNumber,
    isAvailable: s.isAvailable ?? s.IsAvailable ?? true,
  }));
}
