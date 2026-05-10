import { useState } from 'react';
import ExplorePanel from './ExplorePanel.js';

// Barra de navegación superior: logo, enlaces principales y botón de sesión
export default function Nav({ onLogoClick, onLogin, onMisViajes }) {
  const [exploreOpen, setExploreOpen] = useState(false);

  return (
    <>
      <nav className="navbar-airtec">
        <div className="container d-flex align-items-center justify-content-between gap-3">
          {/* Logo y navegación izquierda */}
          <div className="d-flex align-items-center gap-4">
            <a
              className="brand-mark text-decoration-none"
              href="#"
              onClick={(e) => { e.preventDefault(); onLogoClick(); }}
            >
              Air<span className="accent">TEC</span>
            </a>

            {/* Menú de escritorio — se oculta en móvil */}
            <div className="d-none d-md-flex align-items-center gap-1">
              <span
                className={'nav-link-airtec ' + (exploreOpen ? 'active' : '')}
                onClick={() => setExploreOpen(!exploreOpen)}
              >
                Explorar <i className="bi bi-chevron-down ms-1" style={{ fontSize: '0.75rem' }}></i>
              </span>
              <span className="nav-link-airtec" onClick={onMisViajes} style={{ cursor: 'pointer' }}>
                <i className="bi bi-ticket-perforated me-1"></i>Mis viajes
              </span>
              <span className="nav-link-airtec">
                <i className="bi bi-mortarboard me-1"></i>Student Program
              </span>
            </div>
          </div>

          {/* Botón de sesión derecha */}
          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-burgundy-outline d-flex align-items-center gap-2"
              onClick={onLogin}
            >
              <i className="bi bi-person-circle"></i>
              <span className="d-none d-sm-inline">Iniciar sesión</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Panel desplegable de destinos — se muestra al hacer clic en "Explorar" */}
      {exploreOpen && (
        <ExplorePanel
          onClose={() => setExploreOpen(false)}
        />
      )}
    </>
  );
}
