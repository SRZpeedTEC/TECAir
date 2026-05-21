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

        var airportConnection = await flightRepository.GetAirportConnectionAsync(
            normalizedRequest.AirportDepartsFromId,
            normalizedRequest.AirportArrivesToId,
            cancellationToken);
        if (airportConnection is null)
        {
            return CreateFlightServiceResult.NotFound(
                $"There is no configured airport connection for {normalizedRequest.AirportDepartsFromId} to {normalizedRequest.AirportArrivesToId}.");
        }

        // airport_connection es una tabla interna de referencia: los endpoints de vuelos
        // calculan la llegada y las millas sin exponer CRUD publico para esa tabla.
        var calculatedArrivalDatetime = normalizedRequest.DepartureDatetime
            .AddMinutes(airportConnection.EstimatedDurationMinutes);
        var calculatedMiles = airportConnection.DistanceMiles;

        if (await flightRepository.PlaneHasOverlappingFlightAsync(
            normalizedRequest.PlanePlate,
            normalizedRequest.DepartureDatetime,
            calculatedArrivalDatetime,
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

        var flight = await flightRepository.CreateAsync(
            normalizedRequest,
            calculatedArrivalDatetime,
            calculatedMiles,
            cancellationToken);
        return CreateFlightServiceResult.Success(flight);
    }

    public Task<IReadOnlyList<OpenFlightResponse>> GetByDepartureAirportAndStateAsync(
        string departureCode,
        string state,
        CancellationToken cancellationToken = default)
    {
        // El codigo y el estado se normalizan para comparar de forma consistente con la base.
        return flightRepository.GetByDepartureAirportAndStateAsync(
            departureCode.Trim().ToUpperInvariant(),
            state.Trim().ToUpperInvariant(),
            cancellationToken);
    }

    // Busca vuelos por estado y ruta completa. La validacion de parametros vacios
    // se hace en el controller; aqui solo normalizamos antes de consultar la base.
    public Task<IReadOnlyList<OpenFlightResponse>> SearchByRouteAndStateAsync(
        string state,
        string departureCode,
        string arrivalCode,
        CancellationToken cancellationToken = default)
    {
        return flightRepository.SearchByRouteAndStateAsync(
            state.Trim().ToUpperInvariant(),
            departureCode.Trim().ToUpperInvariant(),
            arrivalCode.Trim().ToUpperInvariant(),
            cancellationToken);
    }

    // Aplica un cambio de estado validando que sea una transicion permitida.
    // El flujo solo expone UPCOMING -> OPEN (apertura) y OPEN -> CLOSED (cierre).
    public async Task<TransitionFlightStateServiceResult> TransitionStateAsync(
        int flightId,
        UpdateFlightStateRequest request,
        CancellationToken cancellationToken = default)
    {
        if (flightId <= 0)
        {
            return TransitionFlightStateServiceResult.ValidationError("Flight id must be greater than 0.");
        }

        if (string.IsNullOrWhiteSpace(request.State))
        {
            return TransitionFlightStateServiceResult.ValidationError("State is required.");
        }

        var targetState = request.State.Trim().ToUpperInvariant();
        if (targetState is not "OPEN" and not "CLOSED")
        {
            return TransitionFlightStateServiceResult.ValidationError("State must be OPEN or CLOSED.");
        }

        var currentState = await flightRepository.GetStateAsync(flightId, cancellationToken);
        if (currentState is null)
        {
            return TransitionFlightStateServiceResult.NotFound($"Flight '{flightId}' was not found.");
        }

        // Reglas del flujo: cualquier otra combinacion se rechaza como conflicto
        // para que el admin no pueda saltarse el ciclo desde la API.
        var transitionAllowed =
            (currentState == "UPCOMING" && targetState == "OPEN") ||
            (currentState == "OPEN" && targetState == "CLOSED");

        if (!transitionAllowed)
        {
            return TransitionFlightStateServiceResult.Conflict(
                $"Transition from '{currentState}' to '{targetState}' is not allowed.");
        }

        var flight = await flightRepository.UpdateStateAsync(flightId, targetState, cancellationToken);
        return TransitionFlightStateServiceResult.Success(flight);
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

        var airportConnection = await flightRepository.GetAirportConnectionAsync(
            normalizedRequest.AirportDepartsFromId,
            normalizedRequest.AirportArrivesToId,
            cancellationToken);
        if (airportConnection is null)
        {
            return UpdateFlightServiceResult.NotFound(
                $"There is no configured airport connection for {normalizedRequest.AirportDepartsFromId} to {normalizedRequest.AirportArrivesToId}.");
        }

        // flight.miles guarda el valor historico aplicado al vuelo en el momento
        // de crearlo o actualizarlo, aunque la referencia cambie despues.
        var calculatedArrivalDatetime = normalizedRequest.DepartureDatetime
            .AddMinutes(airportConnection.EstimatedDurationMinutes);
        var calculatedMiles = airportConnection.DistanceMiles;

        if (await flightRepository.PlaneHasOverlappingFlightExceptAsync(
            flightId,
            normalizedRequest.PlanePlate,
            normalizedRequest.DepartureDatetime,
            calculatedArrivalDatetime,
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

        var flight = await flightRepository.UpdateAsync(
            flightId,
            normalizedRequest,
            calculatedArrivalDatetime,
            calculatedMiles,
            cancellationToken);
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
            allowEmptyState: false);
    }

    private static string? ValidateFlightData(
        string planePlate,
        string departureAirportId,
        string arrivalAirportId,
        string stateValue,
        string? gate,
        DateTime departureDatetime,
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

        var departureAirport = departureAirportId.Trim().ToUpperInvariant();
        var arrivalAirport = arrivalAirportId.Trim().ToUpperInvariant();
        if (departureAirport == arrivalAirport)
        {
            return "Departure and arrival airports must be different.";
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
            DepartureDatetime = request.DepartureDatetime
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
            DepartureDatetime = request.DepartureDatetime
        };
    }
}
