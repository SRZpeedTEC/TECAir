import { getDB } from './db.js';

// ─── Write: API response → SQLite ────────────────────────────────────────────

async function recordSync(key) {
  const db = getDB();
  if (!db) return;
  await db.run(
    'INSERT OR REPLACE INTO sync_meta (key, synced_at) VALUES (?, ?)',
    [key, Date.now()]
  );
}

export async function syncAirports(airports) {
  const db = getDB();
  if (!db || !Array.isArray(airports)) return;
  for (const a of airports) {
    await db.run(
      'INSERT OR REPLACE INTO airports (code, airport_name, city, country) VALUES (?, ?, ?, ?)',
      [a.Code ?? a.code, a.AirportName ?? a.airportName, a.City ?? a.city, a.Country ?? a.country]
    );
  }
  await recordSync('airports');
}

export async function syncItineraries(itineraries) {
  const db = getDB();
  if (!db || !Array.isArray(itineraries)) return;
  for (const it of itineraries) {
    await db.run(
      'INSERT OR REPLACE INTO itineraries (itinerary_id, price, state) VALUES (?, ?, ?)',
      [it.ItineraryId, it.Price, it.State]
    );
    for (const f of it.Flights ?? []) {
      await db.run(
        `INSERT OR REPLACE INTO itinerary_flights
         (itinerary_flight_id, itinerary_id, flight_order, flight_id, plane_plate,
          departure_airport_name, departure_code, departure_city,
          arrival_airport_name, arrival_code, arrival_city,
          departure_datetime, arrival_datetime, miles, gate, state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          f.ItineraryFlightId, it.ItineraryId, f.FlightOrder, f.FlightId, f.PlanePlate,
          f.DepartureAirportName, f.DepartureCode, f.DepartureCity,
          f.ArrivalAirportName, f.ArrivalCode, f.ArrivalCity,
          f.DepartureDatetime, f.ArrivalDatetime, f.Miles, f.Gate ?? null, f.State,
        ]
      );
    }
    const p = it.Promotion;
    if (p) {
      await db.run(
        `INSERT OR REPLACE INTO promotions
         (promotion_code, itinerary_id, image_url, start_date, end_date, discount_percent, promo_price)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [p.PromotionCode, p.ItineraryId, p.ImageUrl ?? null, p.StartDate, p.EndDate, p.DiscountPercent, p.PromoPrice]
      );
    }
  }
  await recordSync('itineraries');
}

export async function syncReservations(reservations) {
  const db = getDB();
  if (!db || !Array.isArray(reservations)) return;
  for (const r of reservations) {
    await db.run(
      `INSERT OR REPLACE INTO reservations
       (reservation_id, itinerary_id, user_email, passenger_id, passenger_name, state, payment_reference)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [r.ReservationId, r.ItineraryId, r.UserEmail, r.PassengerId, r.PassengerName, r.State, r.PaymentReference ?? null]
    );
  }
  await recordSync('reservations');
}

// ─── Read: SQLite → API-format response ──────────────────────────────────────

function rowToFlight(f) {
  return {
    ItineraryFlightId: f.itinerary_flight_id,
    FlightOrder: f.flight_order,
    FlightId: f.flight_id,
    PlanePlate: f.plane_plate,
    DepartureAirportName: f.departure_airport_name,
    DepartureCode: f.departure_code,
    DepartureCity: f.departure_city,
    ArrivalAirportName: f.arrival_airport_name,
    ArrivalCode: f.arrival_code,
    ArrivalCity: f.arrival_city,
    DepartureDatetime: f.departure_datetime,
    ArrivalDatetime: f.arrival_datetime,
    Miles: f.miles,
    Gate: f.gate,
    State: f.state,
  };
}

function rowToPromo(p) {
  if (!p) return null;
  return {
    PromotionCode: p.promotion_code,
    ItineraryId: p.itinerary_id,
    ImageUrl: p.image_url,
    StartDate: p.start_date,
    EndDate: p.end_date,
    DiscountPercent: p.discount_percent,
    PromoPrice: p.promo_price,
  };
}

async function buildItinerary(db, row) {
  const flights = await db.query(
    'SELECT * FROM itinerary_flights WHERE itinerary_id = ? ORDER BY flight_order',
    [row.itinerary_id]
  );
  const promo = await db.query(
    'SELECT * FROM promotions WHERE itinerary_id = ?',
    [row.itinerary_id]
  );
  return {
    ItineraryId: row.itinerary_id,
    Price: row.price,
    State: row.state,
    Promotion: rowToPromo(promo.values?.[0] ?? null),
    Flights: (flights.values ?? []).map(rowToFlight),
  };
}

export async function getItinerariesOffline() {
  const db = getDB();
  if (!db) return null;
  const rows = await db.query("SELECT * FROM itineraries WHERE state = 'PUBLIC'");
  const result = [];
  for (const row of rows.values ?? []) {
    result.push(await buildItinerary(db, row));
  }
  return result;
}

export async function getItineraryByIdOffline(id) {
  const db = getDB();
  if (!db) return null;
  const rows = await db.query('SELECT * FROM itineraries WHERE itinerary_id = ?', [id]);
  if (!rows.values?.length) return null;
  return buildItinerary(db, rows.values[0]);
}

export async function searchAirportsOffline(term) {
  const db = getDB();
  if (!db) return null;
  const p = `%${term}%`;
  const rows = await db.query(
    'SELECT * FROM airports WHERE code LIKE ? OR airport_name LIKE ? OR city LIKE ? OR country LIKE ?',
    [p, p, p, p]
  );
  return (rows.values ?? []).map(a => ({
    Code: a.code,
    AirportName: a.airport_name,
    City: a.city,
    Country: a.country,
  }));
}

export async function searchItinerariesOffline(fromCode, toCode, departureDateStr) {
  const db = getDB();
  if (!db) return null;

  const itinRows = await db.query("SELECT * FROM itineraries WHERE state = 'PUBLIC'");
  const result = [];

  for (const row of itinRows.values ?? []) {
    const fRows = await db.query(
      'SELECT * FROM itinerary_flights WHERE itinerary_id = ? ORDER BY flight_order',
      [row.itinerary_id]
    );
    const flights = fRows.values ?? [];
    if (flights.length === 0) continue;

    const first = flights[0];
    const last  = flights[flights.length - 1];

    if (fromCode && first.departure_code !== fromCode) continue;
    if (toCode   && last.arrival_code    !== toCode)   continue;
    if (departureDateStr && !first.departure_datetime.startsWith(departureDateStr)) continue;

    result.push({
      ItineraryId:       row.itinerary_id,
      Price:             row.price,
      DepartureDatetime: first.departure_datetime,
      ArrivalDatetime:   last.arrival_datetime,
      TotalFlights:      flights.length,
    });
  }

  return result;
}

export async function getReservationsOffline(email) {
  const db = getDB();
  if (!db) return null;
  const rows = await db.query('SELECT * FROM reservations WHERE user_email = ?', [email]);
  return (rows.values ?? []).map(r => ({
    ReservationId: r.reservation_id,
    ItineraryId: r.itinerary_id,
    UserEmail: r.user_email,
    PassengerId: r.passenger_id,
    PassengerName: r.passenger_name,
    State: r.state,
    PaymentReference: r.payment_reference,
  }));
}
