using TECAir.Application.DTOs.Reservations;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para reservaciones.
// Una reservacion en TECAir existe solo si ya tiene pago asociado.
public class ReservationService(IReservationRepository reservationRepository) : IReservationService
{
    public async Task<CreateReservationServiceResult> CreateAsync(
        CreateReservationRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCreateReservationRequest(request);
        if (validationError is not null)
        {
            return CreateReservationServiceResult.ValidationError(validationError);
        }

        var normalizedRequest = NormalizeCreateReservationRequest(request);

        if (!await reservationRepository.ItineraryExistsAsync(normalizedRequest.ItineraryId, cancellationToken))
        {
            return CreateReservationServiceResult.NotFound(
                $"Itinerary '{normalizedRequest.ItineraryId}' was not found.");
        }

        if (!await reservationRepository.UserExistsAsync(normalizedRequest.UserEmail, cancellationToken))
        {
            return CreateReservationServiceResult.NotFound(
                $"User '{normalizedRequest.UserEmail}' was not found.");
        }

        if (!await reservationRepository.PassengerExistsAsync(normalizedRequest.PassengerId, cancellationToken))
        {
            return CreateReservationServiceResult.NotFound(
                $"Passenger '{normalizedRequest.PassengerId}' was not found.");
        }

        if (await reservationRepository.PaymentReferenceExistsAsync(
            normalizedRequest.PaymentReference,
            cancellationToken))
        {
            return CreateReservationServiceResult.Conflict(
                $"Payment reference '{normalizedRequest.PaymentReference}' already exists.");
        }

        var reservation = await reservationRepository.CreateAsync(normalizedRequest, cancellationToken);
        return CreateReservationServiceResult.Success(reservation);
    }

    public async Task<SearchReservationsServiceResult> SearchAsync(
        int? reservationId,
        string? passengerId,
        string? name,
        CancellationToken cancellationToken = default)
    {
        var normalizedReservationId = reservationId is > 0 ? reservationId : null;
        var normalizedPassengerId = string.IsNullOrWhiteSpace(passengerId) ? null : passengerId.Trim();
        var normalizedName = string.IsNullOrWhiteSpace(name) ? null : name.Trim();

        if (normalizedReservationId is null && normalizedPassengerId is null && normalizedName is null)
        {
            return SearchReservationsServiceResult.ValidationError(
                "Query parameter 'reservationId', 'passengerId' or 'name' is required.");
        }

        var reservations = await reservationRepository.SearchAsync(
            normalizedReservationId,
            normalizedPassengerId,
            normalizedName,
            cancellationToken);

        return SearchReservationsServiceResult.Success(reservations);
    }

    // Validaciones que dependen solo del JSON recibido.
    private static string? ValidateCreateReservationRequest(CreateReservationRequest request)
    {
        if (request.ItineraryId <= 0)
        {
            return "Itinerary id is required and must be greater than 0.";
        }

        if (string.IsNullOrWhiteSpace(request.UserEmail))
        {
            return "User email is required.";
        }

        if (string.IsNullOrWhiteSpace(request.PassengerId))
        {
            return "Passenger id is required.";
        }

        if (string.IsNullOrWhiteSpace(request.State))
        {
            return "State is required.";
        }

        var state = request.State.Trim().ToUpperInvariant();
        if (state is not "PAID" and not "CHECKED")
        {
            return "State must be PAID or CHECKED.";
        }

        if (string.IsNullOrWhiteSpace(request.PaymentReference))
        {
            return "Payment reference is required.";
        }

        return null;
    }

    // Normaliza valores para guardar y comparar de forma consistente con la base.
    private static CreateReservationRequest NormalizeCreateReservationRequest(CreateReservationRequest request)
    {
        return new CreateReservationRequest
        {
            ItineraryId = request.ItineraryId,
            UserEmail = request.UserEmail.Trim().ToLowerInvariant(),
            PassengerId = request.PassengerId.Trim(),
            State = request.State.Trim().ToUpperInvariant(),
            PaymentReference = request.PaymentReference.Trim()
        };
    }
}
