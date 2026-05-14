import { apiFetch } from './api.js';

// Crea una reservacion pagada.
// Corresponde a: POST /api/reservations
//
// payload esperado:
//   { itineraryId, userEmail, passengerId, state ('PAID'|'CHECKED'),
//     paymentReference, planePlate?, seatNumber? }
//
// El backend devuelve:
//   404 si itinerario / usuario / pasajero no existen
//   409 si la paymentReference ya esta usada
//   400 si el payload viola las validaciones de formato
export async function createReservation(payload) {
  return apiFetch('/reservations', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
}

// Genera un identificador de pago razonablemente unico para esta demo.
// Limitado a 60 caracteres para no chocar con la columna VARCHAR(60).
export function generatePaymentReference(index) {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `PAY-${ts}-${rand}-${index}`.toUpperCase();
}
