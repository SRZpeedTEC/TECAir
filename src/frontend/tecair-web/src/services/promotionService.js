import { apiFetch } from './api.js';

// Normaliza una promoción del backend.
// Backend: { promotionCode, itineraryId, imageUrl, startDate, endDate, discountPercent, promoPrice }
function normalizePromotion(p) {
  return {
    promotionCode:   p.promotionCode   ?? p.PromotionCode,
    itineraryId:     p.itineraryId     ?? p.ItineraryId,
    imageUrl:        p.imageUrl        ?? p.ImageUrl ?? null,
    startDate:       p.startDate       ?? p.StartDate,
    endDate:         p.endDate         ?? p.EndDate,
    discountPercent: Number(p.discountPercent ?? p.DiscountPercent),
    promoPrice:      Number(p.promoPrice      ?? p.PromoPrice),
  };
}

// Lista todas las promociones activas en el sistema.
// Corresponde a: GET /api/promotions
export async function getAllPromotions() {
  const data = await apiFetch('/promotions');
  return data.map(normalizePromotion);
}

// Devuelve el detalle del itinerario asociado a la promoción para enriquecer la
// tarjeta con origen, destino y nombres de ciudades.
// Corresponde a: GET /api/itineraries/{id}
export async function getItineraryById(id) {
  const data = await apiFetch(`/itineraries/${id}`);
  const flights = (data.flights ?? data.Flights ?? []).map((f) => ({
    flightOrder:    f.flightOrder    ?? f.FlightOrder,
    departureCode:  f.departureCode  ?? f.DepartureCode,
    departureCity:  f.departureCity  ?? f.DepartureCity,
    arrivalCode:    f.arrivalCode    ?? f.ArrivalCode,
    arrivalCity:    f.arrivalCity    ?? f.ArrivalCity,
  })).sort((a, b) => a.flightOrder - b.flightOrder);

  return {
    itineraryId: data.itineraryId ?? data.ItineraryId,
    price:       Number(data.price ?? data.Price),
    flights,
  };
}

// Devuelve YYYY-MM-DD para comparar contra startDate/endDate sin lidiar con TZ.
function todayIso() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// True si hoy está dentro del rango [startDate, endDate] de la promoción.
function isPromotionActive(p) {
  const today = todayIso();
  const start = String(p.startDate ?? '').slice(0, 10);
  const end   = String(p.endDate   ?? '').slice(0, 10);
  if (!start || !end) return false;
  return start <= today && today <= end;
}

// Obtiene las promociones vigentes hoy y las enriquece con datos del itinerario
// (origen + destino + ciudad de destino). Si una promo no puede enriquecerse,
// igual se devuelve con los campos básicos.
export async function getPromotionsWithItinerary() {
  const promos = (await getAllPromotions()).filter(isPromotionActive);

  const enriched = await Promise.all(promos.map(async (p) => {
    try {
      const it = await getItineraryById(p.itineraryId);
      const first = it.flights[0];
      const last  = it.flights[it.flights.length - 1];
      return {
        ...p,
        basePrice:       it.price,
        originCode:      first?.departureCode ?? null,
        originCity:      first?.departureCity ?? null,
        destinationCode: last?.arrivalCode    ?? null,
        destinationCity: last?.arrivalCity    ?? null,
      };
    } catch {
      return { ...p, basePrice: null, originCode: null, originCity: null, destinationCode: null, destinationCity: null };
    }
  }));

  return enriched;
}
