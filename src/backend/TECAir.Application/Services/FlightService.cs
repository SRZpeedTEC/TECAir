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

    public Task<IReadOnlyList<AvailableFlightResponse>> GetAvailableAsync(
        string? originCode = null,
        string? destinationCode = null,
        int? flightId = null,
        CancellationToken cancellationToken = default)
    {
        return flightRepository.GetAvailableAsync(
            NormalizeOptionalCode(originCode),
            NormalizeOptionalCode(destinationCode),
            flightId,
            cancellationToken);
    }

    // Actualiza un vuelo existente sin permitir que el body cambie el flight_id.
    public async Task<UpdateFlightServiceResult> UpdateAsync(
        int flightId,
        UpdateFlightRequest request,
        CancellationToken cancellationToken = default)
    {
        if (flightId <= 0)
        {
            return UpdateFlightServiceResult.ValidationError("Flight id must be greater than 0.");
        }

        var validationError = ValidateUpdateFlightRequest(request);
        if (validationError is not null)
        {
            return UpdateFlightServiceResult.ValidationError(validationError);
        }

        var normalizedRequest = NormalizeUpdateFlightRequest(request);

        if (!await flightRepository.FlightExistsAsync(flightId, cancellationToken))
        {
            return UpdateFlightServiceResult.NotFound($"Flight '{flightId}' was not found.");
        }

        if (!await flightRepository.PlaneExistsAsync(normalizedRequest.PlanePlate, cancellationToken))
        {
            return UpdateFlightServiceResult.NotFound($"Plane '{normalizedRequest.PlanePlate}' was not found.");
        }

        if (!await flightRepository.AirportExistsAsync(normalizedRequest.AirportDepartsFromId, cancellationToken))
        {
            return UpdateFlightServiceResult.NotFound(
                $"Departure airport '{normalizedRequest.AirportDepartsFromId}' was not found.");
        }

        if (!await flightRepository.AirportExistsAsync(normalizedRequest.AirportArrivesToId, cancellationToken))
        {
            return UpdateFlightServiceResult.NotFound(
                $"Arrival airport '{normalizedRequest.AirportArrivesToId}' was not found.");
        }

        if (await flightRepository.PlaneHasOverlappingFlightExceptAsync(
            flightId,
            normalizedRequest.PlanePlate,
            normalizedRequest.DepartureDatetime,
            normalizedRequest.ArrivalDatetime,
            cancellationToken))
        {
            return UpdateFlightServiceResult.Conflict(
                "The selected plane is already assigned to another flight during that time range.");
        }

        if (!string.IsNullOrWhiteSpace(normalizedRequest.Gate) &&
            await flightRepository.GateHasDepartureConflictExceptAsync(
                flightId,
                normalizedRequest.AirportDepartsFromId,
                normalizedRequest.Gate,
                normalizedRequest.DepartureDatetime,
                cancellationToken))
        {
            return UpdateFlightServiceResult.Conflict(
                "The selected gate is already assigned to another flight at the same departure time.");
        }

        var flight = await flightRepository.UpdateAsync(flightId, normalizedRequest, cancellationToken);
        return UpdateFlightServiceResult.Success(flight);
    }

    // Actualiza solo el estado y valida las transiciones permitidas.
    public async Task<UpdateFlightServiceResult> UpdateStateAsync(
        int flightId,
        UpdateFlightStateRequest request,
        CancellationToken cancellationToken = default)
    {
        if (flightId <= 0)
        {
            return UpdateFlightServiceResult.ValidationError("Flight id must be greater than 0.");
        }

        var validationError = ValidateState(request.State);
        if (validationError is not null)
        {
            return UpdateFlightServiceResult.ValidationError(validationError);
        }

        var newState = NormalizeState(request.State);
        var currentState = await flightRepository.GetFlightStateAsync(flightId, cancellationToken);
        if (currentState is null)
        {
            return UpdateFlightServiceResult.NotFound($"Flight '{flightId}' was not found.");
        }

        validationError = ValidateStateTransition(currentState, newState);
        if (validationError is not null)
        {
            return UpdateFlightServiceResult.ValidationError(validationError);
        }

        var flight = await flightRepository.UpdateStateAsync(flightId, newState, cancellationToken);
        return UpdateFlightServiceResult.Success(flight);
    }

    // Borra vuelos solo cuando no estan conectados a itinerarios vendibles.
    public async Task<DeleteFlightServiceResult> DeleteAsync(
        int flightId,
        CancellationToken cancellationToken = default)
    {
        if (flightId <= 0 || !await flightRepository.FlightExistsAsync(flightId, cancellationToken))
        {
            return DeleteFlightServiceResult.NotFound($"Flight '{flightId}' was not found.");
        }

        if (await flightRepository.FlightIsUsedInItineraryAsync(flightId, cancellationToken))
        {
            // Un vuelo usado en itinerarios ya forma parte de una ruta vendible;
            // borrarlo romperia la historia de rutas y posibles ventas.
            return DeleteFlightServiceResult.Conflict(
                "The flight cannot be deleted because it is already used in an itinerary.");
        }

        await flightRepository.DeleteAsync(flightId, cancellationToken);
        return DeleteFlightServiceResult.Success();
    }

    // Reglas que se pueden validar solo con el contenido del request.
    private static string? ValidateCreateFlightRequest(CreateFlightRequest request)
    {
        return ValidateFlightData(
            request.PlanePlate,
            request.AirportDepartsFromId,
            request.AirportArrivesToId,
            request.State,
            request.Gate,
            request.DepartureDatetime,
            request.ArrivalDatetime,
            allowEmptyState: true);
    }

    private static string? ValidateUpdateFlightRequest(UpdateFlightRequest request)
    {
        return ValidateFlightData(
            request.PlanePlate,
            request.AirportDepartsFromId,
            request.AirportArrivesToId,
            request.State,
            request.Gate,
            request.DepartureDatetime,
            request.ArrivalDatetime,
            allowEmptyState: false);
    }

    private static string? ValidateFlightData(
        string planePlate,
        string departureAirportId,
        string arrivalAirportId,
        string stateValue,
        string? gate,
        DateTime departureDatetime,
        DateTime arrivalDatetime,
        bool allowEmptyState)
    {
        if (string.IsNullOrWhiteSpace(planePlate))
        {
            return "Plane plate is required.";
        }

        if (string.IsNullOrWhiteSpace(departureAirportId))
        {
            return "Departure airport is required.";
        }

        if (string.IsNullOrWhiteSpace(arrivalAirportId))
        {
            return "Arrival airport is required.";
        }

        if (!allowEmptyState && string.IsNullOrWhiteSpace(stateValue))
        {
            return "State is required.";
        }

        if (departureDatetime == default)
        {
            return "Departure datetime is required.";
        }

        if (arrivalDatetime == default)
        {
            return "Arrival datetime is required.";
        }

        var departureAirport = departureAirportId.Trim().ToUpperInvariant();
        var arrivalAirport = arrivalAirportId.Trim().ToUpperInvariant();
        if (departureAirport == arrivalAirport)
        {
            return "Departure and arrival airports must be different.";
        }

        if (arrivalDatetime <= departureDatetime)
        {
            return "Arrival datetime must be after departure datetime.";
        }

        var state = stateValue.Trim().ToUpperInvariant();
        if (!string.IsNullOrWhiteSpace(state) && state is not "UPCOMING" and not "OPEN" and not "CLOSED")
        {
            return "State must be UPCOMING, OPEN or CLOSED.";
        }

        if (gate is not null && string.IsNullOrWhiteSpace(gate))
        {
            return "Gate cannot be empty.";
        }

        return null;
    }

    private static string? ValidateState(string stateValue)
    {
        if (string.IsNullOrWhiteSpace(stateValue))
        {
            return "State is required.";
        }

        var state = NormalizeState(stateValue);
        if (state is not "UPCOMING" and not "OPEN" and not "CLOSED")
        {
            return "State must be UPCOMING, OPEN or CLOSED.";
        }

        return null;
    }

    private static string? ValidateStateTransition(string currentState, string newState)
    {
        if (currentState == newState)
        {
            return null;
        }

        return (currentState, newState) switch
        {
            ("UPCOMING", "OPEN") => null,
            ("UPCOMING", "CLOSED") => null,
            ("OPEN", "CLOSED") => null,
            ("CLOSED", _) => "Closed flights cannot be reopened or moved back to upcoming.",
            _ => $"Flight state cannot change from {currentState} to {newState}."
        };
    }

    // Normaliza valores de entrada para que las comparaciones y el guardado sean consistentes.
    private static CreateFlightRequest NormalizeCreateFlightRequest(CreateFlightRequest request)
    {
        return new CreateFlightRequest
        {
            PlanePlate = request.PlanePlate.Trim(),
            AirportDepartsFromId = request.AirportDepartsFromId.Trim().ToUpperInvariant(),
            AirportArrivesToId = request.AirportArrivesToId.Trim().ToUpperInvariant(),
            State = string.IsNullOrWhiteSpace(request.State)
                ? "UPCOMING"
                : request.State.Trim().ToUpperInvariant(),
            Gate = request.Gate?.Trim(),
            DepartureDatetime = request.DepartureDatetime,
            ArrivalDatetime = request.ArrivalDatetime
        };
    }

    private static UpdateFlightRequest NormalizeUpdateFlightRequest(UpdateFlightRequest request)
    {
        return new UpdateFlightRequest
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

    private static string NormalizeState(string state)
    {
        return state.Trim().ToUpperInvariant();
    }

    private static string? NormalizeOptionalCode(string? code)
    {
        return string.IsNullOrWhiteSpace(code)
            ? null
            : code.Trim().ToUpperInvariant();
    }
}
