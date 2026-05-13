import { useState } from 'react';
import UnderDevelopment from '../components/UnderDevelopment.js';

// Sub-secciones del proceso de check-in.
// Control de Equipajes vive aquí porque solo aplica durante el check-in.
const TABS = [
  { key: 'checkin',   label: 'Chequeo de Pasajeros', icon: 'bi-person-check' },
  { key: 'equipajes', label: 'Control de Equipajes',  icon: 'bi-luggage'      },
];

export default function ChequeoPasajerosPage() {
  const [activeTab, setActiveTab] = useState('checkin');

  return (
    <div>
      <div className="admin-sub-nav" role="tablist" aria-label="Sub-secciones de check-in">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`admin-sub-nav-btn${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <i className={`bi ${tab.icon}`} aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        <UnderDevelopment />
      </div>
    </div>
  );
}
