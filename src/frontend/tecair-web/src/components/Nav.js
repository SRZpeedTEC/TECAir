import { useState } from 'react';
import ExplorePanel from './ExplorePanel.js';

// Props:
//   currentUser      – objeto UserResponse o null
//   onOpenAuth       – abre el modal de login/registro
//   onLogout         – cierra sesión
//   onStudentProgram – navega a la página del Student Program
//   onMisViajes      – navega a mis viajes
//   onLogoClick      – navega al home
export default function Nav({ onLogoClick, onOpenAuth, onLogout, onStudentProgram, onMisViajes, currentUser }) {
  const [exploreOpen,  setExploreOpen]  = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const firstName = currentUser?.fullName?.split(' ')[0] ?? '';

  return (
    <>
      <nav className="navbar-airtec" style={{ position: 'relative', zIndex: 200 }}>
        <div className="container d-flex align-items-center justify-content-between gap-3">

          {/* Logo + menú izquierdo */}
          <div className="d-flex align-items-center gap-4">
            <a
              className="brand-mark text-decoration-none"
              href="#"
              onClick={(e) => { e.preventDefault(); onLogoClick(); }}
            >
              Air<span className="accent">TEC</span>
            </a>

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
              {/* Student Program: siempre visible; resaltado si el usuario es estudiante */}
              <span
                className={'nav-link-airtec ' + (currentUser?.isStudent ? 'active' : '')}
                onClick={onStudentProgram}
                style={{ cursor: 'pointer' }}
              >
                <i className="bi bi-mortarboard me-1"></i>Student Program
                {currentUser?.isStudent && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: 7, height: 7,
                      background: '#2d7a4f',
                      borderRadius: '50%',
                      marginLeft: 5,
                      verticalAlign: 'middle',
                      marginBottom: 1,
                    }}
                  ></span>
                )}
              </span>
            </div>
          </div>

          {/* Zona derecha: sesión */}
          <div className="d-flex align-items-center gap-2" style={{ position: 'relative' }}>

            {/* ── Sin sesión ── */}
            {!currentUser && (
              <button
                className="btn btn-burgundy-outline d-flex align-items-center gap-2"
                onClick={onOpenAuth}
              >
                <i className="bi bi-person-circle"></i>
                <span className="d-none d-sm-inline">Iniciar sesión</span>
              </button>
            )}

            {/* ── Con sesión ── */}
            {currentUser && (
              <div style={{ position: 'relative' }}>
                <button
                  className="d-flex align-items-center gap-2"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  style={{
                    background: 'var(--burgundy-soft)',
                    border: '1px solid var(--burgundy-line)',
                    borderRadius: '999px',
                    padding: '6px 14px 6px 8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    color: 'var(--burgundy)',
                    fontSize: '0.9rem',
                  }}
                >
                  <span
                    style={{
                      width: 28, height: 28,
                      background: 'var(--burgundy)',
                      borderRadius: '50%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                  <span className="d-none d-sm-inline">{firstName}</span>
                  <i className="bi bi-chevron-down" style={{ fontSize: '0.7rem' }}></i>
                </button>

                {/* Dropdown de usuario */}
                {userMenuOpen && (
                  <>
                    {/* Overlay para cerrar al hacer clic fuera */}
                    <div
                      style={{ position: 'fixed', inset: 0, zIndex: 150 }}
                      onClick={() => setUserMenuOpen(false)}
                    ></div>
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        background: '#fff',
                        border: '1px solid var(--line)',
                        borderRadius: '14px',
                        boxShadow: '0 16px 40px rgba(40,10,25,0.15)',
                        minWidth: '220px',
                        zIndex: 200,
                        overflow: 'hidden',
                      }}
                    >
                      {/* Info del usuario */}
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--line)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--ink)' }}>
                          {currentUser.fullName}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '2px' }}>
                          {currentUser.email}
                        </div>
                        {currentUser.isStudent && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              marginTop: '6px',
                              background: '#f0faf4',
                              border: '1px solid #a8dfc0',
                              borderRadius: '999px',
                              padding: '2px 10px',
                              fontSize: '0.78rem',
                              color: '#2d7a4f',
                              fontWeight: 600,
                            }}
                          >
                            <i className="bi bi-mortarboard-fill"></i> Student
                          </div>
                        )}
                      </div>

                      {/* Acciones */}
                      <div style={{ padding: '6px' }}>
                        <DropdownItem icon="ticket-perforated" onClick={() => { setUserMenuOpen(false); onMisViajes(); }}>
                          Mis viajes
                        </DropdownItem>
                        {currentUser.isStudent && (
                          <DropdownItem icon="mortarboard" onClick={() => { setUserMenuOpen(false); onStudentProgram(); }}>
                            Student Program
                          </DropdownItem>
                        )}
                        <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0' }}></div>
                        <DropdownItem icon="box-arrow-right" onClick={() => { setUserMenuOpen(false); onLogout(); }} danger>
                          Cerrar sesión
                        </DropdownItem>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {exploreOpen && (
        <ExplorePanel onClose={() => setExploreOpen(false)} />
      )}
    </>
  );
}

function DropdownItem({ icon, onClick, danger, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        background: 'none',
        border: 'none',
        padding: '9px 12px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 500,
        color: danger ? '#c0392b' : 'var(--ink)',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = danger ? '#fff1f0' : 'var(--burgundy-soft)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
    >
      <i className={`bi bi-${icon}`} style={{ fontSize: '0.95rem', color: danger ? '#c0392b' : 'var(--burgundy)' }}></i>
      {children}
    </button>
  );
}
