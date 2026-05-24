import { useState, useEffect } from 'react';
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

export default function App() {
  const [page, setPage] = useState('home');
  const [state, setState] = useState(INITIAL_STATE);
  const [currentUser, setCurrentUser] = useState(null);
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
