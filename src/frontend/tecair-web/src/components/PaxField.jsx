import { useState, useEffect, useRef } from 'react';

// Campo para seleccionar la cantidad de pasajeros con popover de incremento/decremento
export default function PaxField({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);

  // Cierra el popover al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ajusta el contador de adultos entre 1 y 9 (1 es el mínimo una vez seleccionado)
  const change = (delta) => {
    const current = value.adults || 0;
    const next = Math.min(9, Math.max(1, current + delta));
    onChange({ adults: next });
  };

  const total = value.adults || 0;
  const display = total > 0
    ? `${total} ${total === 1 ? 'pasajero' : 'pasajeros'}`
    : <span style={{ color: '#aaa' }}>Selecciona pasajeros</span>;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="field-group" onClick={() => setOpen(!open)}>
        <label>Pasajeros</label>
        <div className="field-value">{display}</div>
      </div>

      {/* Popover con contador */}
      {open && (
        <div className="pax-pop">
          <div className="pax-row">
            <div>
              <div style={{ fontWeight: 500 }}>Pasajeros</div>
              <div className="text-muted small">Todas las edades</div>
            </div>
            <div className="pax-counter">
              <button onClick={() => change(-1)} disabled={(value.adults || 0) <= 1}>
                <i className="bi bi-dash"></i>
              </button>
              <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 600 }}>
                {value.adults || 1}
              </span>
              <button onClick={() => change(+1)}>
                <i className="bi bi-plus"></i>
              </button>
            </div>
          </div>
          <button className="btn btn-burgundy w-100 mt-3" onClick={() => setOpen(false)}>
            Listo
          </button>
        </div>
      )}
    </div>
  );
}
