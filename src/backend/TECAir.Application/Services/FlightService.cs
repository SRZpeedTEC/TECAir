using TECAir.Application.DTOs.Flights;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

public class FlightService(IFlightRepository flightRepository) : IFlightService
{
    public async Task<CreateFlightServiceResult> CreateAsync(
        CreateFlightRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCreateFlightRequest(request);
        if (validationError is not null)
        {
            return CreateFlightServiceResult.ValidationError(validationError);
        }

        var normalizedRequest = NormalizeCreateFlightRequest(request);

        if (!await flightRepository.PlaneExistsAsync(normalizedRequest.PlanePlate, cancellationToken))
        {
            return CreateFlightServiceResult.NotFound($"Plane '{normalizedRequest.PlanePlate}' was not found.");
        }

        if (!await flightRepository.AirportExistsAsync(normalizedRequest.AirportDepartsFromId, cancellationToken))
        {
            return CreateFlightServiceResult.NotFound(
                $"Departure airport '{normalizedRequest.AirportDepartsFromId}' was not found.");
        }

        if (!await flightRepository.AirportExistsAsync(normalizedRequest.AirportArrivesToId, cancellationToken))
        {
            return CreateFlightServiceResult.NotFound(
                $"Arrival airport '{normalizedRequest.AirportArrivesToId}' was not found.");
        }

        var flight = await flightRepository.CreateAsync(normalizedRequest, cancellationToken);
        return CreateFlightServiceResult.Success(flight);
    }

    public Task<IReadOnlyList<OpenFlightResponse>> GetOpenByDepartureAirportAsync(
        string departureCode,
        CancellationToken cancellationToken = default)
    {
        return flightRepository.GetOpenByDepartureAirportAsync(
            departureCode.Trim().ToUpperInvariant(),
            cancellationToken);
    }

    private static string? ValidateCreateFlightRequest(CreateFlightRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.PlanePlate))
        {
            return "Plane plate is required.";
        }

        if (string.IsNullOrWhiteSpace(request.AirportDepartsFromId))
        {
            return "Departure airport is required.";
        }

        if (string.IsNullOrWhiteSpace(request.AirportArrivesToId))
        {
            return "Arrival airport is required.";
        }

        if (string.IsNullOrWhiteSpace(request.State))
        {
            return "State is required.";
        }

        if (request.DepartureDatetime == default)
        {
            return "Departure datetime is required.";
        }

        if (request.ArrivalDatetime == default)
        {
            return "Arrival datetime is required.";
        }

        var departureAirport = request.AirportDepartsFromId.Trim().ToUpperInvariant();
        var arrivalAirport = request.AirportArrivesToId.Trim().ToUpperInvariant();
        if (departureAirport == arrivalAirport)
        {
            return "Departure and arrival airports must be different.";
        }

        if (request.ArrivalDatetime <= request.DepartureDatetime)
        {
            return "Arrival datetime must be after departure datetime.";
        }

        var state = request.State.Trim().ToUpperInvariant();
        if (state is not "OPEN" and not "CLOSED")
        {
            return "State must be OPEN or CLOSED.";
        }

        if (request.Gate is not null && string.IsNullOrWhiteSpace(request.Gate))
        {
            return "Gate cannot be empty.";
        }

        return null;
    }

    private static CreateFlightRequest NormalizeCreateFlightRequest(CreateFlightRequest request)
    {
        return new CreateFlightRequest
        {
            PlanePlate = request.PlanePlate.Trim(),
            AirportDepartsFromId = request.AirportDepartsFromId.Trim().ToUpperInvariant(),
            AirportArrivesToId = request.AirportArrivesToId.Trim().ToUpperInvariant(),
            State = request.State.Trim().ToUpperInvariant(),
            Gate = request.Gate?.Trim(),
            DepartureDatetime = request.DepartureDatetime,
            ArrivalDatetime = request.ArrivalDatetime
        };
    }
}
