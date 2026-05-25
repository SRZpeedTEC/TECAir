import { useEffect, useState } from 'react';

import AdminLayout from './components/AdminLayout.jsx';

import AdminLoginPage from './pages/AdminLoginPage.jsx';
import GestionUsuariosPage from './pages/GestionUsuariosPage.jsx';
import ReservacionVuelosPage from './pages/ReservacionVuelosPage.jsx';
import ChequeoPasajerosPage from './pages/ChequeoPasajerosPage.jsx';
import GestionVuelosPage from './pages/GestionVuelosPage.jsx';
import GestionItinerariosPage from './pages/GestionItinerariosPage.jsx';
import GestionPromocionesPage from './pages/GestionPromocionesPage.jsx';
import AperturaVuelosPage from './pages/AperturaVuelosPage.jsx';
import CierreVuelosPage from './pages/CierreVuelosPage.jsx';

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
  const [activePage, setActivePage] = useState('usuarios');

  useEffect(() => {
    if (currentAdmin) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentAdmin));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentAdmin]);

  // Sincroniza la seccion activa con el history del navegador para que el
  // boton Atras funcione entre secciones. Solo se activa tras login: el flujo
  // del login no participa del history para evitar volver a el con back.
  useEffect(() => {
    if (!currentAdmin) return;

    // Marcamos la entrada inicial con la seccion actual sin crear historia nueva.
    window.history.replaceState({ adminPage: activePage }, '');

    const onPop = (event) => {
      const page = event.state?.adminPage;
      if (page && Object.prototype.hasOwnProperty.call(SECTIONS, page)) {
        setActivePage(page);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAdmin]);

  // Navegacion controlada: empuja una entrada en el history para que cada
  // cambio de seccion sea reversible con el boton Atras.
  const navigateToPage = (page) => {
    if (page === activePage) return;
    window.history.pushState({ adminPage: page }, '');
    setActivePage(page);
  };

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
      onNavigate={navigateToPage}
      sectionIcon={section.icon}
      sectionTitle={section.title}
      currentAdmin={currentAdmin}
      onLogout={handleLogout}
    >
      <section.Page />
    </AdminLayout>
  );
}
