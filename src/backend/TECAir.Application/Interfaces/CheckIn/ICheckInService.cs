using TECAir.Application.DTOs.CheckIns;

namespace TECAir.Application.Interfaces;

// Contrato de casos de uso de check-in que consume el controller.
public interface ICheckInService
{
    Task<CheckInResponse?> GetByConfirmationNumberAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default);
    Task<GetCheckInsByReservationServiceResult> GetByReservationIdAsync(
        int reservationId,
        CancellationToken cancellationToken = default);
    Task<CreateCheckInServiceResult> CreateAsync(
        CreateCheckInRequest request,
        CancellationToken cancellationToken = default);
    Task<UpdateCheckInServiceResult> UpdateSeatAsync(
        int confirmationNumber,
        UpdateCheckInSeatRequest request,
        CancellationToken cancellationToken = default);
    Task<DeleteCheckInServiceResult> DeleteAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default);
}
