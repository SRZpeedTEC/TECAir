import { getDb } from './db.js';
import AIRPORTS from '../data/airports.js';

function cityFor(code) {
  return AIRPORTS.find((a) => a.code === code)?.city ?? code;
}

// Devuelve todos los itinerarios con sus vuelos y promoción, mismo shape que la API.
export async function getAllItinerariesFromDb() {
  const db = await getDb();

  const rows = db.exec(`
    SELECT i.itinerary_id, i.price,
           f.flight_order, f.departure_code, f.departure_datetime,
           f.arrival_code,  f.arrival_datetime,
           p.promotion_code, p.image_url, p.start_date, p.end_date,
           p.discount_percent, p.promo_price
    FROM itineraries i
    JOIN flights f ON f.itinerary_id = i.itinerary_id
    LEFT JOIN promotions p ON p.itinerary_id = i.itinerary_id
    ORDER BY i.itinerary_id, f.flight_order
  `);

  if (!rows.length) return [];

  const map = new Map();
  for (const [
    itId, price,
    flightOrder, depCode, depDt, arrCode, arrDt,
    promoCode, imageUrl, startDate, endDate, discountPercent, promoPrice,
  ] of rows[0].values) {
    if (!map.has(itId)) {
      map.set(itId, {
        itineraryId: itId,
        price,
        flights: [],
        promotion: promoCode ? {
          promotionCode: promoCode, itineraryId: itId,
          imageUrl, startDate, endDate, discountPercent, promoPrice,
        } : null,
      });
    }
    map.get(itId).flights.push({
      flightOrder, departureCode: depCode, departureDatetime: depDt,
      arrivalCode: arrCode, arrivalDatetime: arrDt,
    });
  }

  return [...map.values()];
}

// Devuelve todas las promociones, mismo shape que GET /api/promotions.
export async function getAllPromotionsFromDb() {
  const db = await getDb();
  const rows = db.exec(
    'SELECT promotion_code, itinerary_id, image_url, start_date, end_date, discount_percent, promo_price FROM promotions'
  );
  if (!rows.length) return [];
  return rows[0].values.map(([promotionCode, itineraryId, imageUrl, startDate, endDate, discountPercent, promoPrice]) => ({
    promotionCode, itineraryId, imageUrl, startDate, endDate,
    discountPercent: Number(discountPercent), promoPrice: Number(promoPrice),
  }));
}

// Devuelve un itinerario por id con flights enriquecidos con ciudad, mismo shape que GET /api/itineraries/{id}.
export async function getItineraryByIdFromDb(id) {
  const db = await getDb();

  const itRows = db.exec('SELECT itinerary_id, price FROM itineraries WHERE itinerary_id = ?', [id]);
  if (!itRows.length || !itRows[0].values.length) return null;
  const [itId, price] = itRows[0].values[0];

  const flRows = db.exec(
    'SELECT flight_order, departure_code, arrival_code FROM flights WHERE itinerary_id = ? ORDER BY flight_order',
    [id]
  );
  const flights = flRows.length
    ? flRows[0].values.map(([flightOrder, departureCode, arrivalCode]) => ({
        flightOrder,
        departureCode,
        departureCity: cityFor(departureCode),
        arrivalCode,
        arrivalCity:   cityFor(arrivalCode),
      }))
    : [];

  return { itineraryId: itId, price, flights };
}
