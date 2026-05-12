import { useState, useEffect, useRef } from 'react';
import { searchAirports } from '../services/airportService.js';

// Campo de búsqueda de aeropuerto con dropdown — consulta la API con debounce de 350ms
export default function AirportField({ label, value, onChange, exclude }) {
  const [open,      setOpen]      = useState(false);
  const [q,         setQ]         = useState('');
  const [results,   setResults]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);
  const ref                       = useRef(null);

  // Cierra el dropdown al hacer clic fuera del componente
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Llama a la API 350ms después de que el usuario deja de escribir (debounce)
  useEffect(() => {
    if (!open) return;
    if (q.trim().length === 0) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await searchAirports(q.trim());
        // Excluye el aeropuerto ya elegido en el campo opuesto (origen/destino)
        setResults(exclude ? data.filter((a) => a.code !== exclude.code) : data);
      } catch (err) {
        setError(err.message);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [q, open, exclude]);

  const handleOpen = () => {
    setOpen(true);
    setQ('');
    setResults([]);
  };

  const handleSelect = (airport) => {
    onChange(airport);
    setOpen(false);
    setQ('');
    setResults([]);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="field-group" onClick={handleOpen}>
        <label>{label}</label>
        {open ? (
          // Modo edición: input de búsqueda
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar ciudad o código..."
          />
        ) : (
          // Modo visualización: muestra el aeropuerto seleccionado
          <div className="field-value">
            {value
              ? <>{value.city} <span className="text-muted small">· {value.code}</span></>
              : <span style={{ color: '#aaa' }}>Selecciona aeropuerto</span>
            }
          </div>
        )}
      </div>

      {/* Dropdown de resultados */}
      {open && (
        <div className="ap-dd">
          {/* Estado: esperando que el usuario escriba */}
          {q.trim().length === 0 && (
            <div className="p-3 text-muted small">Escribe para buscar...</div>
          )}

          {/* Estado: cargando */}
          {q.trim().length > 0 && isLoading && (
            <div className="p-3 text-muted small">
              <span className="spinner-border spinner-border-sm me-2"></span>Buscando...
            </div>
          )}

          {/* Estado: error de red */}
          {error && (
            <div className="p-3 small text-danger">{error}</div>
          )}

          {/* Estado: sin resultados */}
          {!isLoading && !error && q.trim().length > 0 && results.length === 0 && (
            <div className="p-3 text-muted small">Sin resultados para "{q}"</div>
          )}

          {/* Lista de aeropuertos encontrados */}
          {results.map((a) => (
            <div
              key={a.code}
              className="ap-item"
              onClick={() => handleSelect(a)}
            >
              <div>
                <div className="city-name">{a.city}</div>
                <div className="city-meta">{a.country}</div>
              </div>
              <span className="ap-code">{a.code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
