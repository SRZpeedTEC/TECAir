import { useState, useEffect } from 'react';
import HomePage            from './pages/HomePage.js';
import ResultsPage         from './pages/reservations/ResultsPage.js';
import PaxPage             from './pages/reservations/PaxPage.js';
import SeatsPage           from './pages/reservations/SeatsPage.js';
import ConfirmPage         from './pages/reservations/ConfirmPage.js';
import MisViajesPage       from './pages/reservations/MisViajesPage.js';
import StudentProgramPage  from './pages/StudentProgramPage.js';
import AuthModal           from './components/AuthModal.js';
import AIRPORTS            from './data/airports.js';

const INITIAL_STATE = {
  from:           AIRPORTS[0],
  to:             AIRPORTS[10],
  depart:         new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
  ret:            new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
  pax:            { adults: 2 },
  selectedFlight: null,
  passengers:     [],
  seats:          null,
};

export default function App() {
  const [page,        setPage]        = useState('home');
  const [state,       setState]       = useState(INITIAL_STATE);
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth,    setShowAuth]    = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

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
      {page === 'pax'     && <PaxPage       {...authProps} state={state} setState={setState} goBack={() => setPage('results')} goToSeats={() => setPage('seats')}     goToMisViajes={goToMisViajes} />}
      {page === 'seats'   && <SeatsPage     {...authProps} state={state} setState={setState} goBack={() => setPage('pax')}     goToConfirm={() => setPage('confirm')} goToMisViajes={goToMisViajes} />}
      {page === 'confirm' && <ConfirmPage   {...authProps} state={state} goHome={() => setPage('home')} goToMisViajes={goToMisViajes} />}
      {page === 'misviajes' && <MisViajesPage {...authProps} state={state} goHome={() => setPage('home')} goToMisViajes={goToMisViajes} />}
      {page === 'student' && <StudentProgramPage {...authProps} goHome={() => setPage('home')} goToMisViajes={goToMisViajes} onUserUpdate={setCurrentUser} />}

      <AuthModal show={showAuth} onClose={closeAuth} onSuccess={handleLogin} />
    </div>
  );
}
