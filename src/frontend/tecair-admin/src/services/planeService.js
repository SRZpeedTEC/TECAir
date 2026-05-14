import { apiFetch } from './api.js';

// Lista aviones registrados, opcionalmente filtrando por placa.
// Corresponde a: GET /api/planes?plate=...
// Respuesta de la API: [{ Plate, Model, Capacity }]
export async function searchPlanes(plate) {
  const params = new URLSearchParams();
  if (plate) params.set('plate', plate);
  const qs = params.toString();
  const data = await apiFetch(`/planes${qs ? `?${qs}` : ''}`);

  return data.map((p) => ({
    plate:    p.plate    ?? p.Plate,
    model:    p.model    ?? p.Model,
    capacity: p.capacity ?? p.Capacity,
  }));
}
