import { useState, useEffect } from 'react';
import Nav                   from '../../components/Nav.jsx';
import { searchItineraries } from '../../services/itineraryService.js';
import { fmtCRC, fmtDateShort } from '../../utils/format.js';

// Pantalla de resultados: consulta la API y muestra los itinerarios disponibles
export default function ResultsPage({ state, setState, goBack, goToPax, goToMisViajes, currentUser, onOpenAuth, onLogout, onStudentProgram }) {
  const [itineraries, setItineraries] = useState([]);
  const [isLoading,   setIsLoading]   = useState(false);
  const [error,       setError]       = useState(null);

  const [filter, setFilter] = useState('all');    // all | direct | with_stops
  const [sortBy, setSortBy] = useState('price');  // price | duration

  // El backend aplica filtros y ordenamiento para no duplicar reglas en frontend.
  useEffect(() => {
    if (!state.from?.code || !state.to?.code) return;

    setIsLoading(true);
    setError(null);
    setItineraries([]);

    searchItineraries(state.from.code, state.to.code, {
      departureDate: state.depart,
      stops: filter,
      sortBy,
    })
      .then(setItineraries)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [state.from?.code, state.to?.code, state.depart, filter, sortBy]);

  const list = itineraries;

  const totalPax = state.pax.adults;

  // Guarda el itinerario elegido (con la promoción si aplica) y avanza al
  // formulario de pasajeros. Pasamos displayPrice como `price` para que las
  // pantallas siguientes muestren el monto correcto.
  const select = (f) => {
    const chosen = {
      ...f,
      price:           f.displayPrice,
      basePrice:       f.basePrice ?? f.price,
      activePromotion: f.activePromotion ?? null,
    };
    setState((s) => ({ ...s, selectedFlight: chosen }));
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
                {fmtDateShort(state.depart)}
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
          <div className="col-12 col-lg-3">
            <div className="bg-white p-3 rounded-3 border" style={{ borderColor: 'var(--line)' }}>
              <h6 className="serif mb-3">Filtrar</h6>
              <div className="mb-3">
                <div className="small text-muted mb-2">Escalas</div>
                {[
                  { v: 'all',    l: 'Todos los vuelos' },
                  { v: 'direct', l: 'Solo directos'    },
                  { v: 'with_stops',  l: 'Con escalas'      },
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
          <div className="col-12 col-lg-9">
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
                  <div className={'flight-card' + (f.activePromotion ? ' flight-card-promo' : '')} key={f.id}>
                    <div className="row align-items-center g-3">
                      {/* Información de horarios y ruta */}
                      <div className="col-12 col-md-8">
                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                          <span className="badge bg-burgundy-soft text-burgundy">{f.id}</span>
                          {f.tag && (
                            <span className="small fw-semibold" style={{ color: 'var(--green)' }}>
                              ● {f.tag}
                            </span>
                          )}
                          {f.activePromotion && (
                            <span className="badge flight-promo-badge" title="Vuelo en promoción">
                              <i className="bi bi-tag-fill me-1"></i>
                              {f.activePromotion.discountPercent}% OFF
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
                      <div className="col-12 col-md-4 text-md-end">
                        <div className="text-muted small">
                          {f.activePromotion ? 'Precio promocional' : 'Económica desde'}
                        </div>
                        <div className="serif" style={{ fontSize: '1.6rem', color: 'var(--burgundy)' }}>
                          {fmtCRC(f.displayPrice)}
                        </div>
                        {f.activePromotion && f.basePrice > f.displayPrice && (
                          <div className="flight-price-strike">{fmtCRC(f.basePrice)}</div>
                        )}
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

