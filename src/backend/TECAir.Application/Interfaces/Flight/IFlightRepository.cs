using TECAir.Application.DTOs.Flights;

namespace TECAir.Application.Interfaces;

// Contrato que aisla a la aplicacion de los detalles SQL de vuelos.
public interface IFlightRepository
{
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

    // Inserta un vuelo y devuelve la informacion creada.
    Task<FlightResponse> CreateAsync(CreateFlightRequest request, CancellationToken cancellationToken = default);

    // Lista vuelos abiertos para construir itinerarios desde un aeropuerto.
    Task<IReadOnlyList<OpenFlightResponse>> GetOpenByDepartureAirportAsync(
        string departureCode,
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

    // Verifica si el vuelo ya forma parte de una ruta vendible.
    Task<bool> FlightIsUsedInItineraryAsync(int flightId, CancellationToken cancellationToken = default);

    // Actualiza el vuelo y devuelve la fila resultante.
    Task<FlightResponse> UpdateAsync(
        int flightId,
        UpdateFlightRequest request,
        CancellationToken cancellationToken = default);

    // Borra un vuelo existente.
    Task DeleteAsync(int flightId, CancellationToken cancellationToken = default);
}
