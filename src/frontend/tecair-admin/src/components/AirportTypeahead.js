import { useState, useEffect, useRef } from 'react';
import { searchAirports } from '../services/airportService.js';

// Typeahead de aeropuerto: el admin escribe 1+ caracteres y se dispara la búsqueda
// contra GET /api/airports/search?term=... (hasta 10 resultados).
//
// Props:
//   label    — texto del <label>
//   value    — objeto seleccionado { code, name, city, country } o null
//   onChange — recibe el airport elegido (o null si se borra)
//   exclude  — código de aeropuerto a excluir de los resultados (para evitar elegir el mismo en origen y destino)
//   invalid  — bool, marca el input como inválido (clase is-invalid)
//   id       — id del input para el label htmlFor
export default function AirportTypeahead({ label, value, onChange, exclude, invalid, id }) {
  const [open,      setOpen]      = useState(false);
  const [q,         setQ]         = useState('');
  const [results,   setResults]   = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState(null);
  const ref                       = useRef(null);

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Llama a la API 250ms después de que el usuario deja de escribir (debounce)
  useEffect(() => {
    if (!open) return;
    if (q.trim().length === 0) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const data = await searchAirports(q.trim());
        setResults(exclude ? data.filter((a) => a.code !== exclude) : data);
      } catch (err) {
        setError(err.message);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [q, open, exclude]);

  const handleFocus = () => {
    setOpen(true);
  };

  const handleSelect = (airport) => {
    onChange(airport);
    setOpen(false);
    setQ('');
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setQ('');
    setResults([]);
  };

  // Texto a mostrar en el input cuando NO está en modo búsqueda
  const displayText = value ? `${value.city} (${value.code})` : '';

  return (
    <div ref={ref} className="ap-typeahead">
      {label && <label htmlFor={id} className="form-label">{label}</label>}

      <div className="ap-typeahead-input-wrap">
        <input
          id={id}
          type="text"
          className={'form-control' + (invalid ? ' is-invalid' : '')}
          placeholder="Ciudad, país, nombre o código IATA…"
          value={open ? q : displayText}
          onFocus={handleFocus}
          onChange={(e) => {
            setQ(e.target.value);
            if (value) onChange(null); // si el admin empieza a escribir de nuevo, limpiamos la selección previa
          }}
          autoComplete="off"
        />
        {value && !open && (
          <button
            type="button"
            className="ap-typeahead-clear"
            onClick={handleClear}
            aria-label="Limpiar"
            title="Limpiar"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        )}
      </div>

      {open && (
        <div className="ap-typeahead-dd">
          {q.trim().length === 0 && (
            <div className="ap-typeahead-msg">Escribe para buscar…</div>
          )}

          {q.trim().length > 0 && isLoading && (
            <div className="ap-typeahead-msg">
              <span className="spinner-border spinner-border-sm me-2"></span>Buscando…
            </div>
          )}

          {error && (
            <div className="ap-typeahead-msg ap-typeahead-error">{error}</div>
          )}

          {!isLoading && !error && q.trim().length > 0 && results.length === 0 && (
            <div className="ap-typeahead-msg">Sin resultados para "{q}".</div>
          )}

          {results.map((a) => (
            <button
              key={a.code}
              type="button"
              className="ap-typeahead-item"
              onClick={() => handleSelect(a)}
            >
              <div className="ap-typeahead-item-main">
                <div className="ap-typeahead-city">{a.city}</div>
                <div className="ap-typeahead-meta">{a.name ? `${a.name} · ` : ''}{a.country}</div>
              </div>
              <span className="ap-typeahead-code">{a.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
