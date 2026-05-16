using TECAir.Application.DTOs.Flights;

namespace TECAir.Application.Interfaces;

// Contrato de casos de uso de vuelos que expone la capa de aplicacion.
public interface IFlightService
{
    // Crea un vuelo aplicando validaciones antes de llegar al repositorio.
    Task<CreateFlightServiceResult> CreateAsync(
        CreateFlightRequest request,
        CancellationToken cancellationToken = default);

    // Consulta vuelos abiertos por aeropuerto de salida.
    Task<IReadOnlyList<OpenFlightResponse>> GetOpenByDepartureAirportAsync(
        string departureCode,
        CancellationToken cancellationToken = default);

    // Consulta vuelos disponibles con filtros opcionales.
    Task<IReadOnlyList<AvailableFlightResponse>> GetAvailableAsync(
        string? originCode = null,
        string? destinationCode = null,
        int? flightId = null,
        CancellationToken cancellationToken = default);

    // Actualiza los campos editables de un vuelo existente.
    Task<UpdateFlightServiceResult> UpdateAsync(
        int flightId,
        UpdateFlightRequest request,
        CancellationToken cancellationToken = default);

    // Actualiza solo el estado de un vuelo existente.
    Task<UpdateFlightServiceResult> UpdateStateAsync(
        int flightId,
        UpdateFlightStateRequest request,
        CancellationToken cancellationToken = default);

    // Elimina un vuelo si no forma parte de itinerarios.
    Task<DeleteFlightServiceResult> DeleteAsync(int flightId, CancellationToken cancellationToken = default);
}
