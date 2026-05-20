import FlightTransitionPanel from '../components/FlightTransitionPanel.js';

// Apertura de Vuelos: lista vuelos UPCOMING próximos a salir y permite pasarlos a OPEN.
// Toda la lógica (qué vuelos listar y qué transiciones son válidas) vive en backend.
export default function AperturaVuelosPage() {
  return (
    <div>
      <header className="admin-page-header">
        <h2 className="serif admin-page-title">Apertura de Vuelos</h2>
        <p className="admin-page-subtitle">
          Habilita el check-in de los vuelos próximos a salir. Solo los vuelos en estado
          UPCOMING pueden abrirse; una vez abiertos, el personal de chequeo puede registrar
          pasajeros.
        </p>
      </header>

      <FlightTransitionPanel
        fromState="UPCOMING"
        toState="OPEN"
        actionLabel="Abrir vuelo"
        actionVerb="abrir"
        icon="bi-unlock"
      />
    </div>
  );
}
