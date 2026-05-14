using TECAir.Application.DTOs.CheckIns;

namespace TECAir.Application.Interfaces;

// Contrato que aisla la persistencia de check-in de la capa de aplicacion.
public interface ICheckInRepository
{
    Task<CheckInResponse?> GetByConfirmationNumberAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default);
    Task<IReadOnlyList<CheckInResponse>> GetByReservationIdAsync(
        int reservationId,
        CancellationToken cancellationToken = default);
    Task<CheckInResponse> CreateAsync(CreateCheckInRequest request, CancellationToken cancellationToken = default);
    Task<CheckInResponse> UpdateSeatAsync(
        int confirmationNumber,
        UpdateCheckInSeatRequest request,
        CancellationToken cancellationToken = default);
    Task DeleteAsync(int confirmationNumber, CancellationToken cancellationToken = default);
    Task<bool> CheckInExistsAsync(int confirmationNumber, CancellationToken cancellationToken = default);
    Task<bool> ReservationExistsAsync(int reservationId, CancellationToken cancellationToken = default);
    Task<bool> ItineraryFlightExistsAsync(int itineraryFlightId, CancellationToken cancellationToken = default);
    Task<bool> SeatExistsAsync(
        string planePlate,
        string seatNumber,
        CancellationToken cancellationToken = default);
    Task<bool> SeatAlreadyTakenAsync(
        int itineraryFlightId,
        string planePlate,
        string seatNumber,
        int? excludingConfirmationNumber = null,
        CancellationToken cancellationToken = default);
    Task<bool> ReservationAlreadyCheckedForFlightAsync(
        int reservationId,
        int itineraryFlightId,
        CancellationToken cancellationToken = default);
    Task<bool> ItineraryFlightBelongsToReservationItineraryAsync(
        int reservationId,
        int itineraryFlightId,
        CancellationToken cancellationToken = default);
    Task<bool> SeatBelongsToFlightPlaneAsync(
        int itineraryFlightId,
        string planePlate,
        CancellationToken cancellationToken = default);
}
