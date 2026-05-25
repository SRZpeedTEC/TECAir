import { useState } from 'react';

import PromotionListTab   from './PromotionListTab.jsx';
import PromotionCreateTab from './PromotionCreateTab.jsx';

// Contenedor de Gestión de Promociones. Dos pestañas:
//   • Consultar  → lista promociones existentes, editar y eliminar.
//   • Crear      → busca itinerarios en grid y aplica una promoción.
const TABS = [
  { id: 'list',   label: 'Consultar promociones', icon: 'bi-list-ul'     },
  { id: 'create', label: 'Crear promoción',       icon: 'bi-plus-circle' },
];

export default function GestionPromocionesPage() {
  const [activeTab, setActiveTab] = useState('list');

  return (
    <div>
      <header className="admin-page-header">
        <h2 className="serif admin-page-title">Gestión de Promociones</h2>
        <p className="admin-page-subtitle">
          Las promociones se aplican a itinerarios existentes y consisten en un precio
          promocional con un período de vigencia. Opcionalmente pueden incluir una imagen
          para mostrar al cliente.
        </p>
      </header>

      <nav className="admin-sub-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={'admin-sub-nav-btn' + (activeTab === t.id ? ' active' : '')}
            onClick={() => setActiveTab(t.id)}
          >
            <i className={`bi ${t.icon}`}></i>
            {t.label}
          </button>
        ))}
      </nav>

      {activeTab === 'list'   && <PromotionListTab />}
      {activeTab === 'create' && <PromotionCreateTab />}
    </div>
  );
}
