import { apiFetch } from './api.js';
import { fmtTime, calcDuration } from '../utils/format.js';
import { generateFlights } from '../utils/flights.js';

// Busca itinerarios disponibles entre dos aeropuertos.
// Corresponde a: GET /api/itineraries/search?originCode=...&destinationCode=...
// Respuesta de la API: [{ ItineraryId, Price, OriginCode, DestinationCode,
//                         TotalFlights, DepartureDatetime, ArrivalDatetime }]
export async function searchItineraries(originCode, destinationCode) {
  const params = new URLSearchParams({ originCode, destinationCode });
  let data;

  try {
    data = await apiFetch(`/itineraries/search?${params}`);
  } catch {
    return generateFlights({ code: originCode }, { code: destinationCode });
  }

  if (data.length === 0) {
    return [];
  }

  // Calcula las etiquetas "Más rápido" y "Mejor precio" comparando todos los resultados
  const minPrice    = Math.min(...data.map((r) => Number(r.price    ?? r.Price)));
  const minDuration = Math.min(...data.map((r) => {
    const dep = new Date(r.departureDatetime ?? r.DepartureDatetime);
    const arr = new Date(r.arrivalDatetime   ?? r.ArrivalDatetime);
    return arr - dep;
  }));

  return data.map((r) => {
    const depRaw = r.departureDatetime ?? r.DepartureDatetime;
    const arrRaw = r.arrivalDatetime   ?? r.ArrivalDatetime;
    const dep    = new Date(depRaw);
    const arr    = new Date(arrRaw);
    const durMs  = arr - dep;
    const price  = Number(r.price ?? r.Price);
    const stops  = (r.totalFlights ?? r.TotalFlights) - 1;

    // Asigna etiqueta al itinerario más barato o más rápido del conjunto
    let tag = null;
    if (price  === minPrice)    tag = 'Mejor precio';
    if (durMs  === minDuration) tag = 'Más rápido'; // sobreescribe si coincide con el más barato

    return {
      id:          `IT${r.itineraryId ?? r.ItineraryId}`,
      itineraryId: r.itineraryId ?? r.ItineraryId,
      stops,
      depart:   fmtTime(dep),
      arrive:   fmtTime(arr),
      duration: calcDuration(dep, arr),
      price,
      tag,
    };
  });
}
