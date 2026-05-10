// Indicador de progreso de la reserva: Vuelos → Pasajeros → Asientos → Pago
export default function Stepper({ active }) {
  const steps = ['Vuelos', 'Pasajeros', 'Asientos', 'Pago'];

  return (
    <div className="stepper">
      {steps.map((s, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <div className={'step d-flex align-items-center ' + (i === active ? 'active' : i < active ? 'done' : '')}>
            <div className="step-dot">
              {/* Paso completado muestra checkmark, paso pendiente muestra número */}
              {i < active ? <i className="bi bi-check"></i> : i + 1}
            </div>
            <span className="step-label d-none d-md-inline">{s}</span>
          </div>
          {/* Línea conectora entre pasos */}
          {i < steps.length - 1 && (
            <div className={'step-line ' + (i < active ? 'done' : '')}></div>
          )}
        </div>
      ))}
    </div>
  );
}
