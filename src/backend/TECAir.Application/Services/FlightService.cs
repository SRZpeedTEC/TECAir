using TECAir.Application.DTOs.Flights;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// El servicio concentra las reglas del caso de uso de vuelos.
// No conoce HTTP ni SQL: valida la solicitud y pide al repositorio los datos
// necesarios para tomar decisiones de negocio.
public class FlightService(IFlightRepository flightRepository) : IFlightService
{
    // Crea un vuelo validando primero datos propios del request, referencias
    // existentes y conflictos de agenda de avion o puerta.
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

        if (await flightRepository.PlaneHasOverlappingFlightAsync(
            normalizedRequest.PlanePlate,
            normalizedRequest.DepartureDatetime,
            normalizedRequest.ArrivalDatetime,
            cancellationToken))
        {
            return CreateFlightServiceResult.Conflict(
                "The selected plane is already assigned to another flight during that time range.");
        }

        // Si no se asigno puerta, no hay recurso fisico que reservar en el aeropuerto.
        if (!string.IsNullOrWhiteSpace(normalizedRequest.Gate) &&
            await flightRepository.GateHasDepartureConflictAsync(
                normalizedRequest.AirportDepartsFromId,
                normalizedRequest.Gate,
                normalizedRequest.DepartureDatetime,
                cancellationToken))
        {
            return CreateFlightServiceResult.Conflict(
                "The selected gate is already assigned to another flight at the same departure time.");
        }

        var flight = await flightRepository.CreateAsync(normalizedRequest, cancellationToken);
        return CreateFlightServiceResult.Success(flight);
    }

    public Task<IReadOnlyList<OpenFlightResponse>> GetOpenByDepartureAirportAsync(
        string departureCode,
        CancellationToken cancellationToken = default)
    {
        // El codigo se normaliza para comparar de forma consistente con la base.
        return flightRepository.GetOpenByDepartureAirportAsync(
            departureCode.Trim().ToUpperInvariant(),
            cancellationToken);
    }

    // Reglas que se pueden validar solo con el contenido del request.
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

    // Normaliza valores de entrada para que las comparaciones y el guardado sean consistentes.
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
