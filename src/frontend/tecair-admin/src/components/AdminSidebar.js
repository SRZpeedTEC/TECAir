// Barra lateral de navegación de la Vista Aeropuerto.
// Recibe la sección activa y un callback para cambiar de sección.
const NAV_ITEMS = [
  { key: 'usuarios', label: 'Gestión de Usuarios', icon: 'bi-people' },
  { key: 'busqueda', label: 'Búsqueda de Vuelos', icon: 'bi-search' },
  { key: 'reservacion', label: 'Reservación de Vuelos', icon: 'bi-calendar-check' },
  { key: 'chequeo', label: 'Chequeo de Pasajeros', icon: 'bi-person-check' },
  { key: 'gestion-vuelos', label: 'Gestión de Vuelos', icon: 'bi-airplane' },
  { key: 'itinerarios', label: 'Gestión de Itinerarios', icon: 'bi-map' },
  { key: 'promociones', label: 'Gestión de Promociones', icon: 'bi-tag' },
  { key: 'apertura', label: 'Apertura de Vuelos', icon: 'bi-unlock' },
  { key: 'cierre', label: 'Cierre de Vuelos', icon: 'bi-lock' },
];

export default function AdminSidebar({ activePage, onNavigate }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <div className="brand-name">
          Air<span className="accent">TEC</span>
        </div>
        <div className="brand-sub">Vista Aeropuerto</div>
      </div>

      <ul className="admin-nav" role="navigation" aria-label="Menú de administración">
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
    </aside>
  );
}
