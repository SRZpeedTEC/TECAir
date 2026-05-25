import FlightTransitionPanel from '../components/FlightTransitionPanel.jsx';

// Cierre de Vuelos: lista vuelos OPEN próximos a salir y permite pasarlos a CLOSED.
// Toda la lógica (qué vuelos listar y qué transiciones son válidas) vive en backend.
export default function CierreVuelosPage() {
  return (
    <div>
      <header className="admin-page-header">
        <h2 className="serif admin-page-title">Cierre de Vuelos</h2>
        <p className="admin-page-subtitle">
          Cierra el check-in de los vuelos que están por despegar. Solo los vuelos en estado
          OPEN pueden cerrarse; al cerrarse ya no se podrán registrar más pasajeros.
        </p>
      </header>

      <FlightTransitionPanel
        fromState="OPEN"
        toState="CLOSED"
        actionLabel="Cerrar vuelo"
        actionVerb="cerrar"
        icon="bi-lock"
        showClosingReport
      />
    </div>
  );
}
