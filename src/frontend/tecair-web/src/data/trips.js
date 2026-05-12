// Viajes de demostración para la sección "Mis viajes"
export const MOCK_TRIPS = [
  {
    id: 'AT-847291',
    status: 'proxim',
    from: { code: 'SJO', city: 'San José' },
    to:   { code: 'MAD', city: 'Madrid'   },
    depart: '10:30', arrive: '06:15+1',
    date: '15 Jun 2026', duration: '9h 45m',
    flight: 'AT204', seat: '14C',
    passengers: [{ firstName: 'Carlos', lastName: 'Mora' }],
    price: 624000,
  },
  {
    id: 'AT-513082',
    status: 'completado',
    from: { code: 'SJO', city: 'San José' },
    to:   { code: 'MIA', city: 'Miami'    },
    depart: '07:00', arrive: '11:30',
    date: '03 Mar 2026', duration: '3h 30m',
    flight: 'AT118', seat: '22A',
    passengers: [
      { firstName: 'Carlos', lastName: 'Mora'   },
      { firstName: 'Ana',    lastName: 'Vargas' },
    ],
    price: 312000,
  },
  {
    id: 'AT-391047',
    status: 'completado',
    from: { code: 'SJO', city: 'San José' },
    to:   { code: 'BOG', city: 'Bogotá'   },
    depart: '14:20', arrive: '17:45',
    date: '11 Ene 2026', duration: '3h 25m',
    flight: 'AT076', seat: '08B',
    passengers: [{ firstName: 'Carlos', lastName: 'Mora' }],
    price: 198000,
  },
];

// Etiquetas visuales para cada estado posible de una reserva
export const STATUS_LABELS = {
  proxim:     { label: 'Próximo',    bg: '#e8f5ee', color: '#2d7a4f', icon: 'bi-clock'       },
  completado: { label: 'Completado', bg: '#ede9e6', color: '#6b6470', icon: 'bi-check-circle' },
  cancelado:  { label: 'Cancelado',  bg: '#fde8ee', color: '#9b2335', icon: 'bi-x-circle'    },
};
