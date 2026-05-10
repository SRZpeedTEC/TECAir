// Lista de aeropuertos disponibles en AirTEC, agrupados por región geográfica
const AIRPORTS = [
  { code: 'SJO', city: 'San José',         country: 'Costa Rica',    region: 'LATAM'  },
  { code: 'LIR', city: 'Liberia',          country: 'Costa Rica',    region: 'LATAM'  },
  { code: 'MEX', city: 'Ciudad de México', country: 'México',        region: 'LATAM'  },
  { code: 'CUN', city: 'Cancún',           country: 'México',        region: 'LATAM'  },
  { code: 'BOG', city: 'Bogotá',           country: 'Colombia',      region: 'LATAM'  },
  { code: 'LIM', city: 'Lima',             country: 'Perú',          region: 'LATAM'  },
  { code: 'SCL', city: 'Santiago',         country: 'Chile',         region: 'LATAM'  },
  { code: 'EZE', city: 'Buenos Aires',     country: 'Argentina',     region: 'LATAM'  },
  { code: 'GRU', city: 'São Paulo',        country: 'Brasil',        region: 'LATAM'  },
  { code: 'MIA', city: 'Miami',            country: 'EE.UU.',        region: 'LATAM'  },
  { code: 'MAD', city: 'Madrid',           country: 'España',        region: 'Europa' },
  { code: 'BCN', city: 'Barcelona',        country: 'España',        region: 'Europa' },
  { code: 'CDG', city: 'París',            country: 'Francia',       region: 'Europa' },
  { code: 'LHR', city: 'Londres',          country: 'Reino Unido',   region: 'Europa' },
  { code: 'FCO', city: 'Roma',             country: 'Italia',        region: 'Europa' },
  { code: 'AMS', city: 'Ámsterdam',        country: 'Países Bajos',  region: 'Europa' },
  { code: 'FRA', city: 'Frankfurt',        country: 'Alemania',      region: 'Europa' },
  { code: 'NRT', city: 'Tokio',            country: 'Japón',         region: 'Asia'   },
  { code: 'ICN', city: 'Seúl',             country: 'Corea del Sur', region: 'Asia'   },
  { code: 'SIN', city: 'Singapur',         country: 'Singapur',      region: 'Asia'   },
  { code: 'BKK', city: 'Bangkok',          country: 'Tailandia',     region: 'Asia'   },
  { code: 'DXB', city: 'Dubái',            country: 'EAU',           region: 'Asia'   },
];

export default AIRPORTS;
