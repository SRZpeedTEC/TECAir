import { useState, useEffect } from 'react';
import Nav             from '../components/Nav.js';
import AirportField    from '../components/AirportField.js';
import DateField       from '../components/DateField.js';
import PaxField        from '../components/PaxField.js';
import PromotionModal  from '../components/PromotionModal.js';
import PROMOS          from '../data/promos.js';
import AIRPORTS        from '../data/airports.js';
import { fmtCRC }      from '../utils/format.js';
import { getPromotionsWithItinerary } from '../services/promotionService.js';

// Resuelve un código IATA a un objeto airport completo. Si el código no está
// en la lista local de aeropuertos, devuelve un objeto mínimo con los datos
// que sí tenemos de la promoción.
function resolveAirport(code, fallbackCity) {
  if (!code) return null;
  return AIRPORTS.find((a) => a.code === code)
      ?? { code, city: fallbackCity ?? code, country: '', region: '' };
}


// Paleta de gradientes usada como placeholder cuando la promo del backend no
// tiene imageUrl. Se rota por índice para que cada tarjeta tenga color distinto.
const PROMO_GRADIENTS = [
  { c1: '#7a3b5c', c2: '#3d0f24' },
  { c1: '#5b1936', c2: '#1a0814' },
  { c1: '#8b4a6b', c2: '#4a1230' },
  { c1: '#6b2545', c2: '#2d0a1a' },
  { c1: '#a85777', c2: '#5b1936' },
  { c1: '#7a2347', c2: '#3d0f24' },
];

// Convierte "YYYY-MM-DD" a "dd MMM" en español (ej. "08 jun").
const MESES_ABBR = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function fmtDateRange(start, end) {
  if (!start || !end) return '';
  const fmt = (iso) => {
    const [y, m, d] = String(iso).split('-');
    if (!y || !m || !d) return iso;
    return `${d} ${MESES_ABBR[Number(m) - 1] ?? m}`;
  };
  return `${fmt(start)} — ${fmt(end)}`;
}

// Pantalla de inicio: hero, buscador de vuelos flotante, tarjetas de ofertas y características
export default function HomePage({ state, setState, goToResults, goToMisViajes, currentUser, onOpenAuth, onLogout, onStudentProgram }) {
  // Promociones traídas del backend. Si el endpoint falla o no hay registros
  // mostramos el array estático original como fallback.
  const [promotions,    setPromotions]    = useState(null);
  const [promosLoading, setPromosLoading] = useState(true);
  const [promosError,   setPromosError]   = useState(null);

  // Promo seleccionada para abrir el modal con detalles + "Reservar ahora".
  const [selectedPromo, setSelectedPromo] = useState(null);

  // Click en "Reservar ahora": prellena origen y destino, conserva las fechas
  // y pasajeros que el cliente ya tenía. La promoción aplica a la fecha de
  // compra (hoy), no a la del vuelo, así que no hace falta ajustar fechas.
  const handleReservePromo = (p) => {
    const origin = resolveAirport(p.originCode, p.originCity);
    const dest   = resolveAirport(p.destinationCode, p.destinationCity);
    if (!origin || !dest) return;

    setState((s) => ({ ...s, from: origin, to: dest }));
    setSelectedPromo(null);
    goToResults();
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPromotionsWithItinerary();
        if (!cancelled) setPromotions(data);
      } catch (err) {
        if (!cancelled) setPromosError(err.message);
      } finally {
        if (!cancelled) setPromosLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Intercambia origen y destino
  const swap = () => setState((s) => ({ ...s, from: s.to, to: s.from }));

  // El botón de búsqueda se activa solo cuando los campos obligatorios están completos
  const canSearch = state.from && state.to && state.depart && (state.pax?.adults || 0) >= 1;

  return (
    <>
      <Nav
        onLogoClick={() => {}}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
        onStudentProgram={onStudentProgram}
        onMisViajes={goToMisViajes}
        currentUser={currentUser}
      />

      {/* ─── Hero ─── */}
      <section className="hero">
        <i className="bi bi-airplane plane-deco"></i>
        <div className="container position-relative">
          <div style={{ maxWidth: 600 }}>
            <div
              className="d-inline-block px-3 py-1 mb-3"
              style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 999, fontSize: '0.85rem' }}
            >
              <i className="bi bi-stars me-2"></i>Más de 80 destinos en 4 continentes
            </div>
            <h1 className="serif">
              {currentUser?.fullName
                ? <>Bienvenido,<br />{currentUser.fullName.split(' ')[0]}.</>
                : <>El cielo es nuestro<br />punto de partida.</>}
            </h1>
            <p className="lede mt-3">
              Reserva tu próximo vuelo con AirTEC y descubre tarifas pensadas para
              viajeros que quieren llegar más lejos, con menos.
            </p>
          </div>
        </div>
      </section>

      <div className="container">
        {/* ─── Tarjeta de búsqueda flotante (sobresale sobre el hero) ─── */}
        <div className="search-card">
          {/* Campos del buscador */}
          <div className="row g-2 align-items-stretch">
            <div className="col-12 col-lg-3">
              <AirportField
                label="Origen"
                value={state.from}
                onChange={(v) => setState((s) => ({ ...s, from: v }))}
                exclude={state.to}
              />
            </div>
            <div className="col-12 col-lg-3 position-relative">
              <AirportField
                label="Destino"
                value={state.to}
                onChange={(v) => setState((s) => ({ ...s, to: v }))}
                exclude={state.from}
              />
              {/* Botón de intercambio origen/destino — solo visible en escritorio */}
              <button
                className="swap-btn d-none d-lg-flex"
                onClick={swap}
                style={{ position: 'absolute', left: '-18px', top: '50%', transform: 'translateY(-50%)' }}
              >
                <i className="bi bi-arrow-left-right"></i>
              </button>
            </div>
            <div className="col-6 col-lg-2">
              <DateField
                label="Salida"
                value={state.depart}
                onChange={(d) => setState((s) => ({ ...s, depart: d }))}
                min={new Date()}
              />
            </div>
            <div className="col-12 col-lg-4">
              <PaxField
                value={state.pax}
                onChange={(v) => setState((s) => ({ ...s, pax: v }))}
              />
            </div>
          </div>

          {/* Pie de la tarjeta: botón de búsqueda */}
          <div className="d-flex justify-content-end align-items-center flex-wrap gap-2 mt-3">
            <button
              className="btn btn-burgundy px-4"
              disabled={!canSearch}
              onClick={goToResults}
            >
              <i className="bi bi-search me-2"></i>Buscar vuelos
            </button>
          </div>
        </div>

        {/* ─── Sección de ofertas ─── */}
        <section className="mt-5">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <h2 className="serif mb-1" style={{ fontSize: '2rem' }}>Ofertas que vuelan rápido</h2>
              <p className="text-muted mb-0">
                {promotions && promotions.length > 0
                  ? 'Promociones activas en este momento'
                  : 'Tarifas especiales desde San José'}
              </p>
            </div>
            <a href="#" className="text-burgundy text-decoration-none d-none d-md-inline">
              Ver todas <i className="bi bi-arrow-right"></i>
            </a>
          </div>

          {promosLoading && (
            <div className="text-center text-muted py-4">
              <span className="spinner-border spinner-border-sm me-2"></span>
              Cargando promociones…
            </div>
          )}

          {!promosLoading && promotions && promotions.length > 0 && (
            <div className="row g-3">
              {promotions.map((p, idx) => {
                const grad = PROMO_GRADIENTS[idx % PROMO_GRADIENTS.length];
                const city = p.destinationCity || p.destinationCode || p.promotionCode;
                const meta = [p.originCode && p.destinationCode ? `${p.originCode} → ${p.destinationCode}` : null,
                              fmtDateRange(p.startDate, p.endDate)].filter(Boolean).join(' · ');
                const bgStyle = p.imageUrl
                  ? { backgroundImage: `url(${p.imageUrl})` }
                  : { '--c1': grad.c1, '--c2': grad.c2 };
                return (
                  <div className="col-12 col-sm-6 col-lg-4" key={p.promotionCode}>
                    <button
                      type="button"
                      className="promo-card promo-card-button"
                      onClick={() => setSelectedPromo(p)}
                      aria-label={`Ver detalle de la promoción ${p.promotionCode} para ${city}`}
                    >
                      <div
                        className={'ph ' + (p.imageUrl ? 'ph-photo' : 'ph-img')}
                        style={bgStyle}
                      ></div>
                      <div className="overlay"></div>
                      <div className="promo-badge">{p.discountPercent}% OFF</div>
                      <div className="promo-text">
                        <div className="city">{city}</div>
                        <div className="meta">{meta}</div>
                        <div className="price mt-1">
                          Desde <strong>{fmtCRC(p.promoPrice)}</strong>
                          {p.basePrice && p.basePrice > p.promoPrice && (
                            <span className="ms-2 promo-strike">{fmtCRC(p.basePrice)}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fallback: si el backend falla o no hay promociones, mostramos el set estático. */}
          {!promosLoading && (!promotions || promotions.length === 0) && (
            <>
              {promosError && (
                <div className="text-muted small mb-3">
                  <i className="bi bi-info-circle me-1"></i>
                  No pudimos cargar promociones del servidor. Mostrando destinos sugeridos.
                </div>
              )}
              <div className="row g-3">
                {PROMOS.map((p) => (
                  <div className="col-12 col-sm-6 col-lg-4" key={p.code}>
                    <div className="promo-card">
                      <div
                        className="ph ph-img"
                        style={{ '--c1': p.c1, '--c2': p.c2 }}
                      ></div>
                      <div className="overlay"></div>
                      <div className="promo-text">
                        <div className="city">{p.city}</div>
                        <div className="meta">{p.country} · {p.dates}</div>
                        <div className="price mt-1">
                          Económica desde <strong>{fmtCRC(p.price)}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ─── Tira de características ─── */}
        <section className="mt-5 pt-4 border-top">
          <div className="row g-4 text-center">
            {[
              { ic: 'luggage', t: 'Equipaje incluido', s: '7 kg de mano + 1 personal en todas las tarifas.' },
              { ic: 'headset', t: 'Soporte 24/7',     s: 'Habla con un humano cuando lo necesites.' },
            ].map((f, i) => (
              <div className="col-md-6" key={i}>
                <i className={'bi bi-' + f.ic + ' text-burgundy'} style={{ fontSize: '1.8rem' }}></i>
                <h6 className="mt-2 mb-1 serif" style={{ fontSize: '1.1rem' }}>{f.t}</h6>
                <p className="text-muted small mb-0">{f.s}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ─── Footer ─── */}
      <footer className="site-footer mt-5">
        <div className="container d-flex flex-wrap justify-content-between gap-3">
          <div>
            <span className="brand-mark">Air<span className="accent">TEC</span></span>
            <span className="ms-3">© 2026 AirTEC. Proyecto académico.</span>
          </div>
          <div className="d-flex gap-3">
            <span>Términos</span><span>Privacidad</span><span>Contacto</span>
          </div>
        </div>
      </footer>

      <PromotionModal
        promo={selectedPromo}
        onClose={() => setSelectedPromo(null)}
        onReserve={handleReservePromo}
      />
    </>
  );
}
