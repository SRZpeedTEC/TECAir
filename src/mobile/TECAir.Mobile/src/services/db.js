import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { SCHEMA } from '../models/schema.js';

const sqlite = new SQLiteConnection(CapacitorSQLite);
const DB_NAME = 'tecair_mobile';
const DB_VERSION = 1;

let db = null;

export async function initDB() {
  try {
    await sqlite.checkConnectionsConsistency();
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result;
    db = isConn
      ? await sqlite.retrieveConnection(DB_NAME, false)
      : await sqlite.createConnection(DB_NAME, false, 'no-encryption', DB_VERSION, false);
    await db.open();
    await db.execute(SCHEMA);
    console.log('[TECAir] SQLite listo');
    return db;
  } catch (err) {
    console.error('[TECAir] Error inicializando SQLite:', err);
    return null;
  }
}

export function getDB() {
  return db;
}
