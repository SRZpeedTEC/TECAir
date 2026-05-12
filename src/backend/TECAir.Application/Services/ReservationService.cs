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

        // La silla en reservation es solo preferencia del pasajero.
        // El asiento real de abordaje se asigna despues en check_in.
        if (normalizedRequest.PlanePlate is not null &&
            normalizedRequest.SeatNumber is not null &&
            !await reservationRepository.SeatExistsAsync(
                normalizedRequest.PlanePlate,
                normalizedRequest.SeatNumber,
                cancellationToken))
        {
            return CreateReservationServiceResult.NotFound(
                $"Preferred seat '{normalizedRequest.SeatNumber}' was not found for plane '{normalizedRequest.PlanePlate}'.");
        }

        var reservation = await reservationRepository.CreateAsync(normalizedRequest, cancellationToken);
        return CreateReservationServiceResult.Success(reservation);
    }

    public async Task<SearchReservationsServiceResult> SearchAsync(
        string? passengerId,
        string? name,
        CancellationToken cancellationToken = default)
    {
        var normalizedPassengerId = string.IsNullOrWhiteSpace(passengerId) ? null : passengerId.Trim();
        var normalizedName = string.IsNullOrWhiteSpace(name) ? null : name.Trim();

        if (normalizedPassengerId is null && normalizedName is null)
        {
            return SearchReservationsServiceResult.ValidationError(
                "Query parameter 'passengerId' or 'name' is required.");
        }

        var reservations = await reservationRepository.SearchAsync(
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

        var hasPlanePlate = !string.IsNullOrWhiteSpace(request.PlanePlate);
        var hasSeatNumber = !string.IsNullOrWhiteSpace(request.SeatNumber);
        if (hasPlanePlate != hasSeatNumber)
        {
            return "Plane_plate and Seat_number must be provided together.";
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
            PaymentReference = request.PaymentReference.Trim(),
            PlanePlate = string.IsNullOrWhiteSpace(request.PlanePlate)
                ? null
                : request.PlanePlate.Trim(),
            SeatNumber = string.IsNullOrWhiteSpace(request.SeatNumber)
                ? null
                : request.SeatNumber.Trim().ToUpperInvariant()
        };
    }
}
