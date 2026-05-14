<<<<<<< HEAD
import UnderDevelopment from '../components/UnderDevelopment.js';

export default function GestionVuelosPage() {
  return <UnderDevelopment />;
=======
import { useState } from 'react';

import FlightForm     from '../components/FlightForm.js';
import FlightListTab  from './FlightListTab.js';
import { createFlight } from '../services/flightService.js';

// Página contenedora de Gestión de Vuelos.
// Sub-navegación con dos pestañas:
//   • Lista  → consultar / editar / eliminar (FlightListTab)
//   • Crear  → crear vuelo atómico (FlightForm en modo create)
//
// El estado se mantiene local al contenedor para que cada pestaña sea independiente.

const TABS = [
  { id: 'list',   label: 'Consultar vuelos', icon: 'bi-list-ul' },
  { id: 'create', label: 'Crear vuelo',      icon: 'bi-plus-circle' },
];

export default function GestionVuelosPage() {
  const [activeTab,     setActiveTab]     = useState('list');
  const [successMessage, setSuccessMessage] = useState(null);

  // El form de creación entrega un payload listo; aquí solo orquestamos la llamada.
  const handleCreate = async (payload) => {
    setSuccessMessage(null);
    const created = await createFlight({ ...payload, state: 'OPEN' });
    setSuccessMessage(`Vuelo #${created.flightId} creado correctamente.`);
  };

  const handleCancelCreate = () => {
    setSuccessMessage(null);
  };

  return (
    <div>
      <header className="admin-page-header">
        <h2 className="serif admin-page-title">Gestión de Vuelos</h2>
        <p className="admin-page-subtitle">
          Consulta, crea, edita y elimina vuelos atómicos. Los vuelos atómicos son la base sobre la que
          luego se construyen los itinerarios.
        </p>
      </header>

      <nav className="admin-sub-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={'admin-sub-nav-btn' + (activeTab === t.id ? ' active' : '')}
            onClick={() => { setActiveTab(t.id); setSuccessMessage(null); }}
          >
            <i className={`bi ${t.icon}`}></i>
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === 'list' && <FlightListTab />}

      {activeTab === 'create' && (
        <div className="admin-card">
          <FlightForm
            mode="create"
            onSubmit={handleCreate}
            onCancel={handleCancelCreate}
            successMessage={successMessage}
          />
        </div>
      )}
    </div>
  );
>>>>>>> admin-view-develop
}
