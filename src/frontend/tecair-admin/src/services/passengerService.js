import { apiFetch } from './api.js';

// POST /api/passengers. 409 si el pasaporte ya existe — el caller puede
// ignorar el conflicto y reusar el pasajero existente.
export async function createPassenger(payload) {
  return apiFetch('/passengers', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// Mapea el valor del formulario al codigo aceptado por la BD.
export function mapGenderToCode(uiValue) {
  switch (uiValue) {
    case 'Femenino':  return 'FEMALE';
    case 'Masculino': return 'MALE';
    default:          return 'OTHER';
  }
}
