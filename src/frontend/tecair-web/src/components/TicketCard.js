import Barcode from './Barcode.js';
import { STATUS_LABELS } from '../data/trips.js';

// Tarjeta de embarque con diseño de tiquete físico: cabecera, ruta, stub con asiento y código de barras
export default function TicketCard({ trip, isNew }) {
  const st          = STATUS_LABELS[trip.status] || STATUS_LABELS.proxim;
  const isCompleted = trip.status === 'completado';

  // Color principal según si el vuelo ya ocurrió
  const mainColor  = isCompleted ? '#8a8390' : 'var(--burgundy)';
  const codeStyle  = {
    fontFamily: "'Inter',sans-serif", fontWeight: 800, fontSize: '2rem',
    lineHeight: 1, color: mainColor, letterSpacing: '-0.02em',
  };

  return (
    <div className="mb-4" style={{ filter: isNew ? 'drop-shadow(0 8px 28px rgba(91,25,54,0.22))' : 'drop-shadow(0 2px 12px rgba(0,0,0,0.08))' }}>
      {/* Etiqueta "Recién reservado" solo para el viaje nuevo */}
      {isNew && (
        <div
          className="d-inline-block px-3 py-1 mb-2 rounded-pill"
          style={{ background: 'var(--burgundy)', color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}
        >
          <i className="bi bi-stars me-1"></i>Recién reservado
        </div>
      )}

      {/* Contenedor principal del tiquete */}
      <div style={{ display: 'flex', borderRadius: 18, overflow: 'hidden', background: '#fff', boxShadow: '0 0 0 1.5px var(--burgundy-line)', position: 'relative' }}>

        {/* ─── Sección izquierda: información principal del vuelo ─── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Cabecera con nombre de aerolínea y estado */}
          <div style={{ background: mainColor, padding: '10px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#fff', fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: '1rem', letterSpacing: '-0.01em' }}>
              AirTEC
            </span>
            <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.7rem', padding: '2px 10px', borderRadius: 999, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <i className={'bi ' + st.icon + ' me-1'}></i>{st.label}
            </span>
          </div>

          {/* Fila de ruta: hora salida — avión — hora llegada */}
          <div style={{ padding: '16px 20px 10px', display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Origen */}
            <div>
              <div style={codeStyle}>{trip.from.code}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>{trip.from.city}</div>
              <div style={{ fontWeight: 700, fontSize: '1.15rem', marginTop: 6 }}>{trip.depart}</div>
            </div>

            {/* Centro: duración y número de vuelo */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                {trip.duration}
              </div>
              <div style={{ position: 'relative', height: 2, background: 'var(--burgundy-line)', margin: '0 auto' }}>
                <i
                  className="bi bi-airplane-fill"
                  style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-55%)', background: '#fff', paddingInline: 6, color: mainColor, fontSize: '0.9rem' }}
                ></i>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 5, fontWeight: 600 }}>
                {trip.flight}
              </div>
            </div>

            {/* Destino */}
            <div style={{ textAlign: 'right' }}>
              <div style={codeStyle}>{trip.to.code}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>{trip.to.city}</div>
              <div style={{ fontWeight: 700, fontSize: '1.15rem', marginTop: 6 }}>{trip.arrive}</div>
            </div>
          </div>

          {/* Franja inferior con fecha y número de pasajeros */}
          <div style={{ padding: '8px 20px 16px', display: 'flex', gap: 20, borderTop: '1px dashed var(--burgundy-line)', marginInline: 20 }}>
            {[
              { lbl: 'Fecha',     val: trip.date              },
              { lbl: 'Pasajeros', val: trip.passengers.length },
            ].map((r) => (
              <div key={r.lbl}>
                <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', fontWeight: 700 }}>{r.lbl}</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--ink)' }}>{r.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Separador con muescas de cartera ─── */}
        <div style={{ position: 'relative', width: 28, flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: -14, left: 1, width: 26, height: 26, borderRadius: '50%', background: 'var(--bg)', zIndex: 4 }}></div>
          <div style={{ position: 'absolute', top: 13, bottom: 13, left: '50%', transform: 'translateX(-50%)', width: 0, borderLeft: '1.5px dashed var(--burgundy-line)' }}></div>
          <div style={{ position: 'absolute', bottom: -14, left: 1, width: 26, height: 26, borderRadius: '50%', background: 'var(--bg)', zIndex: 4 }}></div>
        </div>

        {/* ─── Stub derecho: asiento, pasajero y código de barras ─── */}
        <div style={{ width: 168, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Asiento destacado */}
          <div style={{ background: isCompleted ? '#f3f1f0' : 'var(--burgundy-soft)', padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: isCompleted ? 'var(--muted)' : 'var(--burgundy)', fontWeight: 700 }}>
              Asiento
            </div>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: '2.2rem', fontWeight: 800, color: mainColor, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              {trip.seat}
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 2 }}>Económica</div>
          </div>

          {/* Lista de pasajeros y código de barras */}
          <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {trip.passengers.slice(0, 2).map((p, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', fontWeight: 700 }}>
                  Pasajero {i + 1}
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                  {p.firstName}<br />{p.lastName}
                </div>
              </div>
            ))}
            {trip.passengers.length > 2 && (
              <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                +{trip.passengers.length - 2} más
              </div>
            )}

            {/* Código de barras al fondo del stub */}
            <div style={{ marginTop: 'auto', paddingTop: 12 }}>
              <div style={{ opacity: 0.3, maxWidth: '100%' }}>
                <Barcode />
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--muted)', textAlign: 'center', marginTop: 5, letterSpacing: '0.08em' }}>
                {trip.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
