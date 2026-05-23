using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para itinerarios.
// Valida reglas de negocio como duplicados, orden de vuelos y conexiones validas.
public class ItineraryService(IItineraryRepository itineraryRepository) : IItineraryService
{
    // Busqueda de cliente: los filtros son opcionales y siempre se limita a PUBLIC.
    public async Task<ItinerarySearchServiceResult> SearchAsync(
        ItinerarySearchFilters filters,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateClientSearchFilters(filters);
        if (validationError is not null)
        {
            return ItinerarySearchServiceResult.ValidationError(validationError);
        }

        var normalizedFilters = NormalizeClientSearchFilters(filters);
        var itineraries = await itineraryRepository.SearchAsync(
            normalizedFilters,
            publicOnly: true,
            cancellationToken);
        return ItinerarySearchServiceResult.Success(itineraries);
    }

    // Busqueda admin: puede devolver EDITION, PUBLIC y CLOSED con filtros opcionales.
    public async Task<ItinerarySearchServiceResult> SearchAdminAsync(
        ItinerarySearchFilters filters,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateAdminSearchFilters(filters);
        if (validationError is not null)
        {
            return ItinerarySearchServiceResult.ValidationError(validationError);
        }

        var normalizedFilters = NormalizeAdminSearchFilters(filters);
        var itineraries = await itineraryRepository.SearchAsync(
            normalizedFilters,
            publicOnly: false,
            cancellationToken);
        return ItinerarySearchServiceResult.Success(itineraries);
    }

    public Task<IReadOnlyList<ItineraryDetailsResponse>> GetAllWithPromotionsAsync(
        CancellationToken cancellationToken = default)
    {
        return itineraryRepository.GetAllWithPromotionsAsync(cancellationToken);
    }

    public Task<IReadOnlyList<ItineraryDetailsResponse>> GetPublicWithPromotionsAsync(
        CancellationToken cancellationToken = default)
    {
        return itineraryRepository.GetPublicWithPromotionsAsync(cancellationToken);
    }

    // Consulta el detalle de un itinerario por id.
    public Task<ItineraryDetailsResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        return itineraryRepository.GetByIdAsync(itineraryId, cancellationToken);
    }

    public async Task<ItineraryAvailabilityServiceResult> GetAvailabilityAsync(
        int itineraryId,
        int passengers,
        CancellationToken cancellationToken = default)
    {
        if (itineraryId <= 0)
        {
            return ItineraryAvailabilityServiceResult.ValidationError("Itinerary id must be greater than 0.");
        }

        if (passengers <= 0)
        {
            return ItineraryAvailabilityServiceResult.ValidationError("Passengers must be greater than 0.");
        }

        var itineraryState = await itineraryRepository.GetItineraryStateAsync(itineraryId, cancellationToken);
        if (itineraryState is null)
        {
            return ItineraryAvailabilityServiceResult.NotFound($"Itinerary '{itineraryId}' was not found.");
        }

        if (itineraryState != "PUBLIC")
        {
            return ItineraryAvailabilityServiceResult.Success(new ItineraryAvailabilityResponse
            {
                ItineraryId = itineraryId,
                RequestedPassengers = passengers,
                AvailableSeats = 0,
                CanReserve = false
            });
        }

        var flights = await itineraryRepository.GetItineraryFlightAvailabilityAsync(itineraryId, cancellationToken);
        var availability = BuildAvailabilityResponse(itineraryId, passengers, flights);
        return ItineraryAvailabilityServiceResult.Success(availability);
    }

    // Caso de uso "crear itinerario".
    // Valida el request, lee datos de vuelos existentes y solo crea si la secuencia es valida.
    public async Task<CreateItineraryServiceResult> CreateAsync(
        CreateItineraryRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationError = ValidateCreateItineraryRequest(request);
        if (validationError is not null)
        {
            return CreateItineraryServiceResult.ValidationError(validationError);
        }

        var duplicateError = ValidateDuplicates(request);
        if (duplicateError is not null)
        {
            return CreateItineraryServiceResult.Conflict(duplicateError);
        }

        var requestedFlightIds = request.Flights.Select(flight => flight.FlightId).ToArray();
        var databaseFlights = await itineraryRepository.GetFlightsForCreateAsync(requestedFlightIds, cancellationToken);
        var databaseFlightsById = databaseFlights.ToDictionary(flight => flight.FlightId);

        var missingFlightIds = requestedFlightIds
            .Where(flightId => !databaseFlightsById.ContainsKey(flightId))
            .Order()
            .ToArray();

        if (missingFlightIds.Length > 0)
        {
            return CreateItineraryServiceResult.NotFound(
                $"Flight ids were not found: {string.Join(", ", missingFlightIds)}.");
        }

        var normalizedState = NormalizeState(request.State);
        if (normalizedState == "CLOSED")
        {
            return CreateItineraryServiceResult.ValidationError(
                "Itineraries cannot be manually closed from itinerary management.");
        }

        var orderedFlights = request.Flights
            .OrderBy(flight => flight.FlightOrder)
            .Select(flight => new
            {
                Request = flight,
                Data = databaseFlightsById[flight.FlightId]
            })
            .ToArray();

        var itineraryValidationError = ValidateFlightSequence(
            orderedFlights.Select(flight => flight.Data).ToArray(),
            requireUpcomingFlights: normalizedState == "PUBLIC");
        if (itineraryValidationError is not null)
        {
            return CreateItineraryServiceResult.ValidationError(itineraryValidationError);
        }

        var normalizedRequest = new CreateItineraryRequest
        {
            Price = request.Price,
            State = normalizedState,
            Flights = orderedFlights
                .Select(flight => new CreateItineraryFlightRequest
                {
                    FlightId = flight.Request.FlightId,
                    FlightOrder = flight.Request.FlightOrder
                })
                .ToList()
        };

        var itinerary = await itineraryRepository.CreateAsync(normalizedRequest, cancellationToken);
        return CreateItineraryServiceResult.Success(itinerary);
    }

    // Caso de uso "actualizar itinerario".
    // En TECAir se reemplaza la lista completa porque flight_order define una ruta ordenada,
    // no un conjunto independiente de vuelos editables por separado.
    public async Task<UpdateItineraryServiceResult> UpdateAsync(
        int itineraryId,
        UpdateItineraryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (itineraryId <= 0)
        {
            return UpdateItineraryServiceResult.ValidationError("Itinerary id must be greater than 0.");
        }

        var currentState = await itineraryRepository.GetItineraryStateAsync(itineraryId, cancellationToken);
        if (currentState is null)
        {
            return UpdateItineraryServiceResult.NotFound($"Itinerary '{itineraryId}' was not found.");
        }

        var stateValidationError = ValidateItineraryState(request.State);
        if (stateValidationError is not null)
        {
            return UpdateItineraryServiceResult.ValidationError(stateValidationError);
        }

        var normalizedState = NormalizeState(request.State);
        var lifecycleError = ValidateItineraryLifecycleTransition(currentState, normalizedState);
        if (lifecycleError is not null)
        {
            return UpdateItineraryServiceResult.Conflict(lifecycleError);
        }

        var validationError = ValidateUpdateItineraryRequest(request);
        if (validationError is not null)
        {
            return UpdateItineraryServiceResult.ValidationError(validationError);
        }

        var duplicateError = ValidateDuplicates(request);
        if (duplicateError is not null)
        {
            return UpdateItineraryServiceResult.Conflict(duplicateError);
        }

        var requestedFlightIds = request.Flights.Select(flight => flight.FlightId).ToArray();
        var databaseFlights = await itineraryRepository.GetFlightsForCreateAsync(requestedFlightIds, cancellationToken);
        var databaseFlightsById = databaseFlights.ToDictionary(flight => flight.FlightId);

        var missingFlightIds = requestedFlightIds
            .Where(flightId => !databaseFlightsById.ContainsKey(flightId))
            .Order()
            .ToArray();

        if (missingFlightIds.Length > 0)
        {
            return UpdateItineraryServiceResult.NotFound(
                $"Flight ids were not found: {string.Join(", ", missingFlightIds)}.");
        }

        var orderedFlights = request.Flights
            .OrderBy(flight => flight.FlightOrder)
            .Select(flight => new
            {
                Request = flight,
                Data = databaseFlightsById[flight.FlightId]
            })
            .ToArray();

        var itineraryValidationError = ValidateFlightSequence(
            orderedFlights.Select(flight => flight.Data).ToArray(),
            requireUpcomingFlights: normalizedState == "PUBLIC");
        if (itineraryValidationError is not null)
        {
            return UpdateItineraryServiceResult.ValidationError(itineraryValidationError);
        }

        var normalizedRequest = new UpdateItineraryRequest
        {
            Price = request.Price,
            State = normalizedState,
            Flights = orderedFlights
                .Select(flight => new CreateItineraryFlightRequest
                {
                    FlightId = flight.Request.FlightId,
                    FlightOrder = flight.Request.FlightOrder
                })
                .ToList()
        };

        var itinerary = await itineraryRepository.UpdateWithFlightsAsync(
            itineraryId,
            normalizedRequest,
            cancellationToken);

        return UpdateItineraryServiceResult.Success(itinerary);
    }

    // Borra itinerarios solamente si no tienen reservaciones.
    // Una reservacion es evidencia de venta, por eso se conserva el itinerario asociado.
    public async Task<DeleteItineraryServiceResult> DeleteAsync(
        int itineraryId,
        CancellationToken cancellationToken = default)
    {
        if (itineraryId <= 0 || !await itineraryRepository.ItineraryExistsAsync(itineraryId, cancellationToken))
        {
            return DeleteItineraryServiceResult.NotFound($"Itinerary '{itineraryId}' was not found.");
        }

        if (await itineraryRepository.ItineraryHasReservationsAsync(itineraryId, cancellationToken))
        {
            return DeleteItineraryServiceResult.Conflict(
                "The itinerary cannot be deleted because it already has reservations.");
        }

        await itineraryRepository.DeleteAsync(itineraryId, cancellationToken);
        return DeleteItineraryServiceResult.Success();
    }

    // Validaciones que dependen solo del JSON recibido.
    private static string? ValidateCreateItineraryRequest(CreateItineraryRequest request)
    {
        return ValidateItineraryRequest(request.Price, request.State, request.Flights);
    }

    private static string? ValidateClientSearchFilters(ItinerarySearchFilters filters)
    {
        return ValidateStops(filters.Stops) ?? ValidateSortBy(filters.SortBy);
    }

    private static string? ValidateAdminSearchFilters(ItinerarySearchFilters filters)
    {
        if (filters.ItineraryId is <= 0)
        {
            return "Itinerary id must be greater than 0.";
        }

        if (!string.IsNullOrWhiteSpace(filters.State))
        {
            return ValidateItineraryState(filters.State);
        }

        return null;
    }

    private static string? ValidateStops(string? stops)
    {
        if (string.IsNullOrWhiteSpace(stops))
        {
            return null;
        }

        var normalizedStops = stops.Trim().ToLowerInvariant();
        if (normalizedStops is not "all" and not "direct" and not "with_stops")
        {
            return "Stops must be all, direct or with_stops.";
        }

        return null;
    }

    private static string? ValidateSortBy(string? sortBy)
    {
        if (string.IsNullOrWhiteSpace(sortBy))
        {
            return null;
        }

        var normalizedSortBy = sortBy.Trim().ToLowerInvariant();
        if (normalizedSortBy is not "price" and not "duration")
        {
            return "SortBy must be price or duration.";
        }

        return null;
    }

    private static ItinerarySearchFilters NormalizeClientSearchFilters(ItinerarySearchFilters filters)
    {
        return new ItinerarySearchFilters
        {
            DepartureCode = NormalizeAirportCodeOrNull(filters.DepartureCode),
            ArrivalCode = NormalizeAirportCodeOrNull(filters.ArrivalCode),
            DepartureDate = filters.DepartureDate,
            Stops = string.IsNullOrWhiteSpace(filters.Stops)
                ? "all"
                : filters.Stops.Trim().ToLowerInvariant(),
            SortBy = string.IsNullOrWhiteSpace(filters.SortBy)
                ? null
                : filters.SortBy.Trim().ToLowerInvariant()
        };
    }

    private static ItinerarySearchFilters NormalizeAdminSearchFilters(ItinerarySearchFilters filters)
    {
        return new ItinerarySearchFilters
        {
            ItineraryId = filters.ItineraryId,
            DepartureCode = NormalizeAirportCodeOrNull(filters.DepartureCode),
            ArrivalCode = NormalizeAirportCodeOrNull(filters.ArrivalCode),
            State = string.IsNullOrWhiteSpace(filters.State)
                ? null
                : NormalizeState(filters.State)
        };
    }

    private static string? NormalizeAirportCodeOrNull(string? airportCode)
    {
        return string.IsNullOrWhiteSpace(airportCode)
            ? null
            : airportCode.Trim().ToUpperInvariant();
    }

    // Mismas reglas de estructura que la creacion, aplicadas al reemplazo completo de vuelos.
    private static string? ValidateUpdateItineraryRequest(UpdateItineraryRequest request)
    {
        return ValidateItineraryRequest(request.Price, request.State, request.Flights);
    }

    private static string? ValidateItineraryRequest(
        decimal price,
        string state,
        IReadOnlyCollection<CreateItineraryFlightRequest>? flights)
    {
        if (price < 0)
        {
            return "Price must be greater than or equal to 0.";
        }

        var stateValidationError = ValidateItineraryState(state);
        if (stateValidationError is not null)
        {
            return stateValidationError;
        }

        if (flights is null)
        {
            return "Flights list is required.";
        }

        if (flights.Count == 0)
        {
            return "Itinerary must contain at least one flight.";
        }

        if (flights.Any(flight => flight.FlightId <= 0))
        {
            return "Flight id must be greater than 0.";
        }

        if (flights.Any(flight => flight.FlightOrder <= 0))
        {
            return "Flight order must be greater than 0.";
        }

        return null;
    }

    private static string NormalizeState(string state)
    {
        return state.Trim().ToUpperInvariant();
    }

    private static string? ValidateItineraryState(string state)
    {
        if (string.IsNullOrWhiteSpace(state))
        {
            return "State is required.";
        }

        var normalizedState = NormalizeState(state);
        if (normalizedState is not "EDITION" and not "PUBLIC" and not "CLOSED")
        {
            return "State must be EDITION, PUBLIC or CLOSED.";
        }

        return null;
    }

    // El estado del itinerario sigue un ciclo de una sola via:
    // EDITION se puede editar o publicar; PUBLIC y CLOSED son de solo lectura.
    private static string? ValidateItineraryLifecycleTransition(string currentState, string requestedState)
    {
        if (currentState == "CLOSED")
        {
            return "Closed itineraries cannot be modified.";
        }

        if (currentState == "PUBLIC")
        {
            if (requestedState == "EDITION")
            {
                return "Published itineraries cannot return to edition.";
            }

            if (requestedState == "CLOSED")
            {
                return "Itineraries cannot be manually closed from itinerary management.";
            }

            return "Only itineraries in EDITION state can be edited.";
        }

        if (requestedState == "CLOSED")
        {
            return "Itineraries cannot be manually closed from itinerary management.";
        }

        return null;
    }

    private static ItineraryAvailabilityResponse BuildAvailabilityResponse(
        int itineraryId,
        int passengers,
        IReadOnlyList<ItineraryFlightAvailabilityData> flights)
    {
        if (flights.Count == 0)
        {
            return new ItineraryAvailabilityResponse
            {
                ItineraryId = itineraryId,
                RequestedPassengers = passengers,
                AvailableSeats = 0,
                CanReserve = false
            };
        }

        // La disponibilidad del itinerario se calcula con el menor cupo disponible
        // entre todos sus vuelos internos, no solo con el estado del encabezado.
        var minimumAvailableSeats = flights.Min(flight => Math.Max(0, flight.AvailableSeats));
        var allFlightsReservable = flights.All(IsReservableFlight);
        var effectiveAvailableSeats = allFlightsReservable ? minimumAvailableSeats : 0;

        return new ItineraryAvailabilityResponse
        {
            ItineraryId = itineraryId,
            RequestedPassengers = passengers,
            AvailableSeats = effectiveAvailableSeats,
            CanReserve = allFlightsReservable && effectiveAvailableSeats >= passengers
        };
    }

    private static bool IsReservableFlight(ItineraryFlightAvailabilityData flight)
    {
        return (flight.FlightState is "OPEN" or "UPCOMING") && flight.AvailableSeats > 0;
    }

    // Evita que el mismo vuelo o el mismo orden aparezcan mas de una vez.
    private static string? ValidateDuplicates(CreateItineraryRequest request)
    {
        if (request.Flights.GroupBy(flight => flight.FlightId).Any(group => group.Count() > 1))
        {
            return "Flight ids cannot be duplicated inside the same itinerary.";
        }

        if (request.Flights.GroupBy(flight => flight.FlightOrder).Any(group => group.Count() > 1))
        {
            return "Flight order values cannot be duplicated.";
        }

        return null;
    }

    private static string? ValidateDuplicates(UpdateItineraryRequest request)
    {
        if (request.Flights.GroupBy(flight => flight.FlightId).Any(group => group.Count() > 1))
        {
            return "Flight ids cannot be duplicated inside the same itinerary.";
        }

        if (request.Flights.GroupBy(flight => flight.FlightOrder).Any(group => group.Count() > 1))
        {
            return "Flight order values cannot be duplicated.";
        }

        return null;
    }

    // Valida que los vuelos formen una ruta conectada. La regla UPCOMING solo
    // aplica cuando el itinerario quedara reservable para clientes.
    private static string? ValidateFlightSequence(
        IReadOnlyList<ItineraryFlightValidationData> orderedFlights,
        bool requireUpcomingFlights)
    {
        foreach (var flight in orderedFlights)
        {
            if (flight.State == "CLOSED")
            {
                return $"Flight '{flight.FlightId}' cannot be CLOSED.";
            }

            if (requireUpcomingFlights && flight.State != "UPCOMING")
            {
                return $"Flight '{flight.FlightId}' must have state UPCOMING.";
            }

            if (flight.ArrivalDatetime <= flight.DepartureDatetime)
            {
                return $"Flight '{flight.FlightId}' arrival datetime must be after departure datetime.";
            }
        }

        for (var index = 1; index < orderedFlights.Count; index++)
        {
            var previousFlight = orderedFlights[index - 1];
            var currentFlight = orderedFlights[index];

            if (previousFlight.ArrivalAirportCode != currentFlight.DepartureAirportCode)
            {
                return "The arrival airport of each flight must match the departure airport of the next flight.";
            }

            var connectionTime = currentFlight.DepartureDatetime - previousFlight.ArrivalDatetime;
            if (connectionTime < TimeSpan.Zero)
            {
                return "The next flight departure datetime must be after or equal to the previous flight arrival datetime.";
            }

            if (connectionTime > TimeSpan.FromDays(1))
            {
                return "Consecutive flights cannot have more than one day between arrival and next departure.";
            }
        }

        return null;
    }
}
