using System.Text.RegularExpressions;
using TECAir.Application.DTOs.Reservations;
using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para reservaciones.
// Una reservacion en TECAir existe solo si ya tiene pago asociado.
public class ReservationService(IReservationRepository reservationRepository) : IReservationService
{
    private static readonly Regex PassengerIdRegex = new(
        "^[A-Za-z0-9-]+$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

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

        var itineraryState = await reservationRepository.GetItineraryStateAsync(
            normalizedRequest.ItineraryId,
            cancellationToken);
        if (itineraryState != "PUBLIC")
        {
            return CreateReservationServiceResult.ValidationError(
                "Reservations can only be created for PUBLIC itineraries.");
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

        var availability = await reservationRepository.GetItineraryFlightAvailabilityAsync(
            normalizedRequest.ItineraryId,
            cancellationToken);
        if (!CanReservePassengers(availability, passengers: 1))
        {
            if (ShouldCloseItinerary(availability))
            {
                // Sin triggers ni transacciones por restriccion del proyecto:
                // el backend marca CLOSED cuando detecta vuelos cerrados o llenos.
                await reservationRepository.CloseItineraryAsync(
                    normalizedRequest.ItineraryId,
                    cancellationToken);
            }

            return CreateReservationServiceResult.Conflict(
                "The selected itinerary does not have enough available seats.");
        }

        var reservation = await reservationRepository.CreateAsync(normalizedRequest, cancellationToken);

        var updatedAvailability = await reservationRepository.GetItineraryFlightAvailabilityAsync(
            normalizedRequest.ItineraryId,
            cancellationToken);
        if (ShouldCloseItinerary(updatedAvailability))
        {
            // La reservacion consume un asiento en cada vuelo interno del itinerario.
            await reservationRepository.CloseItineraryAsync(normalizedRequest.ItineraryId, cancellationToken);
        }

        return CreateReservationServiceResult.Success(reservation);
    }

    public async Task<SearchReservationsServiceResult> SearchAsync(
        int? reservationId,
        string? passengerId,
        string? name,
        CancellationToken cancellationToken = default)
    {
        var normalizedReservationId = reservationId is > 0 ? reservationId : null;
        var normalizedPassengerId = string.IsNullOrWhiteSpace(passengerId) ? null : NormalizePassengerId(passengerId);
        var normalizedName = string.IsNullOrWhiteSpace(name) ? null : name.Trim();

        if (normalizedReservationId is null && normalizedPassengerId is null && normalizedName is null)
        {
            return SearchReservationsServiceResult.ValidationError(
                "Query parameter 'reservationId', 'passengerId', 'name' or 'passengerName' is required.");
        }

        var reservations = await reservationRepository.SearchAsync(
            normalizedReservationId,
            normalizedPassengerId,
            normalizedName,
            cancellationToken);

        return SearchReservationsServiceResult.Success(reservations);
    }

    public async Task<SearchReservationsServiceResult> GetByUserEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return SearchReservationsServiceResult.ValidationError("User email is required.");
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        if (!await reservationRepository.UserExistsAsync(normalizedEmail, cancellationToken))
        {
            return SearchReservationsServiceResult.NotFound(
                $"User '{normalizedEmail}' was not found.");
        }

        var reservations = await reservationRepository.GetByUserEmailAsync(
            normalizedEmail,
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

        var passengerId = request.PassengerId.Trim();
        if (passengerId.Length is < 5 or > 30)
        {
            return "Passenger id must be between 5 and 30 characters.";
        }

        if (!PassengerIdRegex.IsMatch(passengerId))
        {
            return "Passenger id can only contain letters, numbers and hyphens.";
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
            PassengerId = NormalizePassengerId(request.PassengerId),
            State = request.State.Trim().ToUpperInvariant(),
            PaymentReference = request.PaymentReference.Trim()
        };
    }

    private static string NormalizePassengerId(string passengerId)
    {
        return passengerId.Trim().ToUpperInvariant();
    }

    private static bool CanReservePassengers(
        IReadOnlyList<ItineraryFlightAvailabilityData> flights,
        int passengers)
    {
        if (flights.Count == 0)
        {
            return false;
        }

        // La creacion vuelve a validar disponibilidad; el GET de disponibilidad
        // solo ayuda al frontend y no se considera fuente de verdad.
        return flights.All(IsReservableFlight) &&
            flights.Min(flight => flight.AvailableSeats) >= passengers;
    }

    private static bool IsReservableFlight(ItineraryFlightAvailabilityData flight)
    {
        return (flight.FlightState is "OPEN" or "UPCOMING") && flight.AvailableSeats > 0;
    }

    private static bool ShouldCloseItinerary(IReadOnlyList<ItineraryFlightAvailabilityData> flights)
    {
        return flights.Any(flight => flight.FlightState == "CLOSED" || flight.AvailableSeats <= 0);
    }
}
