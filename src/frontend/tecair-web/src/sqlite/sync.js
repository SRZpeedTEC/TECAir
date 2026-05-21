import { getDb, persistDb } from './db.js';
import { apiFetch } from '../services/api.js';

export async function syncAll() {
  if (!navigator.onLine) {
    console.log('[SQLite] sin conexión – sync omitido');
    return false;
  }

  try {
    const db = await getDb();
    const itineraries = await apiFetch('/itineraries/public/with-promotions');

    db.run('DELETE FROM promotions');
    db.run('DELETE FROM flights');
    db.run('DELETE FROM itineraries');

    const stmtIt = db.prepare(
      'INSERT INTO itineraries (itinerary_id, price) VALUES (?, ?)'
    );
    const stmtFl = db.prepare(`
      INSERT INTO flights (itinerary_id, flight_order, departure_code, departure_datetime, arrival_code, arrival_datetime)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const stmtPr = db.prepare(`
      INSERT OR REPLACE INTO promotions (promotion_code, itinerary_id, image_url, start_date, end_date, discount_percent, promo_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of itineraries) {
      const id    = it.itineraryId ?? it.ItineraryId;
      const price = Number(it.price ?? it.Price ?? 0);
      stmtIt.run([id, price]);

      for (const f of (it.flights ?? it.Flights ?? [])) {
        stmtFl.run([
          id,
          f.flightOrder       ?? f.FlightOrder,
          f.departureCode     ?? f.DepartureCode,
          f.departureDatetime ?? f.DepartureDatetime,
          f.arrivalCode       ?? f.ArrivalCode,
          f.arrivalDatetime   ?? f.ArrivalDatetime,
        ]);
      }

      const promo = it.promotion ?? it.Promotion;
      if (promo) {
        stmtPr.run([
          promo.promotionCode   ?? promo.PromotionCode,
          id,
          promo.imageUrl        ?? promo.ImageUrl ?? null,
          promo.startDate       ?? promo.StartDate,
          promo.endDate         ?? promo.EndDate,
          Number(promo.discountPercent ?? promo.DiscountPercent ?? 0),
          Number(promo.promoPrice      ?? promo.PromoPrice      ?? 0),
        ]);
      }
    }

    stmtIt.free();
    stmtFl.free();
    stmtPr.free();

    persistDb();
    console.log(`[SQLite] sync ok – ${itineraries.length} itinerarios`);
    return true;
  } catch (e) {
    console.warn('[SQLite] sync falló:', e.message);
    return false;
  }
}
