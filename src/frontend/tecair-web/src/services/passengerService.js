import { apiFetch } from './api.js';

// Crea un pasajero en el backend.
// Corresponde a: POST /api/passengers
//
// payload esperado:
//   { passportId, birthday (YYYY-MM-DD), gender ('FEMALE'|'MALE'|'OTHER'),
//     name, lname }
//
// El backend devuelve 409 si el pasaporte ya existe — en ese caso el caller
// puede ignorar el error y continuar reusando ese pasajero.
export async function createPassenger(payload) {
  return apiFetch('/passengers', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// Mapea el valor que muestra el formulario al codigo aceptado por la BD.
// La tabla passenger tiene CHECK (gender IN ('FEMALE','MALE','OTHER')).
export function mapGenderToCode(uiValue) {
  switch (uiValue) {
    case 'Femenino':  return 'FEMALE';
    case 'Masculino': return 'MALE';
    default:          return 'OTHER';
  }
}
