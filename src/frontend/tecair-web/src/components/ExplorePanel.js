import AIRPORTS from '../data/airports.js';

// Panel desplegable bajo la barra de navegación que lista destinos por región
export default function ExplorePanel({ onClose }) {
  // Agrupa los aeropuertos en las tres regiones disponibles
  const regions = {
    'Latinoamérica':       AIRPORTS.filter((a) => a.region === 'LATAM'),
    'Europa':              AIRPORTS.filter((a) => a.region === 'Europa'),
    'Asia & Medio Oriente': AIRPORTS.filter((a) => a.region === 'Asia'),
  };

  return (
    <div className="container position-relative" style={{ zIndex: 100 }}>
      <div className="explore-panel">
        <div className="row">
          {Object.entries(regions).map(([name, list]) => (
            <div className="col-md-4 explore-col" key={name}>
              <h6>{name}</h6>
              <ul>
                {list.slice(0, 7).map((a) => (
                  <li key={a.code} onClick={onClose}>
                    {a.city} <span className="text-muted small">· {a.country}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
