import { useEffect, useState } from 'react';

import AdminLayout from './components/AdminLayout.js';

import AdminLoginPage          from './pages/AdminLoginPage.js';
import GestionUsuariosPage     from './pages/GestionUsuariosPage.js';
import ReservacionVuelosPage   from './pages/ReservacionVuelosPage.js';
import ChequeoPasajerosPage    from './pages/ChequeoPasajerosPage.js';
import GestionVuelosPage       from './pages/GestionVuelosPage.js';
import GestionItinerariosPage  from './pages/GestionItinerariosPage.js';
import GestionPromocionesPage  from './pages/GestionPromocionesPage.js';
import AperturaVuelosPage      from './pages/AperturaVuelosPage.js';
import CierreVuelosPage        from './pages/CierreVuelosPage.js';

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

const SESSION_KEY = 'tecair_admin_user';

// La sesion admin se guarda solo si el rol es ADMIN. Si alguien manipula
// localStorage para inyectar otro rol, se ignora y se vuelve al login.
function loadStoredAdmin() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.role === 'ADMIN' ? user : null;
  } catch {
    return null;
  }
}

export default function AdminApp() {
  const [currentAdmin, setCurrentAdmin] = useState(loadStoredAdmin);
  const [activePage,   setActivePage]   = useState('usuarios');

  // Sincroniza el almacenamiento con cada cambio de sesion.
  useEffect(() => {
    if (currentAdmin) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentAdmin));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentAdmin]);

  const handleLogin = (user) => {
    setCurrentAdmin(user);
    setActivePage('usuarios');
  };

  const handleLogout = () => {
    setCurrentAdmin(null);
  };

  if (!currentAdmin) {
    return <AdminLoginPage onLogin={handleLogin} />;
  }

  const section = SECTIONS[activePage];

  return (
    <AdminLayout
      activePage={activePage}
      onNavigate={setActivePage}
      sectionIcon={section.icon}
      sectionTitle={section.title}
      currentAdmin={currentAdmin}
      onLogout={handleLogout}
    >
      <section.Page />
    </AdminLayout>
  );
}
