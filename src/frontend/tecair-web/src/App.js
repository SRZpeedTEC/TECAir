import { useState, useEffect } from 'react';
import HomePage      from './pages/HomePage.js';
import ResultsPage   from './pages/reservations/ResultsPage.js';
import PaxPage       from './pages/reservations/PaxPage.js';
import SeatsPage     from './pages/reservations/SeatsPage.js';
import ConfirmPage   from './pages/reservations/ConfirmPage.js';
import MisViajesPage from './pages/reservations/MisViajesPage.js';
import AIRPORTS      from './data/airports.js';

// Estado inicial del buscador con valores por defecto para la demo
const INITIAL_STATE = {
  from:           AIRPORTS[0],   // San José (SJO)
  to:             AIRPORTS[10],  // Madrid (MAD)
  depart:         new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 semanas desde hoy
  ret:            new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 3 semanas desde hoy
  pax:            { adults: 2 },
  selectedFlight: null,
  passengers:     [],
  seats:          null,
};

// Componente raíz: maneja la navegación entre pantallas mediante estado (sin router externo)
export default function App() {
  const [page, setPage]   = useState('home');
  const [state, setState] = useState(INITIAL_STATE);

  // Vuelve al tope de la página cada vez que cambia la pantalla activa
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  const goToMisViajes = () => setPage('misviajes');

  return (
    <div data-screen={`airtec-${page}`}>
      {page === 'home'      && <HomePage       state={state} setState={setState} goToResults={() => setPage('results')}  goToMisViajes={goToMisViajes} />}
      {page === 'results'   && <ResultsPage    state={state} setState={setState} goBack={() => setPage('home')}    goToPax={() => setPage('pax')}        goToMisViajes={goToMisViajes} />}
      {page === 'pax'       && <PaxPage        state={state} setState={setState} goBack={() => setPage('results')} goToSeats={() => setPage('seats')}    goToMisViajes={goToMisViajes} />}
      {page === 'seats'     && <SeatsPage      state={state} setState={setState} goBack={() => setPage('pax')}     goToConfirm={() => setPage('confirm')} goToMisViajes={goToMisViajes} />}
      {page === 'confirm'   && <ConfirmPage    state={state} goHome={() => setPage('home')}                         goToMisViajes={goToMisViajes} />}
      {page === 'misviajes' && <MisViajesPage  state={state} goHome={() => setPage('home')}                         goToMisViajes={goToMisViajes} />}
    </div>
  );
}
