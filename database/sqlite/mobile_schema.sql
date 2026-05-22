-- TECAir - Esquema SQLite para la app móvil
-- Espeja la estructura de la base de datos PostgreSQL.
-- Se ejecuta al iniciar la app; INSERT OR REPLACE mantiene los datos al día.

CREATE TABLE IF NOT EXISTS airports (
  code         TEXT PRIMARY KEY,
  airport_name TEXT NOT NULL,
  city         TEXT NOT NULL,
  country      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS itineraries (
  itinerary_id INTEGER PRIMARY KEY,
  price        REAL    NOT NULL,
  state        TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS itinerary_flights (
  itinerary_flight_id  INTEGER PRIMARY KEY,
  itinerary_id         INTEGER NOT NULL,
  flight_order         INTEGER NOT NULL,
  flight_id            INTEGER NOT NULL,
  plane_plate          TEXT    NOT NULL,
  departure_airport_name TEXT  NOT NULL,
  departure_code       TEXT    NOT NULL,
  departure_city       TEXT    NOT NULL,
  arrival_airport_name TEXT    NOT NULL,
  arrival_code         TEXT    NOT NULL,
  arrival_city         TEXT    NOT NULL,
  departure_datetime   TEXT    NOT NULL,
  arrival_datetime     TEXT    NOT NULL,
  miles                INTEGER NOT NULL DEFAULT 0,
  gate                 TEXT,
  state                TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS promotions (
  promotion_code   TEXT    PRIMARY KEY,
  itinerary_id     INTEGER NOT NULL,
  image_url        TEXT,
  start_date       TEXT    NOT NULL,
  end_date         TEXT    NOT NULL,
  discount_percent REAL    NOT NULL,
  promo_price      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  reservation_id    INTEGER PRIMARY KEY,
  itinerary_id      INTEGER NOT NULL,
  user_email        TEXT    NOT NULL,
  passenger_id      TEXT    NOT NULL,
  passenger_name    TEXT    NOT NULL,
  state             TEXT    NOT NULL,
  payment_reference TEXT
);

CREATE TABLE IF NOT EXISTS sync_meta (
  key        TEXT    PRIMARY KEY,
  synced_at  INTEGER NOT NULL
);
