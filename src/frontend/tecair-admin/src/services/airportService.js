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
