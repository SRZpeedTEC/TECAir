import { Capacitor } from '@capacitor/core';
import { initDB } from './services/db.js';
import { installFetchInterceptor } from './services/interceptor.js';

(async function bootstrap() {
  if (!Capacitor.isNativePlatform()) return;

  const db = await initDB();
  if (!db) {
    console.warn('[TECAir] SQLite no disponible — sin caché offline');
    return;
  }

  installFetchInterceptor();
  console.log('[TECAir] Caché offline activo');
})();
