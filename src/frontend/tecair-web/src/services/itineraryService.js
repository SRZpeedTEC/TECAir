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

// Helper de UX: valida cupos antes de confirmar.
// El backend vuelve a validar en POST /reservations.
export async function getItineraryAvailability(itineraryId, passengers) {
  const params = new URLSearchParams({ passengers: String(passengers) });
  return apiFetch(`/itineraries/${itineraryId}/availability?${params}`);
}

function formatDateParam(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Busca itinerarios públicos disponibles entre dos aeropuertos.
//
// Backend usado: GET /api/itineraries/search con filtros opcionales.
// La API aplica filtros de ruta, fecha, escalas y ordenamiento; el detalle
// adicional solo se consulta para mostrar promociones activas.
export async function searchItineraries(originCode, destinationCode, options = {}) {
  const params = new URLSearchParams();
  if (originCode) params.set('departureCode', originCode);
  if (destinationCode) params.set('arrivalCode', destinationCode);
  const departureDate = formatDateParam(options.departureDate);
  if (departureDate) params.set('departureDate', departureDate);
  if (options.stops) params.set('stops', options.stops);
  if (options.sortBy) params.set('sortBy', options.sortBy);
  const searchResults = await apiFetch(`/itineraries/search?${params}`);

  if (searchResults.length === 0) return [];

  const details = await Promise.all(
    searchResults.map((it) => getItineraryById(it.itineraryId ?? it.ItineraryId).catch(() => null))
  );

  const searchEnriched = searchResults.map((raw, index) => {
    const detail = details[index];
    const basePrice = Number(raw.price ?? raw.Price);
    const activePromo = pickActivePromotion(detail?.promotion ?? detail?.Promotion);
    const displayPrice = activePromo ? activePromo.promoPrice : basePrice;
    const departure = new Date(raw.departureDatetime ?? raw.DepartureDatetime);
    const arrival = new Date(raw.arrivalDatetime ?? raw.ArrivalDatetime);

    return {
      departure,
      arrival,
      totalFlights: raw.totalFlights ?? raw.TotalFlights,
      itineraryId: raw.itineraryId ?? raw.ItineraryId,
      basePrice,
      displayPrice,
      activePromotion: activePromo,
    };
  });

  const searchMinPrice = Math.min(...searchEnriched.map((e) => e.displayPrice));
  const searchMinDuration = Math.min(...searchEnriched.map((e) => e.arrival - e.departure));

  return searchEnriched.map((e) => {
    const durMs = e.arrival - e.departure;
    let tag = null;
    if (e.displayPrice === searchMinPrice) tag = 'Mejor precio';
    if (durMs === searchMinDuration) tag = 'Más rápido';

    return {
      id: `IT${e.itineraryId}`,
      itineraryId: e.itineraryId,
      stops: e.totalFlights - 1,
      depart: fmtTime(e.departure),
      arrive: fmtTime(e.arrival),
      duration: calcDuration(e.departure, e.arrival),
      price: e.basePrice,
      basePrice: e.basePrice,
      displayPrice: e.displayPrice,
      activePromotion: e.activePromotion,
      tag,
    };
  });
}
