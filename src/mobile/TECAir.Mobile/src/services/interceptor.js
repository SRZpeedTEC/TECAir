import {
  syncItineraries, syncReservations, syncAirports,
  getItinerariesOffline, getItineraryByIdOffline,
  getReservationsOffline, searchAirportsOffline,
  searchItinerariesOffline,
} from './sync.js';

const PATTERNS = {
  itinerariesAll:     /\/api\/itineraries\/public\/with-promotions/,
  itineraryById:      /\/api\/itineraries\/(\d+)$/,
  reservationsByUser: /\/api\/reservations\/user\/(.+)/,
  airportSearch:      /\/api\/airports\/search/,
  itinerarySearch:    /\/api\/itineraries\/search(\?|$)/,
};

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function getURL(input) {
  if (typeof input === 'string') return input;
  return input?.url ?? String(input);
}

function getMethod(input, init) {
  return (init?.method ?? (typeof input === 'object' ? input?.method : null) ?? 'GET').toUpperCase();
}

function parseSearchParams(url) {
  try { return new URL(url).searchParams; } catch { return new URLSearchParams(); }
}

// Llama a fetch con un timeout máximo. Si el servidor no responde en `ms`
// milisegundos (red lenta, servidor apagado, IP inalcanzable) aborta y
// devuelve null para que el interceptor use el caché SQLite.
function fetchWithTimeout(originalFetch, input, init, ms = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return originalFetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timer))
    .catch(() => null);
}

// Sincronización proactiva al arrancar: cuando la app sube con conexión,
// pobla SQLite aunque el usuario nunca llegue a esas pantallas.
// Se activa una sola vez al recibir el evento 'tecair:ready' (disparado en App.jsx).
export function scheduleStartupSync(originalFetch) {
  const doSync = async () => {
    if (!navigator.onLine) return;
    const base = window.__TECAIR_API_BASE;
    if (!base) return;
    try {
      // Itinerarios con promociones
      const itRes = await fetchWithTimeout(
        originalFetch,
        `${base}/itineraries/public/with-promotions`,
        {},
        10000,
      );
      if (itRes?.ok) itRes.json().then(syncItineraries).catch(() => {});

      // Aeropuertos más comunes (letra vacía devuelve todos o los populares)
      const apRes = await fetchWithTimeout(
        originalFetch,
        `${base}/airports/search?term=`,
        {},
        10000,
      );
      if (apRes?.ok) apRes.json().then(syncAirports).catch(() => {});
    } catch {
      // Silencioso — es solo un precalentamiento del caché
    }
  };

  // Si App.jsx ya disparó el evento antes de que initDB() terminara,
  // __TECAIR_API_BASE ya está seteado → sincroniza ahora directamente.
  // Si no, espera el evento.
  if (window.__TECAIR_API_BASE) {
    doSync();
  } else {
    window.addEventListener('tecair:ready', doSync, { once: true });
  }
}

// Sincronización de reservas tras login: guarda en SQLite las reservas del
// usuario y los itinerarios que las acompañan, para que "Mis Viajes" funcione
// sin conexión aunque el usuario nunca haya visitado esa pantalla online.
export function scheduleUserSync(email, originalFetch) {
  const doSync = async () => {
    if (!navigator.onLine) return;
    const base = window.__TECAIR_API_BASE;
    if (!base || !email) return;
    try {
      const resRes = await fetchWithTimeout(
        originalFetch,
        `${base}/reservations/user/${encodeURIComponent(email)}`,
        {},
        10000,
      );
      if (!resRes?.ok) return;
      const reservations = await resRes.json();
      await syncReservations(reservations);

      // Cachea también los itinerarios referenciados por esas reservas
      // (por si no están en el caché general de itinerarios públicos)
      const ids = [
        ...new Set(
          reservations
            .map((r) => r.itineraryId ?? r.ItineraryId)
            .filter(Boolean)
        ),
      ];
      for (const id of ids) {
        const itRes = await fetchWithTimeout(
          originalFetch,
          `${base}/itineraries/${id}`,
          {},
          10000,
        );
        if (itRes?.ok) itRes.json().then((d) => syncItineraries([d])).catch(() => {});
      }
    } catch {
      // Silencioso — es solo un precalentamiento del caché
    }
  };
  doSync();
}

export function installFetchInterceptor() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const url      = getURL(input);
    const method   = getMethod(input, init);
    const isOnline = navigator.onLine;

    // Métodos que mutan (POST, PUT, PATCH, DELETE): no tienen caché offline,
    // pero necesitan fallar rápido con un mensaje claro en vez de colgarse.
    if (method !== 'GET') {
      if (!isOnline) throw new TypeError('Sin conexión a internet');
      const res = await fetchWithTimeout(originalFetch, input, init);
      if (res === null) throw new TypeError('No se pudo conectar al servidor');
      return res;
    }

    // GET /api/airports/search?term=...
    // Sincroniza a SQLite cuando online; sirve de SQLite cuando offline.
    // Si SQLite está vacío, rechaza para que airportService.js use airports.js local.
    if (PATTERNS.airportSearch.test(url)) {
      const term = parseSearchParams(url).get('term') ?? '';
      if (!isOnline) {
        const cached = await searchAirportsOffline(term);
        if (cached && cached.length > 0) return jsonResponse(cached);
        return Promise.reject(new TypeError('Sin conexión'));
      }
      const res = await fetchWithTimeout(originalFetch, input, init);
      if (res?.ok) {
        res.clone().json().then(syncAirports).catch(() => {});
        return res;
      }
      const cached = await searchAirportsOffline(term);
      if (cached && cached.length > 0) return jsonResponse(cached);
      return res ?? Promise.reject(new TypeError('Sin conexión'));
    }

    // GET /api/itineraries/public/with-promotions
    if (PATTERNS.itinerariesAll.test(url)) {
      if (!isOnline) {
        const cached = await getItinerariesOffline();
        return cached ? jsonResponse(cached) : Promise.reject(new Error('Sin conexión'));
      }
      const res = await fetchWithTimeout(originalFetch, input, init);
      if (res?.ok) {
        res.clone().json().then(syncItineraries).catch(() => {});
        return res;
      }
      const cached = await getItinerariesOffline();
      return cached ? jsonResponse(cached) : (res ?? Promise.reject(new Error('Sin conexión')));
    }

    // GET /api/itineraries/search?departureCode=...&arrivalCode=...
    // Sirve de SQLite cuando offline; cuando online pasa directo a la API.
    if (PATTERNS.itinerarySearch.test(url)) {
      const params  = parseSearchParams(url);
      const from    = params.get('departureCode') ?? '';
      const to      = params.get('arrivalCode')   ?? '';
      const dateStr = params.get('departureDate') ?? '';
      if (!isOnline) {
        const cached = await searchItinerariesOffline(from, to, dateStr);
        return cached !== null ? jsonResponse(cached) : Promise.reject(new Error('Sin conexión'));
      }
      const res = await fetchWithTimeout(originalFetch, input, init);
      if (res?.ok) {
        res.clone().json().then(syncItineraries).catch(() => {});
        return res;
      }
      const cached = await searchItinerariesOffline(from, to, dateStr);
      return cached !== null
        ? jsonResponse(cached)
        : (res ?? Promise.reject(new Error('Sin conexión')));
    }

    // GET /api/itineraries/{id}
    const itMatch = url.match(PATTERNS.itineraryById);
    if (itMatch) {
      const id = parseInt(itMatch[1]);
      if (!isOnline) {
        const cached = await getItineraryByIdOffline(id);
        return cached ? jsonResponse(cached) : Promise.reject(new Error('Sin conexión'));
      }
      const res = await fetchWithTimeout(originalFetch, input, init);
      if (res?.ok) {
        res.clone().json().then(d => syncItineraries([d])).catch(() => {});
        return res;
      }
      const cached = await getItineraryByIdOffline(id);
      return cached ? jsonResponse(cached) : (res ?? Promise.reject(new Error('Sin conexión')));
    }

    // GET /api/reservations/user/{email}
    const resMatch = url.match(PATTERNS.reservationsByUser);
    if (resMatch) {
      const email = decodeURIComponent(resMatch[1]);
      if (!isOnline) {
        const cached = await getReservationsOffline(email);
        return cached ? jsonResponse(cached) : Promise.reject(new Error('Sin conexión'));
      }
      const res = await fetchWithTimeout(originalFetch, input, init);
      if (res?.ok) {
        res.clone().json().then(syncReservations).catch(() => {});
        return res;
      }
      const cached = await getReservationsOffline(email);
      return cached ? jsonResponse(cached) : (res ?? Promise.reject(new Error('Sin conexión')));
    }

    return originalFetch(input, init);
  };
}
