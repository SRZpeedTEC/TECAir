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

    // Actualiza los campos editables de un vuelo existente.
    Task<UpdateFlightServiceResult> UpdateAsync(
        int flightId,
        UpdateFlightRequest request,
        CancellationToken cancellationToken = default);

    // Elimina un vuelo si no forma parte de itinerarios.
    Task<DeleteFlightServiceResult> DeleteAsync(int flightId, CancellationToken cancellationToken = default);
}
