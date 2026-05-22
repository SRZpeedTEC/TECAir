import { useState, useEffect, useRef } from 'react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOWS  = ['L','M','M','J','V','S','D'];
const pad2  = (n) => String(n).padStart(2, '0');

function toISO(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseISO(s) {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function fmtDisplay(d) {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Datepicker para fechas de nacimiento.
// - maxDate fijo en hoy: no permite seleccionar ni navegar a fechas futuras.
// - Navegación rápida: «/» salta de año en año, ‹/› de mes en mes.
// - Click en el encabezado abre una grilla de años para saltar décadas.
// - Vista inicial por defecto: hace 30 años (rango típico de pasajeros adultos).
//
// Props:
//   value    — "YYYY-MM-DD" | ''
//   onChange — (s: "YYYY-MM-DD") => void
//   invalid  — bool
export default function BirthDatePicker({ value, onChange, invalid }) {
  const today    = new Date();
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const maxYear  = today.getFullYear();
  const minYear  = maxYear - 120;

  const selected    = parseISO(value);
  const defaultView = new Date(maxYear - 30, today.getMonth(), 1);

  const [open,     setOpen]     = useState(false);
  const [view,     setView]     = useState(
    selected ? new Date(selected.getFullYear(), selected.getMonth(), 1) : defaultView
  );
  const [mode,     setMode]     = useState('days'); // 'days' | 'years'
  const [yearPage, setYearPage] = useState(Math.floor((maxYear - 30) / 16) * 16);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Al abrir: reposiciona la vista sobre el valor seleccionado (o default).
  useEffect(() => {
    if (!open) return;
    const base = selected ?? defaultView;
    setView(new Date(base.getFullYear(), base.getMonth(), 1));
    setYearPage(Math.floor(base.getFullYear() / 16) * 16);
    setMode('days');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const y = view.getFullYear();
  const m = view.getMonth();

  // ─── Grilla de días ───
  const startDow    = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));

  const isDisabled = (d) => d > todayDay;
  const sameDay    = (a, b) => a && b && a.toDateString() === b.toDateString();

  const handleDaySelect = (d) => {
    if (isDisabled(d)) return;
    onChange(toISO(d));
    setOpen(false);
  };

  // ─── Límites de navegación ───
  const canNextMonth = new Date(y, m + 1, 1) <= todayDay;
  const canNextYear  = new Date(y + 1, m, 1) <= todayDay;

  const prevMonth = () => setView(new Date(y, m - 1, 1));
  const nextMonth = () => { if (canNextMonth) setView(new Date(y, m + 1, 1)); };
  const prevYear  = () => { if (y - 1 >= minYear) setView(new Date(y - 1, m, 1)); };
  const nextYear  = () => { if (canNextYear) setView(new Date(y + 1, m, 1)); };

  // ─── Grilla de años ───
  const yearFrom    = yearPage;
  const yearTo      = yearPage + 15;
  const canPrevPage = yearFrom - 16 >= minYear;
  const canNextPage = yearFrom + 16 <= maxYear;
  const visibleYears = Array.from({ length: 16 }, (_, i) => yearPage + i)
    .filter((yr) => yr >= minYear && yr <= maxYear);

  const openYearGrid = () => {
    setYearPage(Math.floor(y / 16) * 16);
    setMode('years');
  };

  const selectYear = (yr) => {
    const nextView = new Date(yr, m, 1);
    // Si el mes actual queda en el futuro para el año elegido, retrocede al mes actual de ese año.
    if (nextView > todayDay) {
      setView(new Date(yr, today.getMonth(), 1));
    } else {
      setView(nextView);
    }
    setMode('days');
  };

  // Estilos reutilizables
  const navBtn = {
    background: 'none',
    border: 'none',
    color: 'var(--burgundy)',
    cursor: 'pointer',
    padding: '2px 6px',
    borderRadius: 6,
    fontSize: '0.9rem',
    lineHeight: 1,
  };
  const navBtnDisabled = { ...navBtn, color: '#ddd', cursor: 'default' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        readOnly
        className={'form-control' + (invalid ? ' is-invalid' : '')}
        value={selected ? fmtDisplay(selected) : ''}
        placeholder="dd/mm/aaaa"
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
        style={{ cursor: 'pointer', caretColor: 'transparent' }}
      />

      {open && (
        <div className="calendar-pop" style={{ minWidth: 290 }}>

          {/* ─── Vista: días ─── */}
          {mode === 'days' && (
            <>
              {/* Cabecera de navegación */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                  gap: 2,
                }}
              >
                <button
                  style={y - 1 >= minYear ? navBtn : navBtnDisabled}
                  onClick={prevYear}
                  title="Año anterior"
                >
                  «
                </button>
                <button style={navBtn} onClick={prevMonth} title="Mes anterior">
                  ‹
                </button>

                {/* Encabezado clickeable: abre la grilla de años */}
                <button
                  onClick={openYearGrid}
                  style={{
                    flex: 1,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: 'var(--ink)',
                    padding: '2px 4px',
                    borderRadius: 6,
                    textAlign: 'center',
                  }}
                  title="Elegir año"
                >
                  {MESES[m]} {y}
                  <i
                    className="bi bi-chevron-down"
                    style={{ fontSize: '0.65rem', marginLeft: 4, color: 'var(--burgundy)' }}
                  ></i>
                </button>

                <button
                  style={canNextMonth ? navBtn : navBtnDisabled}
                  onClick={nextMonth}
                  title="Mes siguiente"
                >
                  ›
                </button>
                <button
                  style={canNextYear ? navBtn : navBtnDisabled}
                  onClick={nextYear}
                  title="Año siguiente"
                >
                  »
                </button>
              </div>

              {/* Cuadrícula de días */}
              <div className="cal-grid">
                {DOWS.map((d, i) => (
                  <div key={'dow' + i} className="cal-cell dow">{d}</div>
                ))}
                {cells.map((c, i) => {
                  if (!c) return <div key={'empty' + i} className="cal-cell"></div>;
                  const disabled = isDisabled(c);
                  const sel      = sameDay(c, selected);
                  let cls = 'cal-cell';
                  if (disabled) cls += ' muted';
                  if (sel)      cls += ' selected';
                  return (
                    <div
                      key={i}
                      className={cls}
                      onClick={() => handleDaySelect(c)}
                      style={disabled ? { cursor: 'default' } : undefined}
                    >
                      {c.getDate()}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ─── Vista: grilla de años ─── */}
          {mode === 'years' && (
            <>
              {/* Navegación de página de años */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <button
                  style={canPrevPage ? navBtn : navBtnDisabled}
                  onClick={() => { if (canPrevPage) setYearPage((p) => p - 16); }}
                  title="Página anterior"
                >
                  «
                </button>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--ink)' }}>
                  {Math.max(yearFrom, minYear)} – {Math.min(yearTo, maxYear)}
                </span>
                <button
                  style={canNextPage ? navBtn : navBtnDisabled}
                  onClick={() => { if (canNextPage) setYearPage((p) => p + 16); }}
                  title="Página siguiente"
                >
                  »
                </button>
              </div>

              {/* Grilla de 4 columnas de años */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 4,
                }}
              >
                {visibleYears.map((yr) => {
                  const isSelected = selected && selected.getFullYear() === yr;
                  const isCurrent  = yr === y;
                  return (
                    <div
                      key={yr}
                      onClick={() => selectYear(yr)}
                      style={{
                        padding: '7px 4px',
                        textAlign: 'center',
                        borderRadius: 8,
                        fontSize: '0.85rem',
                        fontWeight: isSelected || isCurrent ? 700 : 400,
                        cursor: 'pointer',
                        background: isSelected
                          ? 'var(--burgundy)'
                          : isCurrent
                          ? 'var(--burgundy-soft)'
                          : 'transparent',
                        color: isSelected ? '#fff' : isCurrent ? 'var(--burgundy)' : 'var(--ink)',
                        userSelect: 'none',
                      }}
                    >
                      {yr}
                    </div>
                  );
                })}
              </div>

              {/* Volver al calendario sin cambiar año */}
              <button
                onClick={() => setMode('days')}
                style={{
                  marginTop: 10,
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                <i className="bi bi-arrow-left me-1"></i>Volver al calendario
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
