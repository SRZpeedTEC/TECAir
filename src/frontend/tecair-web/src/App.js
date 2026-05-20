import { useState, useEffect } from 'react';
import HomePage from './pages/HomePage.js';
import ResultsPage from './pages/reservations/ResultsPage.js';
import PaxPage from './pages/reservations/PaxPage.js';
import ConfirmPage from './pages/reservations/ConfirmPage.js';
import MisViajesPage from './pages/reservations/MisViajesPage.js';
import StudentProgramPage from './pages/StudentProgramPage.js';
import AuthModal from './components/AuthModal.js';

const INITIAL_STATE = {
  from: null,
  to: null,
  depart: null,
  pax: { adults: 1 },
  selectedFlight: null,
  passengers:     [],
};

const SESSION_KEY = 'tecair_user';

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [page,        setPage]        = useState('home');
  const [state,       setState]       = useState(INITIAL_STATE);
  const [currentUser, setCurrentUser] = useState(loadStoredUser);
  const [showAuth,    setShowAuth]    = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  // Sincroniza el almacenamiento con cada cambio de sesion para que la cuenta
  // sobreviva a recargas y al cierre del browser.
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  const openAuth     = ()     => setShowAuth(true);
  const closeAuth    = ()     => setShowAuth(false);
  const handleLogin  = (user) => { setCurrentUser(user); setShowAuth(false); };
  const handleLogout = ()     => { setCurrentUser(null); setPage('home'); };

  const goToMisViajes      = () => setPage('misviajes');
  const goToStudentProgram = () => setPage('student');

  // Props comunes que recibe cada página para pasarlos a Nav
  const authProps = {
    currentUser,
    onOpenAuth:      openAuth,
    onLogout:        handleLogout,
    onStudentProgram: goToStudentProgram,
  };

  return (
    <div data-screen={`airtec-${page}`}>
      {page === 'home'    && <HomePage      {...authProps} state={state} setState={setState} goToResults={() => setPage('results')} goToMisViajes={goToMisViajes} />}
      {page === 'results' && <ResultsPage   {...authProps} state={state} setState={setState} goBack={() => setPage('home')}    goToPax={() => setPage('pax')}         goToMisViajes={goToMisViajes} />}
      {page === 'pax'     && <PaxPage       {...authProps} state={state} setState={setState} goBack={() => setPage('results')} goToConfirm={() => setPage('confirm')} goToMisViajes={goToMisViajes} />}
      {page === 'confirm' && <ConfirmPage   {...authProps} state={state} goHome={() => setPage('home')} goToMisViajes={goToMisViajes} />}
      {page === 'misviajes' && <MisViajesPage {...authProps} state={state} goHome={() => setPage('home')} goToMisViajes={goToMisViajes} />}
      {page === 'student' && <StudentProgramPage {...authProps} goHome={() => setPage('home')} goToMisViajes={goToMisViajes} onUserUpdate={setCurrentUser} />}

      <AuthModal show={showAuth} onClose={closeAuth} onSuccess={handleLogin} />
    </div>
  );
}
