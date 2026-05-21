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

// Lista vuelos filtrados por aeropuerto de salida y estado.
// Corresponde a: GET /api/flights/by-departure?departureCode=XXX&state=YYY
// state admite 'UPCOMING' (para construir itinerarios) u 'OPEN' (para listados
// administrativos de vuelos publicados).
//
// Respuesta normalizada a camelCase:
//   { flightId, planePlate, departureAirportName, departureCode, departureCity,
//     arrivalAirportName, arrivalCode, arrivalCity, state, gate,
//     departureDatetime, arrivalDatetime }
export async function listFlightsByDepartureAndState(departureCode, state) {
  const params = new URLSearchParams({ departureCode, state });
  const data = await apiFetch(`/flights/by-departure?${params}`);

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

// ─── Apertura y Cierre de Vuelos ───
// Endpoints usados por las pantallas FlightTransitionPanel.
//
// 1) GET /api/flights/search?state=UPCOMING|OPEN&departureCode=XXX&arrivalCode=YYY
//    Lista vuelos en el estado indicado que salen de departureCode y llegan a arrivalCode.
//
// 2) PATCH /api/flights/{flightId}/state  body: { state: 'OPEN' | 'CLOSED' }
//    Transición controlada: solo permite UPCOMING→OPEN y OPEN→CLOSED.
//    Cualquier otra transición devuelve 409 desde backend.

export async function searchFlightsByRoute({ state, departureCode, arrivalCode } = {}) {
  if (!state)         throw new Error("state es obligatorio (UPCOMING | OPEN).");
  if (!departureCode) throw new Error("departureCode es obligatorio.");
  if (!arrivalCode)   throw new Error("arrivalCode es obligatorio.");

  const params = new URLSearchParams({ state, departureCode, arrivalCode });
  const data = await apiFetch(`/flights/search?${params}`);

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

export async function transitionFlightState(flightId, nextState) {
  return apiFetch(`/flights/${flightId}/state`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ state: nextState }),
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
