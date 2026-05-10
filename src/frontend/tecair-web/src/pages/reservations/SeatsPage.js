import { useMemo, useState } from 'react';
import Nav     from '../../components/Nav.js';
import Stepper from '../../components/Stepper.js';
import SeatIcon from '../../components/SeatIcon.js';

// Configuración del avión: 30 filas × 6 asientos (disposición 3-3)
const ROWS    = 30;
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Pantalla de selección de asientos con visualización del fuselaje del avión
export default function SeatsPage({ state, setState, goBack, goToConfirm, goToMisViajes }) {
  const total = state.pax.adults;

  // Genera el conjunto de asientos ocupados de forma determinista según el vuelo
  const occupiedSet = useMemo(() => {
    const s    = new Set();
    const seed = (state.from?.code || 'X').charCodeAt(0);
    for (let r = 1; r <= ROWS; r++) {
      for (let c = 0; c < 6; c++) {
        if ((r * 7 + c * 3 + seed) % 11 < 3) s.add(`${r}${LETTERS[c]}`);
      }
    }
    return s;
  }, [state.from]);

  const [activePax, setActivePax] = useState(0);
  const [seats, setSeats]         = useState(state.seats || Array(total).fill(null));
  const passengers                = state.passengers || [];

  // Asigna el asiento clickeado al pasajero activo y avanza al siguiente sin asiento
  const pickSeat = (id) => {
    if (occupiedSet.has(id)) return;
    if (seats.some((s, i) => s === id && i !== activePax)) return;
    const next = [...seats];
    next[activePax] = id;
    setSeats(next);
    const nextEmpty = next.findIndex((s) => s === null);
    if (nextEmpty !== -1) setActivePax(nextEmpty);
  };

  const allChosen = seats.every((s) => s !== null);

  const confirm = () => {
    setState((s) => ({ ...s, seats }));
    goToConfirm();
  };

  return (
    <>
      <Nav onLogoClick={goBack} onLogin={() => {}} onMisViajes={goToMisViajes} />

      {/* Barra de progreso */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}>
        <div className="container py-3">
          <Stepper active={2} />
        </div>
      </div>

      <div className="container py-4">
        <div className="row g-4">
          {/* ─── Panel izquierdo: selector de pasajero y leyenda ─── */}
          <div className="col-lg-4">
            <h2 className="serif mb-3" style={{ fontSize: '1.8rem' }}>Selecciona tu asiento</h2>
            <p className="text-muted small">
              Elige dónde quieres sentarte para cada pasajero. La selección es opcional pero recomendada.
            </p>

            {/* Lista de pasajeros con su asiento asignado */}
            <div className="bg-white border rounded-3 p-3 mb-3" style={{ borderColor: 'var(--line)' }}>
              <div className="small text-muted mb-2">Estás eligiendo asiento para:</div>
              {Array.from({ length: total }, (_, i) => {
                const p    = passengers[i];
                const name = p ? `${p.firstName} ${p.lastName}`.trim() || `Pasajero ${i + 1}` : `Pasajero ${i + 1}`;
                return (
                  <div
                    key={i}
                    onClick={() => setActivePax(i)}
                    className={'d-flex justify-content-between align-items-center p-2 rounded-2 mb-1 ' + (activePax === i ? 'border border-burgundy bg-burgundy-soft' : '')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div>
                      <div className="fw-semibold small">{name}</div>
                      <div className="small text-muted">Pasajero {i + 1}</div>
                    </div>
                    <div className="text-end">
                      {seats[i]
                        ? <span className="badge bg-burgundy">{seats[i]}</span>
                        : <span className="small text-muted">— sin asignar</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leyenda de colores de asientos */}
            <div className="bg-white border rounded-3 p-3 mb-3" style={{ borderColor: 'var(--line)' }}>
              <div className="small fw-semibold mb-2">Referencia</div>
              <div className="d-flex flex-wrap gap-3 small align-items-center">
                <span className="d-flex align-items-center gap-1"><SeatIcon variant="available"  size={22} /> Disponible</span>
                <span className="d-flex align-items-center gap-1"><SeatIcon variant="selected"   size={22} /> Tu asiento</span>
                <span className="d-flex align-items-center gap-1"><SeatIcon variant="your-other" size={22} /> Otro pax</span>
                <span className="d-flex align-items-center gap-1"><SeatIcon variant="occupied"   size={22} /> Ocupado</span>
              </div>
            </div>

            <button className="btn btn-burgundy w-100" disabled={!allChosen} onClick={confirm}>
              {allChosen
                ? 'Confirmar asientos'
                : `Falta(n) ${seats.filter((s) => !s).length}`
              }
              <i className="bi bi-arrow-right ms-2"></i>
            </button>
            <button className="btn btn-link text-burgundy w-100 mt-2" onClick={goBack}>
              ← Volver a pasajeros
            </button>
          </div>

          {/* ─── Panel derecho: mapa del avión ─── */}
          <div className="col-lg-8">
            <div className="fuselage-wrap">
              <div className="fuselage">
                <div className="text-center small text-muted mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Frente del avión
                </div>

                {/* Etiquetas de columnas (A B C | D E F) */}
                <div className="d-flex justify-content-center align-items-center gap-1 mb-2">
                  <div className="row-label"></div>
                  {LETTERS.slice(0, 3).map((l) => <div key={l} className="seat-label">{l}</div>)}
                  <div className="row-label"></div>
                  {LETTERS.slice(3).map((l) => <div key={l} className="seat-label">{l}</div>)}
                </div>

                {/* Filas de asientos */}
                {Array.from({ length: ROWS }, (_, r) => {
                  const row = r + 1;
                  return (
                    <div key={row}>
                      {/* Indicador de salida de emergencia entre filas 11 y 12 */}
                      {row === 12 && (
                        <div className="d-flex align-items-center my-2" style={{ justifyContent: 'space-between' }}>
                          <span style={{ flex: 1, borderTop: '1px dashed var(--burgundy-line)' }}></span>
                          <span className="px-2" style={{ color: 'var(--burgundy)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.68rem', fontWeight: 600 }}>
                            <i className="bi bi-door-open me-1"></i>Salida emergencia
                          </span>
                          <span style={{ flex: 1, borderTop: '1px dashed var(--burgundy-line)' }}></span>
                        </div>
                      )}
                      <div className="d-flex justify-content-center align-items-center gap-1 mb-1">
                        <div className="row-label">{row}</div>
                        {/* Asientos lado izquierdo A-B-C */}
                        {LETTERS.slice(0, 3).map((l) => {
                          const id     = `${row}${l}`;
                          const isOcc  = occupiedSet.has(id);
                          const myIdx  = seats.indexOf(id);
                          const variant =
                            isOcc    ? 'occupied'   :
                            myIdx === activePax ? 'selected' :
                            myIdx !== -1        ? 'your-other' :
                                                  'available';
                          return (
                            <button
                              key={id}
                              className={'seat-btn' + (isOcc ? ' occupied' : '')}
                              onClick={() => pickSeat(id)}
                              title={id}
                            >
                              <SeatIcon variant={variant} label={myIdx !== -1 ? String(myIdx + 1) : ''} />
                            </button>
                          );
                        })}
                        <div className="row-label">{row}</div>
                        {/* Asientos lado derecho D-E-F */}
                        {LETTERS.slice(3).map((l) => {
                          const id     = `${row}${l}`;
                          const isOcc  = occupiedSet.has(id);
                          const myIdx  = seats.indexOf(id);
                          const variant =
                            isOcc    ? 'occupied'   :
                            myIdx === activePax ? 'selected' :
                            myIdx !== -1        ? 'your-other' :
                                                  'available';
                          return (
                            <button
                              key={id}
                              className={'seat-btn' + (isOcc ? ' occupied' : '')}
                              onClick={() => pickSeat(id)}
                              title={id}
                            >
                              <SeatIcon variant={variant} label={myIdx !== -1 ? String(myIdx + 1) : ''} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                <div className="text-center small text-muted mt-3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Cola del avión
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
