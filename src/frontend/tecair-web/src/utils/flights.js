import AIRPORTS from '../data/airports.js';

// Genera una lista de vuelos de demostración a partir del origen y destino seleccionados.
// Los datos son deterministas (basados en los códigos IATA) para que la UI sea consistente.
export function generateFlights(from, to) {
  if (!from || !to) return [];

  const seed = (from.code.charCodeAt(0) + to.code.charCodeAt(0)) % 7;
  const basePrice = 180000 + seed * 28000;

  // Aeropuertos hub usados como escala intermedia en vuelos con conexión
  const hubs = AIRPORTS.filter(
    (a) => ['MIA', 'BOG', 'MEX', 'MAD'].includes(a.code)
      && a.code !== from.code
      && a.code !== to.code
  );

  return [
    {
      id: 'AT' + (100 + seed * 7),
      stops: 0,
      depart: '06:30', arrive: '11:45', duration: '5h 15m',
      price: basePrice + 45000,
      tag: 'Más rápido',
    },
    {
      id: 'AT' + (220 + seed * 3),
      stops: 1,
      via: hubs[0]?.code || 'MIA', viaCity: hubs[0]?.city || 'Miami',
      depart: '08:15', arrive: '18:40', duration: '10h 25m', layover: '2h 10m',
      price: basePrice - 12000,
      tag: 'Mejor precio',
    },
    {
      id: 'AT' + (305 + seed * 5),
      stops: 0,
      depart: '13:20', arrive: '18:50', duration: '5h 30m',
      price: basePrice + 22000,
    },
    {
      id: 'AT' + (418 + seed * 2),
      stops: 1,
      via: hubs[1]?.code || 'BOG', viaCity: hubs[1]?.city || 'Bogotá',
      depart: '16:05', arrive: '04:35+1', duration: '12h 30m', layover: '3h 25m',
      price: basePrice - 28000,
    },
    {
      id: 'AT' + (502 + seed),
      stops: 2,
      via: (hubs[0]?.code || 'MIA') + ' · ' + (hubs[1]?.code || 'BOG'),
      viaCity: '2 escalas',
      depart: '21:40', arrive: '16:10+1', duration: '18h 30m', layover: '4h 50m + 2h 15m',
      price: basePrice - 42000,
    },
    {
      id: 'AT' + (610 + seed),
      stops: 0,
      depart: '22:55', arrive: '04:20+1', duration: '5h 25m',
      price: basePrice + 8000,
    },
  ];
}
