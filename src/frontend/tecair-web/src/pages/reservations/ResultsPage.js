import { useState, useEffect } from 'react';
import Nav                   from '../../components/Nav.js';
import { searchItineraries } from '../../services/itineraryService.js';
import { fmtCRC, fmtDateShort } from '../../utils/format.js';

// Pantalla de resultados: consulta la API y muestra los itinerarios disponibles
export default function ResultsPage({ state, setState, goBack, goToPax, goToMisViajes, currentUser, onOpenAuth, onLogout, onStudentProgram }) {
  const [itineraries, setItineraries] = useState([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState(null);

  const [filter, setFilter] = useState('all');    // all | direct | stops
  const [sortBy, setSortBy] = useState('price');  // price | duration

  // Llama a la API cada vez que cambia origen o destino
  useEffect(() => {
    if (!state.from?.code || !state.to?.code) return;

    setIsLoading(true);
    setError(null);
    setItineraries([]);

    searchItineraries(state.from.code, state.to.code)
      .then(setItineraries)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [state.from?.code, state.to?.code]);

  // Aplica filtro de escalas
  let list = itineraries.filter((f) =>
    filter === 'all'    ? true :
    filter === 'direct' ? f.stops === 0 :
                          f.stops > 0
  );

  // Ordena por precio o duración (la duración se guarda como "Xh YYm", ordena por precio calculado)
  list = [...list].sort((a, b) =>
    sortBy === 'price' ? a.price - b.price
                       : parseDurationMs(a.duration) - parseDurationMs(b.duration)
  );

  const totalPax = state.pax.adults;

  // Guarda el itinerario elegido y avanza al formulario de pasajeros
  const select = (f) => {
    setState((s) => ({ ...s, selectedFlight: f }));
    goToPax();
  };

  return (
    <>
      <Nav onLogoClick={goBack} onOpenAuth={onOpenAuth} onLogout={onLogout} onStudentProgram={onStudentProgram} onMisViajes={goToMisViajes} currentUser={currentUser} />

      {/* Barra de resumen de búsqueda */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--line)' }}>
        <div className="container py-3 d-flex flex-wrap gap-3 align-items-center justify-content-between">
          <div className="d-flex flex-wrap gap-3 align-items-center">
            <button className="btn btn-link text-burgundy p-0" onClick={goBack}>
              <i className="bi bi-arrow-left"></i>
            </button>
            <div>
              <div className="fw-semibold">
                {state.from?.city} <i className="bi bi-arrow-right mx-1 text-burgundy"></i> {state.to?.city}
              </div>
              <div className="small text-muted">
                {fmtDateShort(state.depart)}{state.ret && ` — ${fmtDateShort(state.ret)}`}
                {' · '}{totalPax} {totalPax === 1 ? 'pasajero' : 'pasajeros'} · Económica
              </div>
            </div>
          </div>
          <button className="btn btn-burgundy-outline btn-sm" onClick={goBack}>
            Modificar búsqueda
          </button>
        </div>
      </div>

      <div className="container py-4">
        <div className="row g-4">
          {/* ─── Panel de filtros ─── */}
          <div className="col-lg-3">
            <div className="bg-white p-3 rounded-3 border" style={{ borderColor: 'var(--line)' }}>
              <h6 className="serif mb-3">Filtrar</h6>
              <div className="mb-3">
                <div className="small text-muted mb-2">Escalas</div>
                {[
                  { v: 'all',    l: 'Todos los vuelos' },
                  { v: 'direct', l: 'Solo directos'    },
                  { v: 'stops',  l: 'Con escalas'      },
                ].map((o) => (
                  <div className="form-check" key={o.v}>
                    <input
                      className="form-check-input" type="radio"
                      id={'f' + o.v} checked={filter === o.v}
                      onChange={() => setFilter(o.v)}
                    />
                    <label className="form-check-label" htmlFor={'f' + o.v}>{o.l}</label>
                  </div>
                ))}
              </div>
              <div>
                <div className="small text-muted mb-2">Ordenar por</div>
                {[
                  { v: 'price',    l: 'Menor precio'   },
                  { v: 'duration', l: 'Menor duración' },
                ].map((o) => (
                  <div className="form-check" key={o.v}>
                    <input
                      className="form-check-input" type="radio"
                      id={'s' + o.v} checked={sortBy === o.v}
                      onChange={() => setSortBy(o.v)}
                    />
                    <label className="form-check-label" htmlFor={'s' + o.v}>{o.l}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Lista de itinerarios ─── */}
          <div className="col-lg-9">
            <div className="d-flex justify-content-between align-items-end mb-3">
              <h2 className="serif mb-0" style={{ fontSize: '1.6rem' }}>Selecciona tu vuelo de salida</h2>
              {!isLoading && !error && (
                <div className="text-muted small">{list.length} resultados</div>
              )}
            </div>

            {/* Estado: cargando */}
            {isLoading && (
              <div className="text-center text-muted py-5">
                <span className="spinner-border spinner-border-sm me-2 text-burgundy"></span>
                Buscando vuelos disponibles...
              </div>
            )}

            {/* Estado: error de API */}
            {error && (
              <div className="alert" style={{ background: '#fde8ee', color: '#9b2335', border: 'none', borderRadius: 12 }}>
                <i className="bi bi-exclamation-triangle me-2"></i>
                No se pudieron cargar los vuelos: {error}
              </div>
            )}

            {/* Lista de resultados */}
            {!isLoading && !error && (
              <div className="d-flex flex-column gap-3">
                {list.map((f) => (
                  <div className="flight-card" key={f.id}>
                    <div className="row align-items-center g-3">
                      {/* Información de horarios y ruta */}
                      <div className="col-md-8">
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="badge bg-burgundy-soft text-burgundy">{f.id}</span>
                          {f.tag && (
                            <span className="small fw-semibold" style={{ color: 'var(--green)' }}>
                              ● {f.tag}
                            </span>
                          )}
                        </div>
                        <div className="row align-items-center">
                          {/* Hora de salida */}
                          <div className="col-3 text-center">
                            <div className="fs-4 fw-semibold">{f.depart}</div>
                            <div className="small text-muted">{state.from?.code}</div>
                          </div>
                          {/* Línea de ruta */}
                          <div className="col-6">
                            <div className="text-center small text-muted">
                              {f.duration} · {f.stops === 0 ? 'Directo' : `${f.stops} escala${f.stops > 1 ? 's' : ''}`}
                            </div>
                            <div className="route-line">
                              <span className="plane-icon" style={{ left: '50%' }}>
                                <i className="bi bi-airplane-fill" style={{ fontSize: '0.85rem' }}></i>
                              </span>
                              {f.stops >= 1 && <span className="stop" style={{ left: '30%' }}></span>}
                              {f.stops >= 2 && <span className="stop" style={{ left: '70%' }}></span>}
                            </div>
                          </div>
                          {/* Hora de llegada */}
                          <div className="col-3 text-center">
                            <div className="fs-4 fw-semibold">{f.arrive}</div>
                            <div className="small text-muted">{state.to?.code}</div>
                          </div>
                        </div>
                      </div>
                      {/* Precio y selección */}
                      <div className="col-md-4 text-md-end">
                        <div className="text-muted small">Económica desde</div>
                        <div className="serif" style={{ fontSize: '1.6rem', color: 'var(--burgundy)' }}>
                          {fmtCRC(f.price)}
                        </div>
                        <div className="text-muted small">por pasajero</div>
                        <button className="btn btn-burgundy mt-2" onClick={() => select(f)}>
                          Seleccionar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Ningún resultado tras aplicar filtros */}
                {list.length === 0 && itineraries.length > 0 && (
                  <div className="text-center text-muted py-5">
                    No hay vuelos que coincidan con los filtros.
                  </div>
                )}

                {/* La API respondió vacío */}
                {itineraries.length === 0 && (
                  <div className="text-center text-muted py-5">
                    No se encontraron itinerarios disponibles para esta ruta.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// Convierte "5h 30m" a milisegundos para ordenar por duración
function parseDurationMs(duration) {
  const [h, m] = duration.split('h ').map((s) => parseInt(s));
  return (h * 60 + (m || 0)) * 60_000;
}
