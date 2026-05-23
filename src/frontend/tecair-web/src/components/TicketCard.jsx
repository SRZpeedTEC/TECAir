import Barcode from './Barcode.jsx';
import { STATUS_LABELS } from '../data/trips.js';

// Tarjeta de boarding pass rediseñada.
// Props:
//   trip            — objeto de viaje normalizado (buildTripFromGroup)
//   isNew           — bool, muestra etiqueta "Recién reservado"
//   onPrintReceipt  — () => void, descarga la factura de este viaje
export default function TicketCard({ trip, isNew, onPrintReceipt }) {
  const st          = STATUS_LABELS[trip.status] || STATUS_LABELS.proxim;
  const isCompleted = trip.status === 'completado';
  const mainColor   = isCompleted ? '#8a8390' : 'var(--burgundy)';
  const softBg      = isCompleted ? '#f3f1f0' : 'var(--burgundy-soft)';

  return (
    <div
      className="mb-4"
      style={{
        filter: isNew
          ? 'drop-shadow(0 8px 28px rgba(91,25,54,0.22))'
          : 'drop-shadow(0 2px 12px rgba(0,0,0,0.08))',
      }}
    >
      {isNew && (
        <div
          className="d-inline-block px-3 py-1 mb-2 rounded-pill"
          style={{ background: 'var(--burgundy)', color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}
        >
          <i className="bi bi-stars me-1"></i>Recién reservado
        </div>
      )}

      <div
        style={{
          display: 'flex',
          borderRadius: 18,
          overflow: 'hidden',
          background: '#fff',
          boxShadow: '0 0 0 1.5px var(--burgundy-line)',
        }}
      >
        {/* ─── Sección principal ─── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

          {/* Cabecera */}
          <div
            style={{
              background: mainColor,
              padding: '10px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                color: '#fff',
                fontFamily: "'Fraunces', Georgia, serif",
                fontWeight: 600,
                fontSize: '1rem',
                letterSpacing: '-0.01em',
              }}
            >
              TECAir
            </span>
            <span
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                fontSize: '0.68rem',
                padding: '2px 10px',
                borderRadius: 999,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              <i className={'bi ' + st.icon + ' me-1'}></i>{st.label}
            </span>
          </div>

          {/* Ruta: IATA codes + horarios */}
          <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Origen */}
            <div style={{ minWidth: 72 }}>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: '2rem',
                  color: mainColor,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {trip.from.code}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                {trip.from.city}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.15rem', marginTop: 6, color: 'var(--ink)' }}>
                {trip.depart}
              </div>
            </div>

            {/* Centro: línea + vuelo + duración */}
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 5,
                }}
              >
                {trip.duration}
              </div>
              <div
                style={{
                  position: 'relative',
                  height: 2,
                  background: 'var(--burgundy-line)',
                }}
              >
                <i
                  className="bi bi-airplane-fill"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -55%)',
                    background: '#fff',
                    paddingInline: 6,
                    color: mainColor,
                    fontSize: '0.88rem',
                  }}
                ></i>
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--muted)',
                  marginTop: 5,
                  fontWeight: 600,
                }}
              >
                {trip.flight}
              </div>
            </div>

            {/* Destino */}
            <div style={{ minWidth: 72, textAlign: 'right' }}>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 800,
                  fontSize: '2rem',
                  color: mainColor,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {trip.to.code}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                {trip.to.city}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.15rem', marginTop: 6, color: 'var(--ink)' }}>
                {trip.arrive}
              </div>
            </div>
          </div>

          {/* Franja de meta: fecha + vuelo */}
          <div
            style={{
              padding: '8px 20px',
              marginInline: 20,
              borderTop: '1px dashed var(--burgundy-line)',
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
            }}
          >
            {[
              { lbl: 'Fecha',  val: trip.date   },
              { lbl: 'Vuelo',  val: trip.flight  },
              { lbl: `${trip.stops === 0 ? 'Directo' : `${trip.stops} escala${trip.stops > 1 ? 's' : ''}`}`, val: trip.duration },
            ].map((r) => (
              <div key={r.lbl}>
                <div
                  style={{
                    fontSize: '0.58rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--muted)',
                    fontWeight: 700,
                  }}
                >
                  {r.lbl}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--ink)' }}>
                  {r.val}
                </div>
              </div>
            ))}
          </div>

          {/* Pasajeros: todos visibles */}
          <div
            style={{
              padding: '10px 20px 16px',
              marginInline: 20,
              borderTop: '1px dashed var(--burgundy-line)',
              marginTop: 8,
            }}
          >
            <div
              style={{
                fontSize: '0.58rem',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--muted)',
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Pasajeros ({trip.passengers.length})
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '6px 16px',
              }}
            >
              {trip.passengers.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: softBg,
                      color: mainColor,
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--ink)',
                      lineHeight: 1.25,
                    }}
                  >
                    {p.firstName} {p.lastName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Separador con muescas ─── */}
        <div style={{ position: 'relative', width: 28, flexShrink: 0 }}>
          <div
            style={{
              position: 'absolute',
              top: -14,
              left: 1,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--bg)',
              zIndex: 4,
            }}
          ></div>
          <div
            style={{
              position: 'absolute',
              top: 13,
              bottom: 13,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              borderLeft: '1.5px dashed var(--burgundy-line)',
            }}
          ></div>
          <div
            style={{
              position: 'absolute',
              bottom: -14,
              left: 1,
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'var(--bg)',
              zIndex: 4,
            }}
          ></div>
        </div>

        {/* ─── Stub derecho ─── */}
        <div
          style={{
            width: 148,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '16px 14px',
            gap: 0,
          }}
        >
          {/* Código de confirmación */}
          <div style={{ textAlign: 'center', width: '100%', marginBottom: 10 }}>
            <div
              style={{
                fontSize: '0.58rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: isCompleted ? 'var(--muted)' : 'var(--burgundy)',
                fontWeight: 700,
                marginBottom: 4,
              }}
            >
              Reservación
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontWeight: 800,
                fontSize: '1.2rem',
                color: mainColor,
                letterSpacing: '0.02em',
                lineHeight: 1.1,
              }}
            >
              #{trip.reservationId ?? trip.id}
            </div>
          </div>

          {/* Fecha compacta */}
          <div
            style={{
              fontSize: '0.72rem',
              color: 'var(--muted)',
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {trip.date}
          </div>

          {/* Código de barras decorativo */}
          <div style={{ opacity: 0.25, width: '100%', marginBottom: 'auto' }}>
            <Barcode />
          </div>

          {/* Botón de factura */}
          {onPrintReceipt && (
            <button
              type="button"
              onClick={onPrintReceipt}
              style={{
                marginTop: 14,
                width: '100%',
                background: softBg,
                border: `1px solid ${isCompleted ? '#d0ccd4' : 'var(--burgundy-line)'}`,
                borderRadius: 8,
                color: mainColor,
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '6px 8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                lineHeight: 1.2,
              }}
            >
              <i className="bi bi-file-earmark-pdf" style={{ fontSize: '0.85rem' }}></i>
              Descargar factura
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
