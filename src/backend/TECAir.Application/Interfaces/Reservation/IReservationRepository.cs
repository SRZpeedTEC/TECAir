using TECAir.Application.DTOs.Reservations;

namespace TECAir.Application.Interfaces;

// Contrato de persistencia para reservaciones.
public interface IReservationRepository
{
    Task<bool> ItineraryExistsAsync(int itineraryId, CancellationToken cancellationToken = default);
    Task<bool> UserExistsAsync(string email, CancellationToken cancellationToken = default);
    Task<bool> PassengerExistsAsync(string passengerId, CancellationToken cancellationToken = default);
    Task<bool> SeatExistsAsync(string planePlate, string seatNumber, CancellationToken cancellationToken = default);
    Task<bool> PaymentReferenceExistsAsync(string paymentReference, CancellationToken cancellationToken = default);

    // Inserta una reservacion ya pagada y devuelve la informacion creada.
    Task<ReservationResponse> CreateAsync(CreateReservationRequest request, CancellationToken cancellationToken = default);

    // Busca reservaciones por id exacto, pasaporte exacto o nombre/apellido parcial.
    Task<IReadOnlyList<ReservationSearchResponse>> SearchAsync(
        int? reservationId,
        string? passengerId,
        string? name,
        CancellationToken cancellationToken = default);
}
