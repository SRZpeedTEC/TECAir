import {
  getPublicItinerariesWithPromotions,
  pickActivePromotion,
} from './itineraryService.js';

// Devuelve las promociones vigentes hoy, enriquecidas con el origen y destino
// del itinerario al que aplican. Lo hacemos derivando de la lista de itinerarios
// publicos (un unico GET), de manera que esta vista es 100% consistente con la
// pantalla de busqueda de vuelos: si una promo no aparece aqui, tampoco aparece
// en los resultados de busqueda.
//
// Endpoint fuente: GET /api/itineraries/public/with-promotions
export async function getPromotionsWithItinerary() {
  const itineraries = await getPublicItinerariesWithPromotions();

  return itineraries
    .map((it) => {
      const promo = pickActivePromotion(it.promotion ?? it.Promotion);
      if (!promo) return null;

      const flights = (it.flights ?? it.Flights ?? [])
        .slice()
        .sort((a, b) => (a.flightOrder ?? a.FlightOrder) - (b.flightOrder ?? b.FlightOrder));
      const first = flights[0];
      const last = flights[flights.length - 1];

      return {
        promotionCode:   promo.promotionCode,
        itineraryId:     promo.itineraryId,
        imageUrl:        promo.imageUrl,
        startDate:       promo.startDate,
        endDate:         promo.endDate,
        discountPercent: promo.discountPercent,
        promoPrice:      promo.promoPrice,
        basePrice:       Number(it.price ?? it.Price),
        originCode:      first?.departureCode ?? first?.DepartureCode ?? null,
        originCity:      first?.departureCity ?? first?.DepartureCity ?? null,
        destinationCode: last?.arrivalCode    ?? last?.ArrivalCode    ?? null,
        destinationCity: last?.arrivalCity    ?? last?.ArrivalCity    ?? null,
        departureDatetime: first?.departureDatetime ?? first?.DepartureDatetime ?? null,
      };
    })
    .filter(Boolean);
}
