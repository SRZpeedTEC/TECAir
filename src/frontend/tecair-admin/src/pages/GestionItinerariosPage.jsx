import { useState } from 'react';

import ItineraryBuilder    from '../components/ItineraryBuilder.js';
import ItineraryListTab    from './ItineraryListTab.js';
import { createItinerary } from '../services/itineraryService.js';

// Contenedor de Gestión de Itinerarios. Dos pestañas:
//   • Consultar  → buscar por origen+destino, editar y eliminar.
//   • Crear      → constructor visual encadenado (ItineraryBuilder).

const TABS = [
  { id: 'list',   label: 'Consultar itinerarios', icon: 'bi-list-ul' },
  { id: 'create', label: 'Crear itinerario',      icon: 'bi-plus-circle' },
];

export default function GestionItinerariosPage() {
  const [activeTab,      setActiveTab]      = useState('list');
  const [successMessage, setSuccessMessage] = useState(null);

  const handleCreate = async (payload) => {
    setSuccessMessage(null);
    const created = await createItinerary(payload);
    setSuccessMessage(
      `Itinerario #${created.itineraryId ?? created.ItineraryId} creado correctamente.`
    );
  };

  return (
    <div>
      <header className="admin-page-header">
        <h2 className="serif admin-page-title">Gestión de Itinerarios</h2>
        <p className="admin-page-subtitle">
          Un itinerario es una ruta completa que el cliente puede reservar. Se construye encadenando
          vuelos atómicos existentes (directo o con escalas) y se le asigna un precio base.
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

      {activeTab === 'list' && <ItineraryListTab />}

      {activeTab === 'create' && (
        <ItineraryBuilder
          mode="create"
          onSubmit={handleCreate}
          successMessage={successMessage}
        />
      )}
    </div>
  );
}
