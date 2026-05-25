import { useState, useEffect, useRef } from 'react';
import { fmtDate } from '../utils/format.js';

// Nombres de los meses en español para el encabezado del calendario
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
// Iniciales de los días de la semana, comenzando en lunes
const DOWS  = ['L','M','M','J','V','S','D'];

// Campo de fecha con calendario emergente estilo datepicker personalizado
export default function DateField({ label, value, onChange, min }) {
  const [open, setOpen]   = useState(false);
  const [view, setView]   = useState(value || new Date()); // mes visible en el calendario
  const ref               = useRef(null);

  // Cierra el calendario al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Construye la cuadrícula de celdas del mes visible
  const y = view.getFullYear();
  const m = view.getMonth();
  const startDow    = (new Date(y, m, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);       // celdas vacías al inicio
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div className="field-group" onClick={() => setOpen(!open)}>
        <label>{label}</label>
        <div className="field-value">
          {value ? fmtDate(value) : <span style={{ color: '#aaa' }}>dd/mm/aaaa</span>}
        </div>
      </div>

      {/* Calendario emergente */}
      {open && (
        <div className="calendar-pop">
          {/* Navegación de mes */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <button
              className="btn btn-sm btn-link text-burgundy"
              onClick={() => setView(new Date(y, m - 1, 1))}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <strong>{MESES[m]} {y}</strong>
            <button
              className="btn btn-sm btn-link text-burgundy"
              onClick={() => setView(new Date(y, m + 1, 1))}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>

          {/* Cuadrícula de días */}
          <div className="cal-grid">
            {DOWS.map((d, i) => (
              <div key={'dow' + i} className="cal-cell dow">{d}</div>
            ))}
            {cells.map((c, i) => {
              if (!c) return <div key={'empty' + i} className="cal-cell"></div>;
              const isPast = min && c < new Date(min.toDateString());
              return (
                <div
                  key={i}
                  className={'cal-cell ' + (isPast ? 'muted' : '') + (sameDay(c, value) ? ' selected' : '')}
                  onClick={() => { if (!isPast) { onChange(c); setOpen(false); } }}
                >
                  {c.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
