import { apiFetch, BASE_URL } from './api.js';

// Lista las maletas de un check-in.
// Corresponde a: GET /api/check-ins/{confirmationNumber}/baggages
//
// Respuesta normalizada a camelCase:
//   [{ bagNumber, confirmationNumber, weight, color }]
export async function getBaggagesByCheckIn(confirmationNumber) {
  const data = await apiFetch(`/check-ins/${confirmationNumber}/baggages`);
  return data.map(normalizeBaggage);
}

// Crea una nueva maleta asociada a un check-in existente.
// Corresponde a: POST /api/baggages
//
// payload:
//   { confirmationNumber, weight, color }
//
// Errores comunes:
//   404 → check-in no existe
//   400 → datos invalidos (peso fuera de rango, color vacio)
export async function createBaggage(payload) {
  const data = await apiFetch('/baggages', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  return normalizeBaggage(data);
}

// Actualiza peso/color de una maleta existente.
// Corresponde a: PUT /api/baggages/{bagNumber}
export async function updateBaggage(bagNumber, { weight, color }) {
  const data = await apiFetch(`/baggages/${bagNumber}`, {
    method:  'PUT',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ weight, color }),
  });
  return normalizeBaggage(data);
}

// Elimina una maleta por su numero.
// Corresponde a: DELETE /api/baggages/{bagNumber}
export async function deleteBaggage(bagNumber) {
  await fetch(
    `${BASE_URL}/baggages/${bagNumber}`,
    { method: 'DELETE' },
  ).then((res) => {
    if (!res.ok && res.status !== 204) {
      return res.json().then((b) => { throw new Error(b?.message ?? `Error ${res.status}`); });
    }
  });
}

function normalizeBaggage(b) {
  return {
    bagNumber:          b.bagNumber          ?? b.BagNumber,
    confirmationNumber: b.confirmationNumber ?? b.ConfirmationNumber,
    weight:             Number(b.weight      ?? b.Weight),
    color:              b.color              ?? b.Color,
  };
}

// Tarifa por la n-esima maleta (1-indexada):
//   1 → 0    (gratis)
//   2 → 50   (segunda)
//   3+ → 75  (tercera en adelante: tarifa fija)
export function feeForBagAt(index) {
  if (index === 1) return 0;
  if (index === 2) return 50;
  return 75;
}

export function totalFee(count) {
  let total = 0;
  for (let i = 1; i <= count; i++) total += feeForBagAt(i);
  return total;
}
