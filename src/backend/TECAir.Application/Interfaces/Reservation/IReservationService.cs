using TECAir.Application.DTOs.Reservations;

namespace TECAir.Application.Interfaces;

// Contrato de casos de uso de reservaciones.
public interface IReservationService
{
    Task<CreateReservationServiceResult> CreateAsync(
        CreateReservationRequest request,
        CancellationToken cancellationToken = default);

    Task<SearchReservationsServiceResult> SearchAsync(
        string? passengerId,
        string? name,
        CancellationToken cancellationToken = default);
}
