import { apiFetch } from './api.js';

// Crea un pasajero. Corresponde a POST /api/passengers.
// El backend devuelve 409 si el pasaporte ya existe — el caller puede ignorar
// el conflicto y reusar al pasajero existente.
export async function createPassenger(payload) {
  return apiFetch('/passengers', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// Mapea el valor visible en el formulario al código aceptado por la BD.
export function mapGenderToCode(uiValue) {
  switch (uiValue) {
    case 'Femenino':  return 'FEMALE';
    case 'Masculino': return 'MALE';
    default:          return 'OTHER';
  }
}
