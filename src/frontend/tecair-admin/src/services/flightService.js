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
