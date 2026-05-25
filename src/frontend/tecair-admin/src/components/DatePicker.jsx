import { useState, useEffect, useRef } from 'react';

// Nombres de los meses en español y días de la semana (lunes primero).
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOWS  = ['L','M','M','J','V','S','D'];

const pad2 = (n) => String(n).padStart(2, '0');

// Convierte "YYYY-MM-DD" en un Date local. Devuelve null si la cadena está vacía o es inválida.
function parseISODate(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

// Serializa un Date local a "YYYY-MM-DD".
function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// Formatea un Date local como "dd/mm/aaaa".
function fmtDDMMYYYY(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// DatePicker: input + calendario emergente. Selección única (sin rangos).
//
// Props:
//   id       — id del input para el label htmlFor
//   label    — texto del <label>
//   value    — cadena "YYYY-MM-DD" o '' (vacío)
//   onChange — recibe la nueva cadena "YYYY-MM-DD" (o '' si se borra)
//   invalid  — bool, aplica clase is-invalid al input
//   minDate  — Date opcional: las fechas estrictamente anteriores se muestran
//              deshabilitadas y no se pueden seleccionar
export default function DatePicker({ id, label, value, onChange, invalid, minDate }) {
  const selectedDate     = parseISODate(value);
  const [open, setOpen]  = useState(false);
  const [view, setView]  = useState(selectedDate || new Date());
  const ref              = useRef(null);

  // Cierra el calendario al hacer clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cuando se abre, reposiciona la vista al mes de la fecha seleccionada
  useEffect(() => {
    if (open && selectedDate) setView(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Construye la cuadrícula del mes visible
  const y           = view.getFullYear();
  const m           = view.getMonth();
  const startDow    = (new Date(y, m, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  const sameDay = (a, b) => a && b && a.toDateString() === b.toDateString();

  // Normalizamos minDate a medianoche para comparar solo por dia.
  const minDay = minDate
    ? new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())
    : null;
  const isDisabled = (d) => minDay !== null && d < minDay;

  const handleSelect = (d) => {
    if (isDisabled(d)) return;
    onChange(toISODate(d));
    setOpen(false);
  };

  return (
    <div ref={ref} className="date-picker">
      {label && <label htmlFor={id} className="form-label">{label}</label>}

      <input
        id={id}
        type="text"
        className={'form-control' + (invalid ? ' is-invalid' : '')}
        placeholder="dd/mm/aaaa"
        value={selectedDate ? fmtDDMMYYYY(selectedDate) : ''}
        readOnly
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />

      {open && (
        <div className="calendar-pop">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <button
              type="button"
              className="btn btn-sm btn-link text-burgundy"
              onClick={() => setView(new Date(y, m - 1, 1))}
              aria-label="Mes anterior"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <strong>{MESES[m]} {y}</strong>
            <button
              type="button"
              className="btn btn-sm btn-link text-burgundy"
              onClick={() => setView(new Date(y, m + 1, 1))}
              aria-label="Mes siguiente"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>

          <div className="cal-grid">
            {DOWS.map((d, i) => (
              <div key={'dow' + i} className="cal-cell dow">{d}</div>
            ))}
            {cells.map((c, i) => {
              if (!c) return <div key={'empty' + i} className="cal-cell"></div>;
              const disabled = isDisabled(c);
              const classes = ['cal-cell'];
              if (sameDay(c, selectedDate)) classes.push('selected');
              if (disabled) classes.push('disabled');
              return (
                <div
                  key={i}
                  className={classes.join(' ')}
                  onClick={() => handleSelect(c)}
                  aria-disabled={disabled || undefined}
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
