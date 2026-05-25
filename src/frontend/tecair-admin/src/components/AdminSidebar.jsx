// Barra lateral de navegación de la Vista Aeropuerto.
// Recibe la sección activa y un callback para cambiar de sección.
const NAV_ITEMS = [
  { key: 'usuarios', label: 'Gestión de Usuarios', icon: 'bi-people' },
  { key: 'reservacion', label: 'Búsqueda y Reservación', icon: 'bi-calendar-check' },
  { key: 'chequeo', label: 'Chequeo de Pasajeros', icon: 'bi-person-check' },
  { key: 'gestion-vuelos', label: 'Gestión de Vuelos', icon: 'bi-airplane' },
  { key: 'itinerarios', label: 'Gestión de Itinerarios', icon: 'bi-map' },
  { key: 'promociones', label: 'Gestión de Promociones', icon: 'bi-tag' },
  { key: 'apertura', label: 'Apertura de Vuelos', icon: 'bi-unlock' },
  { key: 'cierre', label: 'Cierre de Vuelos', icon: 'bi-lock' },
];

export default function AdminSidebar({ activePage, onNavigate, currentAdmin, onLogout }) {
  const firstName = currentAdmin?.fullName?.split(' ')[0] ?? '';
  const initial   = firstName.charAt(0).toUpperCase() || 'A';

  return (
    <aside className="admin-sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="admin-sidebar-brand">
        <div className="brand-name">
          Air<span className="accent">TEC</span>
        </div>
        <div className="brand-sub">Vista Aeropuerto</div>
      </div>

      <ul
        className="admin-nav"
        role="navigation"
        aria-label="Menú de administración"
        style={{ flex: 1 }}
      >
        {NAV_ITEMS.map((item) => (
          <li key={item.key} className="admin-nav-item">
            <button
              className={`admin-nav-btn${activePage === item.key ? ' active' : ''}`}
              onClick={() => onNavigate(item.key)}
              aria-current={activePage === item.key ? 'page' : undefined}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              {item.label}
            </button>
          </li>
        ))}
      </ul>

      {currentAdmin && (
        <div
          style={{
            padding: '14px 16px',
            borderTop: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {initial}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                color: '#fff',
                fontWeight: 600,
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={currentAdmin.fullName}
            >
              {currentAdmin.fullName}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 11,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={currentAdmin.email}
            >
              {currentAdmin.email}
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
              borderRadius: 8,
              padding: '6px 9px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <i className="bi bi-box-arrow-right"></i>
          </button>
        </div>
      )}
    </aside>
  );
}
