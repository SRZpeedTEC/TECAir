using TECAir.Application.DTOs.Flights;

namespace TECAir.Application.Interfaces;

// Contrato de casos de uso de vuelos que expone la capa de aplicacion.
public interface IFlightService
{
    // Lista vuelos registrados con filtros opcionales.
    Task<FlightSearchServiceResult> SearchAsync(
        FlightSearchFilters filters,
        CancellationToken cancellationToken = default);

    // Consulta un vuelo por id.
    Task<FlightResponse?> GetByIdAsync(int flightId, CancellationToken cancellationToken = default);

    // Crea un vuelo aplicando validaciones antes de llegar al repositorio.
    Task<CreateFlightServiceResult> CreateAsync(
        CreateFlightRequest request,
        CancellationToken cancellationToken = default);

    // Consulta vuelos por aeropuerto de salida filtrados por estado.
    Task<IReadOnlyList<OpenFlightResponse>> GetByDepartureAirportAndStateAsync(
        string departureCode,
        string state,
        CancellationToken cancellationToken = default);

    // Consulta vuelos por estado y ruta completa (origen y destino).
    Task<IReadOnlyList<OpenFlightResponse>> SearchByRouteAndStateAsync(
        string state,
        string departureCode,
        string arrivalCode,
        CancellationToken cancellationToken = default);

    // Aplica una transicion de estado controlada sobre un vuelo existente.
    // Reglas validas: UPCOMING -> OPEN (apertura) y OPEN -> CLOSED (cierre).
    Task<TransitionFlightStateServiceResult> TransitionStateAsync(
        int flightId,
        UpdateFlightStateRequest request,
        CancellationToken cancellationToken = default);

    // Actualiza los campos editables de un vuelo existente.
    Task<UpdateFlightServiceResult> UpdateAsync(
        int flightId,
        UpdateFlightRequest request,
        CancellationToken cancellationToken = default);

    // Elimina un vuelo si no forma parte de itinerarios.
    Task<DeleteFlightServiceResult> DeleteAsync(int flightId, CancellationToken cancellationToken = default);
}
