using TECAir.Application.DTOs.CheckIns;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para check-in.
// Valida referencias, asiento disponible y coherencia con el vuelo antes de persistir.
public class CheckInService(ICheckInRepository checkInRepository) : ICheckInService
{
    public Task<CheckInResponse?> GetByConfirmationNumberAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default)
    {
        if (confirmationNumber <= 0)
        {
            return Task.FromResult<CheckInResponse?>(null);
        }

        return checkInRepository.GetByConfirmationNumberAsync(confirmationNumber, cancellationToken);
    }

    public async Task<GetCheckInsByReservationServiceResult> GetByReservationIdAsync(
        int reservationId,
        CancellationToken cancellationToken = default)
    {
        if (reservationId <= 0)
        {
            return GetCheckInsByReservationServiceResult.NotFound("Reservation was not found.");
        }

        if (!await checkInRepository.ReservationExistsAsync(reservationId, cancellationToken))
        {
            return GetCheckInsByReservationServiceResult.NotFound(
                $"Reservation '{reservationId}' was not found.");
        }

        var checkIns = await checkInRepository.GetByReservationIdAsync(reservationId, cancellationToken);
        return GetCheckInsByReservationServiceResult.Success(checkIns);
    }

    public async Task<CreateCheckInServiceResult> CreateAsync(
        CreateCheckInRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCreateCheckInRequest(request);
        if (validationError is not null)
        {
            return CreateCheckInServiceResult.ValidationError(validationError);
        }

        var normalizedRequest = NormalizeCreateCheckInRequest(request);

        if (!await checkInRepository.ReservationExistsAsync(normalizedRequest.ReservationId, cancellationToken))
        {
            return CreateCheckInServiceResult.NotFound(
                $"Reservation '{normalizedRequest.ReservationId}' was not found.");
        }

        if (!await checkInRepository.ItineraryFlightExistsAsync(normalizedRequest.ItineraryFlightId, cancellationToken))
        {
            return CreateCheckInServiceResult.NotFound(
                $"Itinerary flight '{normalizedRequest.ItineraryFlightId}' was not found.");
        }

        if (!await checkInRepository.SeatExistsAsync(
            normalizedRequest.PlanePlate,
            normalizedRequest.SeatNumber,
            cancellationToken))
        {
            return CreateCheckInServiceResult.NotFound(
                $"Seat '{normalizedRequest.SeatNumber}' was not found for plane '{normalizedRequest.PlanePlate}'.");
        }

        if (!await checkInRepository.ItineraryFlightBelongsToReservationItineraryAsync(
            normalizedRequest.ReservationId,
            normalizedRequest.ItineraryFlightId,
            cancellationToken))
        {
            return CreateCheckInServiceResult.Conflict(
                "The itinerary flight does not belong to the reservation itinerary.");
        }

        if (!await checkInRepository.SeatBelongsToFlightPlaneAsync(
            normalizedRequest.ItineraryFlightId,
            normalizedRequest.PlanePlate,
            cancellationToken))
        {
            return CreateCheckInServiceResult.Conflict(
                "The seat does not belong to the plane assigned to that flight.");
        }

        if (await checkInRepository.SeatAlreadyTakenAsync(
            normalizedRequest.ItineraryFlightId,
            normalizedRequest.PlanePlate,
            normalizedRequest.SeatNumber,
            cancellationToken: cancellationToken))
        {
            return CreateCheckInServiceResult.Conflict(
                "The seat is already taken for that itinerary flight.");
        }

        if (await checkInRepository.ReservationAlreadyCheckedForFlightAsync(
            normalizedRequest.ReservationId,
            normalizedRequest.ItineraryFlightId,
            cancellationToken))
        {
            return CreateCheckInServiceResult.Conflict(
                "The reservation already has check-in for that itinerary flight.");
        }

        var checkIn = await checkInRepository.CreateAsync(normalizedRequest, cancellationToken);
        return CreateCheckInServiceResult.Success(checkIn);
    }

    public async Task<UpdateCheckInServiceResult> UpdateSeatAsync(
        int confirmationNumber,
        UpdateCheckInSeatRequest request,
        CancellationToken cancellationToken = default)
    {
        if (confirmationNumber <= 0)
        {
            return UpdateCheckInServiceResult.NotFound("Check-in was not found.");
        }

        var validationError = ValidateUpdateCheckInSeatRequest(request);
        if (validationError is not null)
        {
            return UpdateCheckInServiceResult.ValidationError(validationError);
        }

        var currentCheckIn = await checkInRepository.GetByConfirmationNumberAsync(
            confirmationNumber,
            cancellationToken);
        if (currentCheckIn is null)
        {
            return UpdateCheckInServiceResult.NotFound(
                $"Check-in '{confirmationNumber}' was not found.");
        }

        var normalizedRequest = NormalizeUpdateCheckInSeatRequest(request);

        if (!await checkInRepository.SeatExistsAsync(
            normalizedRequest.PlanePlate,
            normalizedRequest.SeatNumber,
            cancellationToken))
        {
            return UpdateCheckInServiceResult.NotFound(
                $"Seat '{normalizedRequest.SeatNumber}' was not found for plane '{normalizedRequest.PlanePlate}'.");
        }

        if (!await checkInRepository.SeatBelongsToFlightPlaneAsync(
            currentCheckIn.ItineraryFlightId,
            normalizedRequest.PlanePlate,
            cancellationToken))
        {
            return UpdateCheckInServiceResult.Conflict(
                "The seat does not belong to the plane assigned to that flight.");
        }

        if (await checkInRepository.SeatAlreadyTakenAsync(
            currentCheckIn.ItineraryFlightId,
            normalizedRequest.PlanePlate,
            normalizedRequest.SeatNumber,
            confirmationNumber,
            cancellationToken))
        {
            return UpdateCheckInServiceResult.Conflict(
                "The seat is already taken for that itinerary flight.");
        }

        var checkIn = await checkInRepository.UpdateSeatAsync(
            confirmationNumber,
            normalizedRequest,
            cancellationToken);
        return UpdateCheckInServiceResult.Success(checkIn);
    }

    public async Task<DeleteCheckInServiceResult> DeleteAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default)
    {
        if (confirmationNumber <= 0)
        {
            return DeleteCheckInServiceResult.NotFound("Check-in was not found.");
        }

        if (!await checkInRepository.CheckInExistsAsync(confirmationNumber, cancellationToken))
        {
            return DeleteCheckInServiceResult.NotFound(
                $"Check-in '{confirmationNumber}' was not found.");
        }

        await checkInRepository.DeleteAsync(confirmationNumber, cancellationToken);
        return DeleteCheckInServiceResult.Success();
    }

    private static string? ValidateCreateCheckInRequest(CreateCheckInRequest request)
    {
        if (request.ReservationId <= 0)
        {
            return "Reservation id is required and must be greater than 0.";
        }

        if (request.ItineraryFlightId <= 0)
        {
            return "Itinerary flight id is required and must be greater than 0.";
        }

        return ValidateSeatData(request.PlanePlate, request.SeatNumber);
    }

    private static string? ValidateUpdateCheckInSeatRequest(UpdateCheckInSeatRequest request)
    {
        return ValidateSeatData(request.PlanePlate, request.SeatNumber);
    }

    private static string? ValidateSeatData(string planePlate, string seatNumber)
    {
        if (string.IsNullOrWhiteSpace(planePlate))
        {
            return "Plane plate is required.";
        }

        if (string.IsNullOrWhiteSpace(seatNumber))
        {
            return "Seat number is required.";
        }

        return null;
    }

    private static CreateCheckInRequest NormalizeCreateCheckInRequest(CreateCheckInRequest request)
    {
        return new CreateCheckInRequest
        {
            ReservationId = request.ReservationId,
            ItineraryFlightId = request.ItineraryFlightId,
            PlanePlate = NormalizePlanePlate(request.PlanePlate),
            SeatNumber = NormalizeSeatNumber(request.SeatNumber)
        };
    }

    private static UpdateCheckInSeatRequest NormalizeUpdateCheckInSeatRequest(UpdateCheckInSeatRequest request)
    {
        return new UpdateCheckInSeatRequest
        {
            PlanePlate = NormalizePlanePlate(request.PlanePlate),
            SeatNumber = NormalizeSeatNumber(request.SeatNumber)
        };
    }

    private static string NormalizePlanePlate(string planePlate)
    {
        return planePlate.Trim();
    }

    private static string NormalizeSeatNumber(string seatNumber)
    {
        return seatNumber.Trim().ToUpperInvariant();
    }
}
