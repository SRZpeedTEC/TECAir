import { apiFetch } from './api.js';

// ── Búsqueda de itinerarios por origen y destino ──
// Corresponde a: GET /api/itineraries/search?originCode=&destinationCode=
// Respuesta API (camelCase ya normalizado): ItinerarySearchResponse[]
//   { itineraryId, price, originCode, destinationCode, totalFlights,
//     departureDatetime, arrivalDatetime }
export async function searchItineraries(originCode, destinationCode) {
  const params = new URLSearchParams({ originCode, destinationCode });
  const data = await apiFetch(`/itineraries/search?${params}`);

  return data.map((it) => ({
    itineraryId:       it.itineraryId       ?? it.ItineraryId,
    price:             Number(it.price      ?? it.Price),
    originCode:        it.originCode        ?? it.OriginCode,
    destinationCode:   it.destinationCode   ?? it.DestinationCode,
    totalFlights:      it.totalFlights      ?? it.TotalFlights,
    departureDatetime: it.departureDatetime ?? it.DepartureDatetime,
    arrivalDatetime:   it.arrivalDatetime   ?? it.ArrivalDatetime,
  }));
}

// ── Detalle por id ──
// Corresponde a: GET /api/itineraries/{id}
// Respuesta: ItineraryDetailsResponse → { itineraryId, price, flights: [...] }
// Cada vuelo: { flightOrder, flightId, departureAirportName, departureCode,
//   departureCity, arrivalAirportName, arrivalCode, arrivalCity,
//   departureDatetime, arrivalDatetime, gate, state }
export async function getItineraryById(id) {
  const data = await apiFetch(`/itineraries/${id}`);
  return {
    itineraryId: data.itineraryId ?? data.ItineraryId,
    price:       Number(data.price ?? data.Price),
    flights: (data.flights ?? data.Flights ?? []).map((f) => ({
      flightOrder:          f.flightOrder          ?? f.FlightOrder,
      flightId:             f.flightId             ?? f.FlightId,
      departureAirportName: f.departureAirportName ?? f.DepartureAirportName,
      departureCode:        f.departureCode        ?? f.DepartureCode,
      departureCity:        f.departureCity        ?? f.DepartureCity,
      arrivalAirportName:   f.arrivalAirportName   ?? f.ArrivalAirportName,
      arrivalCode:          f.arrivalCode          ?? f.ArrivalCode,
      arrivalCity:          f.arrivalCity          ?? f.ArrivalCity,
      departureDatetime:    f.departureDatetime    ?? f.DepartureDatetime,
      arrivalDatetime:      f.arrivalDatetime      ?? f.ArrivalDatetime,
      gate:                 f.gate                 ?? f.Gate,
      state:                f.state                ?? f.State,
    })),
  };
}

// ── Crear itinerario ──
// Corresponde a: POST /api/itineraries
// payload: { price: number, flights: [{ flightId, flightOrder }] }
// Errores típicos:
//   400 → reglas de formato (precio negativo, lista vacía, ids/orden inválidos)
//   404 → algún flightId no existe
//   409 → vuelos o órdenes duplicados, escalas que no encadenan, vuelos no OPEN
export async function createItinerary(payload) {
  return apiFetch('/itineraries', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// ── Editar itinerario ──
// Corresponde a: PUT /api/itineraries/{id}
// Reemplaza precio + lista completa de vuelos.
export async function updateItinerary(id, payload) {
  return apiFetch(`/itineraries/${id}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// ── Eliminar itinerario ──
// Corresponde a: DELETE /api/itineraries/{id}
// 409 si ya tiene reservaciones.
export async function deleteItinerary(id) {
  const url = `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/itineraries/${id}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const body = await res.json();
      if (body?.message) msg = body.message;
    } catch { /* sin body json */ }
    throw new Error(msg);
  }
  return true;
}
