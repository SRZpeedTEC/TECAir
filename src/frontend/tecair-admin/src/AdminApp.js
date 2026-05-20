import { useState } from 'react';

import AdminLayout from './components/AdminLayout.js';

import GestionUsuariosPage from './pages/GestionUsuariosPage.js';
import ReservacionVuelosPage from './pages/ReservacionVuelosPage.js';
import ChequeoPasajerosPage from './pages/ChequeoPasajerosPage.js';
import GestionVuelosPage from './pages/GestionVuelosPage.js';
import GestionItinerariosPage from './pages/GestionItinerariosPage.js';
import GestionPromocionesPage from './pages/GestionPromocionesPage.js';
import AperturaVuelosPage from './pages/AperturaVuelosPage.js';
import CierreVuelosPage from './pages/CierreVuelosPage.js';

// Mapa de configuración de cada sección: título, ícono y componente de página.
// Agregar aquí una nueva entrada es suficiente para extender la navegación.
const SECTIONS = {
  'usuarios': { title: 'Gestión de Usuarios', icon: 'bi-people', Page: GestionUsuariosPage },
  'reservacion': { title: 'Búsqueda y Reservación de Vuelos', icon: 'bi-calendar-check', Page: ReservacionVuelosPage },
  'chequeo': { title: 'Chequeo de Pasajeros', icon: 'bi-person-check', Page: ChequeoPasajerosPage },
  'gestion-vuelos': { title: 'Gestión de Vuelos', icon: 'bi-airplane', Page: GestionVuelosPage },
  'itinerarios': { title: 'Gestión de Itinerarios', icon: 'bi-map', Page: GestionItinerariosPage },
  'promociones': { title: 'Gestión de Promociones', icon: 'bi-tag', Page: GestionPromocionesPage },
  'apertura': { title: 'Apertura de Vuelos', icon: 'bi-unlock', Page: AperturaVuelosPage },
  'cierre': { title: 'Cierre de Vuelos', icon: 'bi-lock', Page: CierreVuelosPage },
};

export default function AdminApp() {
  const [activePage, setActivePage] = useState('usuarios');

  const section = SECTIONS[activePage];

  return (
    <AdminLayout
      activePage={activePage}
      onNavigate={setActivePage}
      sectionIcon={section.icon}
      sectionTitle={section.title}
    >
      <section.Page />
    </AdminLayout>
  );
}
