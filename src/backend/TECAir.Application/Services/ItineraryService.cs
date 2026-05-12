using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para itinerarios.
// Valida reglas de negocio como duplicados, orden de vuelos y conexiones validas.
public class ItineraryService(IItineraryRepository itineraryRepository) : IItineraryService
{
    // Busca itinerarios normalizando los codigos IATA antes de consultar la base.
    public Task<IReadOnlyList<ItinerarySearchResponse>> SearchAsync(
        string originCode,
        string destinationCode,
        CancellationToken cancellationToken = default)
    {
        return itineraryRepository.SearchAsync(
            originCode.Trim().ToUpperInvariant(),
            destinationCode.Trim().ToUpperInvariant(),
            cancellationToken);
    }

    // Consulta el detalle de un itinerario por id.
    public Task<ItineraryDetailsResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        return itineraryRepository.GetByIdAsync(itineraryId, cancellationToken);
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

        var orderedFlights = request.Flights
            .OrderBy(flight => flight.FlightOrder)
            .Select(flight => new
            {
                Request = flight,
                Data = databaseFlightsById[flight.FlightId]
            })
            .ToArray();

        var itineraryValidationError = ValidateFlightSequence(orderedFlights.Select(flight => flight.Data).ToArray());
        if (itineraryValidationError is not null)
        {
            return CreateItineraryServiceResult.ValidationError(itineraryValidationError);
        }

        var normalizedRequest = new CreateItineraryRequest
        {
            Price = request.Price,
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

        if (!await itineraryRepository.ItineraryExistsAsync(itineraryId, cancellationToken))
        {
            return UpdateItineraryServiceResult.NotFound($"Itinerary '{itineraryId}' was not found.");
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

        var itineraryValidationError = ValidateFlightSequence(orderedFlights.Select(flight => flight.Data).ToArray());
        if (itineraryValidationError is not null)
        {
            return UpdateItineraryServiceResult.ValidationError(itineraryValidationError);
        }

        var normalizedRequest = new UpdateItineraryRequest
        {
            Price = request.Price,
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
        if (request.Price < 0)
        {
            return "Price must be greater than or equal to 0.";
        }

        if (request.Flights is null)
        {
            return "Flights list is required.";
        }

        if (request.Flights.Count == 0)
        {
            return "Itinerary must contain at least one flight.";
        }

        if (request.Flights.Any(flight => flight.FlightId <= 0))
        {
            return "Flight id must be greater than 0.";
        }

        if (request.Flights.Any(flight => flight.FlightOrder <= 0))
        {
            return "Flight order must be greater than 0.";
        }

        return null;
    }

    // Mismas reglas de estructura que la creacion, aplicadas al reemplazo completo de vuelos.
    private static string? ValidateUpdateItineraryRequest(UpdateItineraryRequest request)
    {
        if (request.Price < 0)
        {
            return "Price must be greater than or equal to 0.";
        }

        if (request.Flights is null)
        {
            return "Flights list is required.";
        }

        if (request.Flights.Count == 0)
        {
            return "Itinerary must contain at least one flight.";
        }

        if (request.Flights.Any(flight => flight.FlightId <= 0))
        {
            return "Flight id must be greater than 0.";
        }

        if (request.Flights.Any(flight => flight.FlightOrder <= 0))
        {
            return "Flight order must be greater than 0.";
        }

        return null;
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

    // Valida que todos los vuelos esten abiertos y formen una ruta conectada.
    private static string? ValidateFlightSequence(IReadOnlyList<ItineraryFlightValidationData> orderedFlights)
    {
        foreach (var flight in orderedFlights)
        {
            if (flight.State != "OPEN")
            {
                return $"Flight '{flight.FlightId}' must have state OPEN.";
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
