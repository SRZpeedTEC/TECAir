import AdminSidebar from './AdminSidebar.js';

// Wrapper que compone el shell completo: sidebar a la izquierda + área de contenido a la derecha.
// Recibe el ítem activo, el callback de navegación, el ícono y título de la sección actual,
// y los children que se renderizan en el cuerpo del contenido.
export default function AdminLayout({ activePage, onNavigate, sectionIcon, sectionTitle, children }) {
  return (
    <div className="admin-shell">
      <AdminSidebar activePage={activePage} onNavigate={onNavigate} />

      <div className="admin-content">
        <header className="admin-content-header">
          {sectionIcon && (
            <i className={`bi ${sectionIcon} section-icon`} aria-hidden="true" />
          )}
          <h1>{sectionTitle}</h1>
        </header>

        <main className="admin-content-body">
          {children}
        </main>
      </div>
    </div>
  );
}
