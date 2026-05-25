import { apiFetch } from './api.js';

// GET /api/airports/search?term=...  (ciudad, pais, nombre o codigo IATA, hasta 10 resultados)
export async function searchAirports(term) {
  const params = new URLSearchParams({ term });
  const data = await apiFetch(`/airports/search?${params}`);

  return data.map((a) => ({
    code:    a.code    ?? a.Code,
    name:    a.airportName ?? a.AirportName,
    city:    a.city    ?? a.City,
    country: a.country ?? a.Country,
  }));
}

// GET /api/airports/connection?from=XXX&to=YYY → distancia y duracion del par.
// El form de vuelos usa esto para mostrar la llegada calculada antes de guardar
// (el backend hace el mismo lookup internamente al crear/editar).
export async function getAirportConnection(fromCode, toCode) {
  const params = new URLSearchParams({ from: fromCode, to: toCode });
  const data = await apiFetch(`/airports/connection?${params}`);
  return {
    departureAirportCode:     data.departureAirportCode     ?? data.DepartureAirportCode,
    arrivalAirportCode:       data.arrivalAirportCode       ?? data.ArrivalAirportCode,
    distanceMiles:            data.distanceMiles            ?? data.DistanceMiles,
    estimatedDurationMinutes: data.estimatedDurationMinutes ?? data.EstimatedDurationMinutes,
  };
}
