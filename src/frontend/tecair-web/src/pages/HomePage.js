import { useState } from 'react';
import Nav          from '../components/Nav.js';
import AirportField from '../components/AirportField.js';
import DateField    from '../components/DateField.js';
import PaxField     from '../components/PaxField.js';
import PROMOS       from '../data/promos.js';
import { fmtCRC }   from '../utils/format.js';

// Pantalla de inicio: hero, buscador de vuelos flotante, tarjetas de ofertas y características
export default function HomePage({ state, setState, goToResults, goToMisViajes }) {
  const [tab, setTab] = useState('rt'); // rt = ida y vuelta | ow = solo ida | mc = multi-ciudad

  // Intercambia origen y destino
  const swap = () => setState((s) => ({ ...s, from: s.to, to: s.from }));

  // El botón de búsqueda se activa solo cuando los campos obligatorios están completos
  const canSearch = state.from && state.to && state.depart && (tab === 'ow' || state.ret);

  return (
    <>
      <Nav
        onLogoClick={() => {}}
        onLogin={() => alert('Login (próximamente)')}
        onMisViajes={goToMisViajes}
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
            <h1 className="serif">El cielo es nuestro<br />punto de partida.</h1>
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
          {/* Pestañas: tipo de viaje */}
          <div className="search-tabs">
            <div className={'search-tab ' + (tab === 'rt' ? 'active' : '')} onClick={() => setTab('rt')}>
              <i className="bi bi-arrow-left-right"></i> Ida y vuelta
            </div>
            <div className={'search-tab ' + (tab === 'ow' ? 'active' : '')} onClick={() => setTab('ow')}>
              <i className="bi bi-arrow-right"></i> Solo ida
            </div>
            <div className={'search-tab ' + (tab === 'mc' ? 'active' : '')} onClick={() => setTab('mc')}>
              <i className="bi bi-geo-alt"></i> Multi-ciudad
            </div>
          </div>

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
            {/* Fecha de regreso solo se muestra en modo "ida y vuelta" */}
            {tab === 'rt' && (
              <div className="col-6 col-lg-2">
                <DateField
                  label="Regreso"
                  value={state.ret}
                  onChange={(d) => setState((s) => ({ ...s, ret: d }))}
                  min={state.depart || new Date()}
                />
              </div>
            )}
            <div className={'col-12 ' + (tab === 'rt' ? 'col-lg-2' : 'col-lg-4')}>
              <PaxField
                value={state.pax}
                onChange={(v) => setState((s) => ({ ...s, pax: v }))}
              />
            </div>
          </div>

          {/* Pie de la tarjeta: garantía y botón de búsqueda */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
            <div className="text-muted small">
              <i className="bi bi-shield-check text-burgundy"></i> Cambios sin costo hasta 24h antes
            </div>
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
              <p className="text-muted mb-0">Tarifas especiales desde San José</p>
            </div>
            <a href="#" className="text-burgundy text-decoration-none d-none d-md-inline">
              Ver todas <i className="bi bi-arrow-right"></i>
            </a>
          </div>
          <div className="row g-3">
            {PROMOS.map((p) => (
              <div className="col-12 col-sm-6 col-lg-4" key={p.code}>
                <div className="promo-card">
                  {/* Fondo degradado como placeholder de imagen */}
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
        </section>

        {/* ─── Tira de características ─── */}
        <section className="mt-5 pt-4 border-top">
          <div className="row g-4 text-center">
            {[
              { ic: 'shield-check', t: 'Cambios flexibles', s: 'Modifica tu vuelo sin costo hasta 24h antes.' },
              { ic: 'luggage',      t: 'Equipaje incluido',  s: '7 kg de mano + 1 personal en todas las tarifas.' },
              { ic: 'headset',      t: 'Soporte 24/7',       s: 'Habla con un humano cuando lo necesites.' },
            ].map((f, i) => (
              <div className="col-md-4" key={i}>
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
    </>
  );
}
