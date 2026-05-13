import { apiFetch } from './api.js';

// Crea un vuelo atómico.
// Corresponde a: POST /api/flights
// Errores que devuelve la API (apiFetch los re-lanza como Error con el mensaje del backend):
//   400 → validaciones de formato
//   404 → avión o aeropuertos inexistentes
//   409 → conflicto de itinerario del avión o conflicto de gate
export async function createFlight(payload) {
  return apiFetch('/flights', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// Lista vuelos OPEN filtrados por aeropuerto de salida.
// Corresponde a: GET /api/flights/open?departureCode=XXX
// NOTA: backend aún no expone un GET /api/flights que liste TODOS los vuelos
// (cualquier estado, opcionalmente con filtros). Mientras existe ese endpoint
// usamos este como fallback — ver doc en FLIGHT_MANAGEMENT.md.
//
// Respuesta normalizada a camelCase:
//   { flightId, planePlate, departureAirportName, departureCode, departureCity,
//     arrivalAirportName, arrivalCode, arrivalCity, state, gate,
//     departureDatetime, arrivalDatetime }
export async function listOpenFlightsByDeparture(departureCode) {
  const params = new URLSearchParams({ departureCode });
  const data = await apiFetch(`/flights/open?${params}`);

  return data.map((f) => ({
    flightId:             f.flightId             ?? f.FlightId,
    planePlate:           f.planePlate           ?? f.PlanePlate,
    departureAirportName: f.departureAirportName ?? f.DepartureAirportName,
    departureCode:        f.departureCode        ?? f.DepartureCode,
    departureCity:        f.departureCity        ?? f.DepartureCity,
    arrivalAirportName:   f.arrivalAirportName   ?? f.ArrivalAirportName,
    arrivalCode:          f.arrivalCode          ?? f.ArrivalCode,
    arrivalCity:          f.arrivalCity          ?? f.ArrivalCity,
    state:                f.state                ?? f.State,
    gate:                 f.gate                 ?? f.Gate,
    departureDatetime:    f.departureDatetime    ?? f.DepartureDatetime,
    arrivalDatetime:      f.arrivalDatetime      ?? f.ArrivalDatetime,
  }));
}

// Actualiza un vuelo existente.
// Corresponde a: PUT /api/flights/{flightId}
// El payload debe incluir todos los campos (incluyendo state) ya que el PUT es completo.
export async function updateFlight(flightId, payload) {
  return apiFetch(`/flights/${flightId}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// Elimina un vuelo. Devuelve 204 No Content cuando todo bien.
// Corresponde a: DELETE /api/flights/{flightId}
// 409 si el vuelo está usado en algún itinerario (no se permite borrar).
export async function deleteFlight(flightId) {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? '/api'}/flights/${flightId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch { /* respuesta sin body JSON */ }
    throw new Error(msg);
  }
  // 204 No Content — no parseamos body
  return true;
}
