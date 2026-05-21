import initSqlJs from 'sql.js';

const STORAGE_KEY = 'tecair_sqlite_v1';
let _db = null;

function uint8ToBase64(data) {
  let binary = '';
  for (let i = 0; i < data.byteLength; i++) binary += String.fromCharCode(data[i]);
  return btoa(binary);
}

function base64ToUint8(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function createSchema(db) {
  db.run(`
    CREATE TABLE IF NOT EXISTS itineraries (
      itinerary_id INTEGER PRIMARY KEY,
      price        REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS flights (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      itinerary_id         INTEGER NOT NULL,
      flight_order         INTEGER NOT NULL,
      departure_code       TEXT    NOT NULL,
      departure_datetime   TEXT    NOT NULL,
      arrival_code         TEXT    NOT NULL,
      arrival_datetime     TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promotions (
      promotion_code   TEXT    PRIMARY KEY,
      itinerary_id     INTEGER NOT NULL,
      image_url        TEXT,
      start_date       TEXT,
      end_date         TEXT,
      discount_percent REAL,
      promo_price      REAL
    );

    CREATE TABLE IF NOT EXISTS sync_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs({ locateFile: () => './sql-wasm.wasm' });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      _db = new SQL.Database(base64ToUint8(saved));
    } catch {
      _db = new SQL.Database();
    }
  } else {
    _db = new SQL.Database();
  }

  createSchema(_db);
  return _db;
}

export function persistDb() {
  if (!_db) return;
  try {
    localStorage.setItem(STORAGE_KEY, uint8ToBase64(_db.export()));
    localStorage.setItem('tecair_sqlite_ts', new Date().toISOString());
  } catch (e) {
    console.warn('[SQLite] persist failed:', e.message);
  }
}

export function getLastSyncTs() {
  return localStorage.getItem('tecair_sqlite_ts');
}
