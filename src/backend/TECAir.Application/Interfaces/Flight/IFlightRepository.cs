using TECAir.Application.DTOs.Flights;

namespace TECAir.Application.Interfaces;

// Contrato que aisla a la aplicacion de los detalles SQL de vuelos.
public interface IFlightRepository
{
    // Lista todos los vuelos con los campos principales de flight.
    Task<IReadOnlyList<FlightResponse>> GetAllAsync(CancellationToken cancellationToken = default);

    // Devuelve un vuelo por id o null si no existe.
    Task<FlightResponse?> GetByIdAsync(int flightId, CancellationToken cancellationToken = default);

    // Verifica si existe un aeropuerto por codigo.
    Task<bool> AirportExistsAsync(string airportCode, CancellationToken cancellationToken = default);

    // Verifica si existe un avion por placa.
    Task<bool> PlaneExistsAsync(string planePlate, CancellationToken cancellationToken = default);

    // Detecta si el avion ya tiene otro vuelo que traslapa el rango indicado.
    Task<bool> PlaneHasOverlappingFlightAsync(
        string planePlate,
        DateTime departureDatetime,
        DateTime arrivalDatetime,
        CancellationToken cancellationToken = default);

    // Detecta si una puerta ya esta ocupada en la misma salida.
    Task<bool> GateHasDepartureConflictAsync(
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default);

    // Detecta si la puerta tuvo otra salida dentro de la hora previa.
    Task<bool> GateHasDepartureWithinPreviousHourAsync(
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default);

    // Inserta un vuelo y devuelve la informacion creada.
    Task<FlightResponse> CreateAsync(
        CreateFlightRequest request,
        DateTime calculatedArrivalDatetime,
        int calculatedMiles,
        CancellationToken cancellationToken = default);

    // Lista vuelos en un estado dado para un aeropuerto de salida. Lo usan los
    // flujos de itinerarios (UPCOMING) y los de listados administrativos (OPEN).
    Task<IReadOnlyList<OpenFlightResponse>> GetByDepartureAirportAndStateAsync(
        string departureCode,
        string state,
        CancellationToken cancellationToken = default);

    // Lista vuelos filtrados por estado y ruta completa (origen y destino).
    // Lo usan las pantallas de Apertura y Cierre de Vuelos.
    Task<IReadOnlyList<OpenFlightResponse>> SearchByRouteAndStateAsync(
        string state,
        string departureCode,
        string arrivalCode,
        CancellationToken cancellationToken = default);

    // Devuelve el estado actual de un vuelo o null si no existe.
    // Lo usa el flujo de transicion para validar la regla UPCOMING->OPEN o OPEN->CLOSED.
    Task<string?> GetStateAsync(int flightId, CancellationToken cancellationToken = default);

    // Persiste un cambio de estado y devuelve el vuelo actualizado.
    Task<FlightResponse> UpdateStateAsync(
        int flightId,
        string state,
        CancellationToken cancellationToken = default);

    // Verifica que exista el vuelo antes de actualizarlo o borrarlo.
    Task<bool> FlightExistsAsync(int flightId, CancellationToken cancellationToken = default);

    // Detecta traslapes al actualizar, ignorando el vuelo que se esta editando.
    Task<bool> PlaneHasOverlappingFlightExceptAsync(
        int excludedFlightId,
        string planePlate,
        DateTime departureDatetime,
        DateTime arrivalDatetime,
        CancellationToken cancellationToken = default);

    // Detecta conflicto de puerta al actualizar, ignorando el vuelo actual.
    Task<bool> GateHasDepartureConflictExceptAsync(
        int excludedFlightId,
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default);

    // Detecta margen de puerta al actualizar, ignorando el vuelo actual.
    Task<bool> GateHasDepartureWithinPreviousHourExceptAsync(
        int excludedFlightId,
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default);

    // Verifica si el vuelo ya forma parte de una ruta vendible.
    Task<bool> FlightIsUsedInItineraryAsync(int flightId, CancellationToken cancellationToken = default);

    // Actualiza el vuelo y devuelve la fila resultante.
    Task<FlightResponse> UpdateAsync(
        int flightId,
        UpdateFlightRequest request,
        DateTime calculatedArrivalDatetime,
        int calculatedMiles,
        CancellationToken cancellationToken = default);

    // Borra un vuelo existente.
    Task DeleteAsync(int flightId, CancellationToken cancellationToken = default);
}
