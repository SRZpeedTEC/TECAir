import { fmtCRC, stopsLabel } from '../utils/format.js';

// Panel lateral pegajoso con el resumen del viaje y desglose de costos
export default function SummarySide({ state }) {
  const f        = state.selectedFlight;
  const total    = state.pax.adults;
  const subtotal = f ? f.price * total : 0;
  const tax      = Math.round(subtotal * 0.13); // IVA del 13% (Costa Rica)
  const segments = f?.segments ?? [];

  return (
    <div
      className="bg-white border rounded-3 p-4"
      style={{ borderColor: 'var(--line)', position: 'sticky', top: 20 }}
    >
      <h6 className="serif mb-3">Resumen del viaje</h6>

      {f && (
        <>
          {/* Detalles del vuelo seleccionado */}
          <div className="mb-2">
            <div className="fw-semibold">{state.from?.code} → {state.to?.code}</div>
            <div className="small text-muted">{f.depart} — {f.arrive} · {f.duration}</div>
            <div className="small text-muted">
              {stopsLabel(f.stopAirports)} · vuelo {f.id}
            </div>
          </div>

          {/* Desglose tramo por tramo (incluye escalas) */}
          {segments.length > 0 && (
            <div className="border rounded-3 p-2 mb-2" style={{ borderColor: 'var(--line)' }}>
              {segments.map((s, i) => (
                <div key={s.flightId ?? i} className={i > 0 ? 'mt-2 pt-2 border-top' : ''} style={i > 0 ? { borderColor: 'var(--line)' } : undefined}>
                  <div className="small fw-semibold">
                    {s.departureCode} → {s.arrivalCode}
                  </div>
                  <div className="small text-muted">
                    {s.departureCity} — {s.arrivalCity}
                  </div>
                  {s.depart && s.arrive && (
                    <div className="small text-muted">{s.depart} — {s.arrive}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <hr />

          {/* Desglose de precios */}
          <div className="d-flex justify-content-between small mb-1">
            <span>Tarifa ({total} pax)</span>
            <span>{fmtCRC(subtotal)}</span>
          </div>
          <div className="d-flex justify-content-between small mb-1 text-muted">
            <span>Impuestos y cargos</span>
            <span>{fmtCRC(tax)}</span>
          </div>

          <hr />

          <div className="d-flex justify-content-between">
            <strong>Total</strong>
            <strong className="text-burgundy">{fmtCRC(subtotal + tax)}</strong>
          </div>
        </>
      )}
    </div>
  );
}
