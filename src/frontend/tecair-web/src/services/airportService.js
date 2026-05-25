import { apiFetch } from './api.js';
import AIRPORTS from '../data/airports.js';

// Busca aeropuertos por término (ciudad, país o código IATA).
// Corresponde a: GET /api/airports/search?term=...
// Respuesta de la API: [{ AirportName, City, Country, Code }]
export async function searchAirports(term) {
  const params = new URLSearchParams({ term });
  let data;

  try {
    data = await apiFetch(`/airports/search?${params}`);
  } catch {
    const needle = term.trim().toLowerCase();
    data = AIRPORTS.filter((airport) =>
      airport.code.toLowerCase().includes(needle) ||
      airport.city.toLowerCase().includes(needle) ||
      airport.country.toLowerCase().includes(needle)
    );
  }

  // Normaliza el shape de la API al formato interno que usan los componentes
  return data.map((a) => ({
    code:    a.code    ?? a.Code,
    city:    a.city    ?? a.City,
    country: a.country ?? a.Country,
  }));
}
