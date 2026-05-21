import { apiFetch } from './api.js';
import { fmtTime, calcDuration } from '../utils/format.js';

// Convierte "YYYY-MM-DD" a Date local sin desfase horario.
function parseISODateLocal(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Si la promoción está vigente hoy, devuelve un objeto normalizado.
// Si no hay promo o quedó fuera de vigencia, devuelve null.
// Exportado para que las pantallas que consumen el mismo endpoint
// (buscador y home) compartan el criterio de vigencia.
export function pickActivePromotion(promo) {
  if (!promo) return null;
  const start = parseISODateLocal(promo.startDate ?? promo.StartDate);
  const end   = parseISODateLocal(promo.endDate   ?? promo.EndDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!start || !end || today < start || today > end) return null;
  return {
    promotionCode:   promo.promotionCode   ?? promo.PromotionCode,
    itineraryId:     promo.itineraryId     ?? promo.ItineraryId,
    imageUrl:        promo.imageUrl        ?? promo.ImageUrl ?? null,
    startDate:       promo.startDate       ?? promo.StartDate,
    endDate:         promo.endDate         ?? promo.EndDate,
    discountPercent: Number(promo.discountPercent ?? promo.DiscountPercent),
    promoPrice:      Number(promo.promoPrice      ?? promo.PromoPrice),
  };
}

// Devuelve el detalle completo de un itinerario, incluyendo sus vuelos ordenados.
// Corresponde a: GET /api/itineraries/{id}
export async function getItineraryById(id) {
  return apiFetch(`/itineraries/${id}`);
}

// Devuelve todos los itinerarios publicos junto con su promocion (cuando exista).
// Corresponde a: GET /api/itineraries/public/with-promotions
// Esta es la unica fuente que deben usar las pantallas publicas para listar
// vuelos y promociones, asi se mantienen consistentes.
export async function getPublicItinerariesWithPromotions() {
  return apiFetch('/itineraries/public/with-promotions');
}

// Busca itinerarios públicos disponibles entre dos aeropuertos.
//
// Backend único usado: GET /api/itineraries/public/with-promotions
// Devuelve ItineraryDetailsResponse[] con vuelos y promoción embebida, así que
// el cruce de promociones que antes se hacía con un segundo fetch desaparece.
// El filtrado por origen/destino se hace en cliente porque el endpoint no
// acepta parámetros de ruta.
export async function searchItineraries(originCode, destinationCode) {
  const data = await getPublicItinerariesWithPromotions();

  // Cada itinerario trae sus vuelos ordenados por flight_order.
  // El origen/destino del itinerario es el primer y último vuelo.
  const filtered = data
    .map((it) => {
      const flights = (it.flights ?? it.Flights ?? [])
        .slice()
        .sort((a, b) => (a.flightOrder ?? a.FlightOrder) - (b.flightOrder ?? b.FlightOrder));
      if (flights.length === 0) return null;
      const first = flights[0];
      const last  = flights[flights.length - 1];
      return {
        raw: it,
        flights,
        originCode:      first.departureCode ?? first.DepartureCode,
        destinationCode: last.arrivalCode    ?? last.ArrivalCode,
        departure:       new Date(first.departureDatetime ?? first.DepartureDatetime),
        arrival:         new Date(last.arrivalDatetime    ?? last.ArrivalDatetime),
      };
    })
    .filter((it) => it && it.originCode === originCode && it.destinationCode === destinationCode);

  if (filtered.length === 0) return [];

  // Etiquetas "Mejor precio" / "Más rápido" — el precio que cuenta es el
  // efectivo (con promo aplicada si está vigente).
  const enriched = filtered.map(({ raw, flights, departure, arrival }) => {
    const basePrice    = Number(raw.price ?? raw.Price);
    const activePromo  = pickActivePromotion(raw.promotion ?? raw.Promotion);
    const displayPrice = activePromo ? activePromo.promoPrice : basePrice;
    return {
      raw, departure, arrival, flights,
      itineraryId:    raw.itineraryId ?? raw.ItineraryId,
      basePrice,
      displayPrice,
      activePromotion: activePromo,
    };
  });

  const minPrice    = Math.min(...enriched.map((e) => e.displayPrice));
  const minDuration = Math.min(...enriched.map((e) => e.arrival - e.departure));

  return enriched.map((e) => {
    const durMs = e.arrival - e.departure;
    let tag = null;
    if (e.displayPrice === minPrice)    tag = 'Mejor precio';
    if (durMs === minDuration)           tag = 'Más rápido'; // pisa "Mejor precio" si coinciden

    return {
      id:          `IT${e.itineraryId}`,
      itineraryId: e.itineraryId,
      stops:       e.flights.length - 1,
      depart:      fmtTime(e.departure),
      arrive:      fmtTime(e.arrival),
      duration:    calcDuration(e.departure, e.arrival),
      price:       e.basePrice,
      basePrice:   e.basePrice,
      displayPrice: e.displayPrice,
      activePromotion: e.activePromotion,
      tag,
    };
  });
}
