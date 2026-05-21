import { apiFetch } from './api.js';

// Busca aeropuertos por término (ciudad, país, nombre o código IATA).
// Corresponde a: GET /api/airports/search?term=...
// Respuesta de la API: [{ AirportName, City, Country, Code }] (hasta 10 resultados)
export async function searchAirports(term) {
  const params = new URLSearchParams({ term });
  const data = await apiFetch(`/airports/search?${params}`);

  // Normaliza el shape al formato interno usado por el typeahead
  return data.map((a) => ({
    code:    a.code    ?? a.Code,
    name:    a.airportName ?? a.AirportName,
    city:    a.city    ?? a.City,
    country: a.country ?? a.Country,
  }));
}

// Devuelve la conexion configurada entre dos aeropuertos: distancia y duracion.
// Corresponde a: GET /api/airports/connection?from=XXX&to=YYY
//   200 → { departureAirportCode, arrivalAirportCode, distanceMiles, estimatedDurationMinutes }
//   400 → parametros faltantes o iguales
//   404 → no hay conexion configurada para ese par
// El form de vuelos usa este endpoint para mostrar la llegada calculada
// antes de crear/editar (el backend hace el mismo lookup al guardar).
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
