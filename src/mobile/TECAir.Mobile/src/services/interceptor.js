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

export function installFetchInterceptor() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const url    = getURL(input);
    const method = getMethod(input, init);

    if (method !== 'GET') return originalFetch(input, init);

    const isOnline = navigator.onLine;

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
      const res = await originalFetch(input, init).catch(() => null);
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
        return cached ? jsonResponse(cached) : originalFetch(input, init);
      }
      const res = await originalFetch(input, init).catch(() => null);
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
        return cached !== null ? jsonResponse(cached) : originalFetch(input, init);
      }
      const res = await originalFetch(input, init).catch(() => null);
      if (res?.ok) return res;
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
        return cached ? jsonResponse(cached) : originalFetch(input, init);
      }
      const res = await originalFetch(input, init).catch(() => null);
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
        return cached ? jsonResponse(cached) : originalFetch(input, init);
      }
      const res = await originalFetch(input, init).catch(() => null);
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
