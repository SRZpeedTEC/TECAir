import {
  syncItineraries, syncReservations, syncAirports,
  getItinerariesOffline, getItineraryByIdOffline,
  searchAirportsOffline, getReservationsOffline,
} from './sync.js';

const PATTERNS = {
  itinerariesAll:     /\/api\/itineraries\/public\/with-promotions/,
  itineraryById:      /\/api\/itineraries\/(\d+)$/,
  airportsSearch:     /\/api\/airports\/search/,
  reservationsByUser: /\/api\/reservations\/user\/(.+)/,
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

export function installFetchInterceptor() {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input, init) {
    const url    = getURL(input);
    const method = getMethod(input, init);

    if (method !== 'GET') return originalFetch(input, init);

    const isOnline = navigator.onLine;

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

    // GET /api/airports/search?term=...
    if (PATTERNS.airportsSearch.test(url)) {
      const term = new URL(url, 'http://localhost').searchParams.get('term') ?? '';
      if (!isOnline) {
        const cached = await searchAirportsOffline(term);
        return cached ? jsonResponse(cached) : originalFetch(input, init);
      }
      const res = await originalFetch(input, init).catch(() => null);
      if (res?.ok) {
        res.clone().json().then(syncAirports).catch(() => {});
        return res;
      }
      const cached = await searchAirportsOffline(term);
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
