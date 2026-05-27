import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { initDB } from './services/db.js';
import { installFetchInterceptor, scheduleStartupSync, scheduleUserSync } from './services/interceptor.js';

(async function bootstrap() {
  if (!Capacitor.isNativePlatform()) return;

  // Conecta el botón físico Atrás de Android con el historial de la SPA.
  // Usa __tecairCurrentPage (expuesto por App.jsx) en vez de canGoBack de
  // Capacitor, porque canGoBack puede ser true aunque la SPA esté en home,
  // lo que haría que history.back() recargue el WebView y pierda la sesión.
  CapApp.addListener('backButton', () => {
    if (window.__tecairCurrentPage && window.__tecairCurrentPage !== 'home') {
      window.history.back();
    } else {
      CapApp.exitApp();
    }
  });

  // Instala el interceptor siempre — si SQLite no está disponible, las
  // funciones offline devuelven null y se cae al fetch normal automáticamente.
  const originalFetch = window.fetch.bind(window);

  const db = await initDB();
  if (!db) {
    console.warn('[TECAir] SQLite no disponible — sin caché offline');
  } else {
    installFetchInterceptor();

    // Pobla itinerarios y aeropuertos. scheduleStartupSync comprueba primero
    // si __TECAIR_API_BASE ya está seteado (evento llegó antes que initDB),
    // y si no, escucha el evento tecair:ready.
    scheduleStartupSync(originalFetch);

    // Pobla reservas del usuario. Dos caminos:
    // A) __TECAIR_USER_EMAIL ya está seteado → el login ocurrió antes que initDB
    // B) El login ocurre después → el listener captura el evento
    if (window.__TECAIR_USER_EMAIL) {
      scheduleUserSync(window.__TECAIR_USER_EMAIL, originalFetch);
    }
    window.addEventListener('tecair:user-login', (e) => {
      scheduleUserSync(e.detail?.email, originalFetch);
    });

    console.log('[TECAir] Caché offline activo');
  }
})();
