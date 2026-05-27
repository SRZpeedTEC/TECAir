import { useState, useEffect } from 'react';
import { BASE_URL } from './services/api.js';
import HomePage from './pages/HomePage.jsx';
import ResultsPage from './pages/reservations/ResultsPage.jsx';
import PaxPage from './pages/reservations/PaxPage.jsx';
import ConfirmPage from './pages/reservations/ConfirmPage.jsx';
import MisViajesPage from './pages/reservations/MisViajesPage.jsx';
import StudentProgramPage from './pages/StudentProgramPage.jsx';
import AuthModal     from './components/AuthModal.jsx';
import ProfileModal  from './components/ProfileModal.jsx';

const INITIAL_STATE = {
  from: null,
  to: null,
  depart: null,
  pax: { adults: 1 },
  selectedFlight: null,
  promotionItineraryId: null,
  passengers: [],
};

const SESSION_KEY = 'tecair_session';

export default function App() {
  const [page, setPage] = useState('home');
  const [state, setState] = useState(INITIAL_STATE);

  // Restaura la sesión desde localStorage al arrancar la app.
  // Así el usuario sigue logueado aunque la app se cierre y reabra sin internet.
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showAuth,    setShowAuth]    = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // Inicializa el primer entry del historial del navegador.
  useEffect(() => {
    window.history.replaceState({ page: 'home' }, '');
  }, []);

  // Escucha el botón atrás del navegador/Android y navega dentro de la SPA
  // sin recargar la página, preservando la sesión del usuario.
  useEffect(() => {
    const onPop = (e) => setPage(e.state?.page ?? 'home');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  // Expone la página actual para que el listener del botón Atrás de Android
  // (index.js mobile) sepa si navegar o salir de la app.
  useEffect(() => { window.__tecairCurrentPage = page; }, [page]);

  // Expone el BASE_URL y notifica al bootstrap móvil que la SPA está lista.
  // scheduleStartupSync() en index.js escucha este evento para poblar SQLite.
  useEffect(() => {
    window.__TECAIR_API_BASE = BASE_URL;
    window.dispatchEvent(new CustomEvent('tecair:ready'));
  }, []);

  // Persiste la sesión en localStorage para sobrevivir reinicios de la app.
  // Al hacer logout (currentUser = null) borra la sesión guardada.
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  // Cuando el usuario se loguea con internet, notifica al bootstrap móvil
  // para que cachee sus reservas en SQLite (Mis Viajes offline).
  // Se guarda también en window.__TECAIR_USER_EMAIL porque el evento puede
  // dispararse antes de que initDB() termine y el listener exista.
  useEffect(() => {
    if (!currentUser?.email) {
      window.__TECAIR_USER_EMAIL = null;
      return;
    }
    window.__TECAIR_USER_EMAIL = currentUser.email;
    window.dispatchEvent(new CustomEvent('tecair:user-login', {
      detail: { email: currentUser.email },
    }));
  }, [currentUser?.email]);

  // Navega a una página registrándola en el historial del navegador.
  // replace=true reemplaza la entrada actual (sin crear punto de retorno).
  const go = (newPage, replace = false) => {
    if (replace) {
      window.history.replaceState({ page: newPage }, '');
    } else {
      window.history.pushState({ page: newPage }, '');
    }
    setPage(newPage);
  };

  const openAuth  = () => setShowAuth(true);
  const closeAuth = () => setShowAuth(false);
  const handleLogin   = (user) => { setCurrentUser(user); setShowAuth(false); };
  const handleLogout  = () => { setCurrentUser(null); go('home', true); };
  const handleProfile = (updated) => {
    // Actualiza la sesión con los datos nuevos devueltos por el backend.
    setCurrentUser((prev) => ({ ...prev, ...updated }));
  };

  const goToMisViajes      = () => go('misviajes');
  const goToStudentProgram = () => go('student');

  const authProps = {
    currentUser,
    onOpenAuth:       openAuth,
    onLogout:         handleLogout,
    onStudentProgram: goToStudentProgram,
    onEditProfile:    () => setShowProfile(true),
  };

  return (
    <div data-screen={`airtec-${page}`}>
      {page === 'home'      && <HomePage          {...authProps} state={state} setState={setState} goToResults={() => go('results')} goToMisViajes={goToMisViajes} />}
      {page === 'results'   && <ResultsPage        {...authProps} state={state} setState={setState} goBack={() => go('home')} goToPax={() => go('pax')} goToMisViajes={goToMisViajes} />}
      {page === 'pax'       && <PaxPage            {...authProps} state={state} setState={setState} goBack={() => go('results')} goToConfirm={() => go('confirm', true)} goToMisViajes={goToMisViajes} />}
      {page === 'confirm'   && <ConfirmPage        {...authProps} state={state} goHome={() => go('home', true)} goToMisViajes={goToMisViajes} />}
      {page === 'misviajes' && <MisViajesPage      {...authProps} state={state} goHome={() => go('home')} goToMisViajes={goToMisViajes} />}
      {page === 'student'   && <StudentProgramPage {...authProps} goHome={() => go('home')} goToMisViajes={goToMisViajes} onUserUpdate={setCurrentUser} />}

      <AuthModal    show={showAuth}    onClose={closeAuth}              onSuccess={handleLogin} />
      <ProfileModal show={showProfile} onClose={() => setShowProfile(false)} currentUser={currentUser} onSuccess={handleProfile} />
    </div>
  );
}
