using Npgsql;
using NpgsqlTypes;
using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.DTOs.Promotions;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio encargado de consultar y crear itinerarios en PostgreSQL.
public sealed class PostgresItineraryRepository(NpgsqlDataSource dataSource) : IItineraryRepository
{
    // Busca itinerarios PUBLIC por origen y destino usando el primer y ultimo vuelo de cada ruta.
    // Los itinerarios CLOSED quedan fuera de las busquedas publicas de clientes.
    public async Task<IReadOnlyList<ItinerarySearchResponse>> SearchAsync(
        string originCode,
        string destinationCode,
        bool includeNonPublic,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            WITH itinerary_bounds AS (
                SELECT
                    fii.itinerary_id,
                    MIN(fii.flight_order) AS first_flight_order,
                    MAX(fii.flight_order) AS last_flight_order,
                    COUNT(*) AS total_flights
                FROM tecair.flight_in_itinerary fii
                GROUP BY fii.itinerary_id
            ),
            itinerary_miles AS (
                SELECT
                    fii.itinerary_id,
                    SUM(f.miles) AS total_miles
                FROM tecair.flight_in_itinerary fii
                INNER JOIN tecair.flight f
                    ON f.flight_id = fii.flight_id
                GROUP BY fii.itinerary_id
            )
            SELECT
                i.itinerary_id,
                i.price,
                i.state,
                departure_airport.code AS origin_code,
                arrival_airport.code AS destination_code,
                bounds.total_flights,
                miles.total_miles,
                first_flight.departure_datetime,
                last_flight.arrival_datetime
            FROM tecair.itinerary i
            LEFT JOIN tecair.promotion p
                ON p.itinerary_id = i.itinerary_id
            INNER JOIN itinerary_bounds bounds
                ON bounds.itinerary_id = i.itinerary_id
            INNER JOIN itinerary_miles miles
                ON miles.itinerary_id = i.itinerary_id
            INNER JOIN tecair.flight_in_itinerary first_link
                ON first_link.itinerary_id = i.itinerary_id
               AND first_link.flight_order = bounds.first_flight_order
            INNER JOIN tecair.flight first_flight
                ON first_flight.flight_id = first_link.flight_id
            INNER JOIN tecair.airport departure_airport
                ON departure_airport.code = first_flight.airport_departs_from_id
            INNER JOIN tecair.flight_in_itinerary last_link
                ON last_link.itinerary_id = i.itinerary_id
               AND last_link.flight_order = bounds.last_flight_order
            INNER JOIN tecair.flight last_flight
                ON last_flight.flight_id = last_link.flight_id
            INNER JOIN tecair.airport arrival_airport
                ON arrival_airport.code = last_flight.airport_arrives_to_id
            WHERE
                (@include_non_public = TRUE OR i.state = 'PUBLIC')
                AND departure_airport.code = @origin_code
                AND arrival_airport.code = @destination_code
            ORDER BY first_flight.departure_datetime, i.itinerary_id;
            """;

        var itineraries = new List<ItinerarySearchResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("origin_code", originCode);
        command.Parameters.AddWithValue("destination_code", destinationCode);
        command.Parameters.AddWithValue("include_non_public", includeNonPublic);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            itineraries.Add(new ItinerarySearchResponse
            {
                ItineraryId = reader.GetInt32(0),
                Price = reader.GetDecimal(1),
                State = reader.GetString(2),
                OriginCode = reader.GetString(3),
                DestinationCode = reader.GetString(4),
                TotalFlights = reader.GetInt64(5) is var totalFlights ? checked((int)totalFlights) : 0,
                TotalMiles = reader.GetInt64(6) is var totalMiles ? checked((int)totalMiles) : 0,
                DepartureDatetime = reader.GetDateTime(7),
                ArrivalDatetime = reader.GetDateTime(8)
            });
        }

        return itineraries;
    }

    public Task<IReadOnlyList<ItineraryDetailsResponse>> GetAllWithPromotionsAsync(
        CancellationToken cancellationToken = default)
    {
        return GetWithPromotionsAsync(publicOnly: false, itineraryId: null, cancellationToken);
    }

    public Task<IReadOnlyList<ItineraryDetailsResponse>> GetPublicWithPromotionsAsync(
        CancellationToken cancellationToken = default)
    {
        return GetWithPromotionsAsync(publicOnly: true, itineraryId: null, cancellationToken);
    }

    // Obtiene encabezado, promocion opcional y vuelos ordenados de un itinerario especifico.
    public async Task<ItineraryDetailsResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        var itineraries = await GetWithPromotionsAsync(
            publicOnly: false,
            itineraryId,
            cancellationToken);
        return itineraries.FirstOrDefault();
    }

    private async Task<IReadOnlyList<ItineraryDetailsResponse>> GetWithPromotionsAsync(
        bool publicOnly,
        int? itineraryId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                i.itinerary_id,
                i.price,
                i.state,
                p.promotion_code,
                p.itinerary_id,
                p.image_url,
                p.start_date,
                p.end_date,
                p.discount_percent,
                p.promo_price,
                ifl.itinerary_flight_id,
                ifl.flight_order,
                f.flight_id,
                f.plane_plate,
                departure_airport.airport_name,
                departure_airport.code,
                departure_airport.city,
                arrival_airport.airport_name,
                arrival_airport.code,
                arrival_airport.city,
                f.departure_datetime,
                f.arrival_datetime,
                f.miles,
                f.gate,
                f.state
            FROM tecair.itinerary i
            LEFT JOIN tecair.promotion p
                ON p.itinerary_id = i.itinerary_id
            INNER JOIN tecair.flight_in_itinerary ifl
                ON ifl.itinerary_id = i.itinerary_id
            INNER JOIN tecair.flight f
                ON f.flight_id = ifl.flight_id
            INNER JOIN tecair.airport departure_airport
                ON departure_airport.code = f.airport_departs_from_id
            INNER JOIN tecair.airport arrival_airport
                ON arrival_airport.code = f.airport_arrives_to_id
            WHERE
                (@public_only = FALSE OR i.state = 'PUBLIC')
                AND (@itinerary_id IS NULL OR i.itinerary_id = @itinerary_id)
            ORDER BY i.itinerary_id, ifl.flight_order;
            """;

        var itinerariesById = new Dictionary<int, ItineraryDetailsResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("public_only", publicOnly);
        command.Parameters.Add("itinerary_id", NpgsqlDbType.Integer).Value =
            (object?)itineraryId ?? DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            var currentItineraryId = reader.GetInt32(0);
            if (!itinerariesById.TryGetValue(currentItineraryId, out var itinerary))
            {
                itinerary = new ItineraryDetailsResponse
                {
                    ItineraryId = currentItineraryId,
                    Price = reader.GetDecimal(1),
                    State = reader.GetString(2),
                    Promotion = MapPromotionResponseOrNull(reader)
                };

                itinerariesById.Add(currentItineraryId, itinerary);
            }

            itinerary.Flights.Add(MapItineraryFlightResponse(reader));
        }

        return itinerariesById.Values.ToList();
    }

    // Trae datos minimos de vuelos para validar una solicitud de creacion.
    public async Task<IReadOnlyList<ItineraryFlightValidationData>> GetFlightsForCreateAsync(
        IReadOnlyCollection<int> flightIds,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                flight_id,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                departure_datetime,
                arrival_datetime
            FROM tecair.flight
            WHERE flight_id = ANY(@flight_ids);
            """;

        var flights = new List<ItineraryFlightValidationData>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_ids", flightIds.ToArray());

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            flights.Add(new ItineraryFlightValidationData
            {
                FlightId = reader.GetInt32(0),
                DepartureAirportCode = reader.GetString(1),
                ArrivalAirportCode = reader.GetString(2),
                State = reader.GetString(3),
                DepartureDatetime = reader.GetDateTime(4),
                ArrivalDatetime = reader.GetDateTime(5)
            });
        }

        return flights;
    }

    // Crea el itinerario y sus vuelos asociados.
    public async Task<CreateItineraryResponse> CreateAsync(
        CreateItineraryRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);

        const string insertItinerarySql = """
            INSERT INTO tecair.itinerary (price, state)
            VALUES (@price, @state)
            RETURNING itinerary_id, price, state;
            """;

        CreateItineraryResponse itinerary;
        await using (var command = new NpgsqlCommand(insertItinerarySql, connection))
        {
            command.Parameters.AddWithValue("price", request.Price);
            command.Parameters.AddWithValue("state", request.State);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Failed to create the itinerary.");
            }

            itinerary = new CreateItineraryResponse
            {
                ItineraryId = reader.GetInt32(0),
                Price = reader.GetDecimal(1),
                State = reader.GetString(2)
            };
        }

        // Cada vuelo se inserta en la tabla puente con el orden solicitado.
        const string insertFlightSql = """
            INSERT INTO tecair.flight_in_itinerary (
                itinerary_id,
                flight_id,
                flight_order
            )
            VALUES (
                @itinerary_id,
                @flight_id,
                @flight_order
            )
            RETURNING itinerary_flight_id, flight_id, flight_order;
            """;

        foreach (var flight in request.Flights)
        {
            await using var command = new NpgsqlCommand(insertFlightSql, connection);
            command.Parameters.AddWithValue("itinerary_id", itinerary.ItineraryId);
            command.Parameters.AddWithValue("flight_id", flight.FlightId);
            command.Parameters.AddWithValue("flight_order", flight.FlightOrder);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Failed to add a flight to the itinerary.");
            }

            itinerary.Flights.Add(new CreatedItineraryFlightResponse
            {
                ItineraryFlightId = reader.GetInt32(0),
                FlightId = reader.GetInt32(1),
                FlightOrder = reader.GetInt32(2)
            });
        }

        return itinerary;
    }

    public async Task<bool> ItineraryExistsAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.itinerary
                WHERE itinerary_id = @itinerary_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<string?> GetItineraryStateAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT state
            FROM tecair.itinerary
            WHERE itinerary_id = @itinerary_id;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result as string;
    }

    public async Task<IReadOnlyList<ItineraryFlightAvailabilityData>> GetItineraryFlightAvailabilityAsync(
        int itineraryId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            WITH reservation_counts AS (
                SELECT
                    itinerary_id,
                    COUNT(*)::INTEGER AS reserved_seats
                FROM tecair.reservation
                WHERE itinerary_id = @itinerary_id
                GROUP BY itinerary_id
            )
            SELECT
                f.flight_id,
                f.state,
                f.plane_plate,
                p.capacity,
                COALESCE(rc.reserved_seats, 0) AS reserved_seats,
                p.capacity - COALESCE(rc.reserved_seats, 0) AS available_seats
            FROM tecair.flight_in_itinerary fii
            INNER JOIN tecair.flight f
                ON f.flight_id = fii.flight_id
            INNER JOIN tecair.plane p
                ON p.plate = f.plane_plate
            LEFT JOIN reservation_counts rc
                ON rc.itinerary_id = fii.itinerary_id
            WHERE fii.itinerary_id = @itinerary_id
            ORDER BY fii.flight_order;
            """;

        var flights = new List<ItineraryFlightAvailabilityData>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            flights.Add(new ItineraryFlightAvailabilityData
            {
                FlightId = reader.GetInt32(0),
                FlightState = reader.GetString(1),
                PlanePlate = reader.GetString(2),
                PlaneCapacity = reader.GetInt32(3),
                ReservedSeats = reader.GetInt32(4),
                AvailableSeats = reader.GetInt32(5)
            });
        }

        return flights;
    }

    // Actualiza el precio y reemplaza todos los vuelos asociados.
    public async Task<CreateItineraryResponse> UpdateWithFlightsAsync(
        int itineraryId,
        UpdateItineraryRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);

        const string updateItinerarySql = """
            UPDATE tecair.itinerary
            SET
                price = @price,
                state = @state
            WHERE itinerary_id = @itinerary_id
            RETURNING itinerary_id, price, state;
            """;

        CreateItineraryResponse itinerary;
        await using (var command = new NpgsqlCommand(updateItinerarySql, connection))
        {
            command.Parameters.AddWithValue("itinerary_id", itineraryId);
            command.Parameters.AddWithValue("price", request.Price);
            command.Parameters.AddWithValue("state", request.State);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Failed to update the itinerary.");
            }

            itinerary = new CreateItineraryResponse
            {
                ItineraryId = reader.GetInt32(0),
                Price = reader.GetDecimal(1),
                State = reader.GetString(2)
            };
        }

        const string deleteFlightsSql = """
            DELETE FROM tecair.flight_in_itinerary
            WHERE itinerary_id = @itinerary_id;
            """;

        await using (var command = new NpgsqlCommand(deleteFlightsSql, connection))
        {
            command.Parameters.AddWithValue("itinerary_id", itineraryId);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        const string insertFlightSql = """
            INSERT INTO tecair.flight_in_itinerary (
                itinerary_id,
                flight_id,
                flight_order
            )
            VALUES (
                @itinerary_id,
                @flight_id,
                @flight_order
            )
            RETURNING itinerary_flight_id, flight_id, flight_order;
            """;

        foreach (var flight in request.Flights)
        {
            await using var command = new NpgsqlCommand(insertFlightSql, connection);
            command.Parameters.AddWithValue("itinerary_id", itineraryId);
            command.Parameters.AddWithValue("flight_id", flight.FlightId);
            command.Parameters.AddWithValue("flight_order", flight.FlightOrder);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Failed to add a flight to the itinerary.");
            }

            itinerary.Flights.Add(new CreatedItineraryFlightResponse
            {
                ItineraryFlightId = reader.GetInt32(0),
                FlightId = reader.GetInt32(1),
                FlightOrder = reader.GetInt32(2)
            });
        }

        return itinerary;
    }

    // Cierra o cambia visibilidad sin tocar flight_in_itinerary.
    public async Task<CreateItineraryResponse> UpdateStateAsync(
        int itineraryId,
        string state,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);

        const string updateItinerarySql = """
            UPDATE tecair.itinerary
            SET state = @state
            WHERE itinerary_id = @itinerary_id
            RETURNING itinerary_id, price, state;
            """;

        CreateItineraryResponse itinerary;
        await using (var command = new NpgsqlCommand(updateItinerarySql, connection))
        {
            command.Parameters.AddWithValue("itinerary_id", itineraryId);
            command.Parameters.AddWithValue("state", state);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Failed to update the itinerary state.");
            }

            itinerary = new CreateItineraryResponse
            {
                ItineraryId = reader.GetInt32(0),
                Price = reader.GetDecimal(1),
                State = reader.GetString(2)
            };
        }

        const string getFlightsSql = """
            SELECT
                itinerary_flight_id,
                flight_id,
                flight_order
            FROM tecair.flight_in_itinerary
            WHERE itinerary_id = @itinerary_id
            ORDER BY flight_order;
            """;

        await using (var command = new NpgsqlCommand(getFlightsSql, connection))
        {
            command.Parameters.AddWithValue("itinerary_id", itineraryId);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                itinerary.Flights.Add(new CreatedItineraryFlightResponse
                {
                    ItineraryFlightId = reader.GetInt32(0),
                    FlightId = reader.GetInt32(1),
                    FlightOrder = reader.GetInt32(2)
                });
            }
        }

        return itinerary;
    }

    // Las reservaciones bloquean el borrado porque representan ventas ya realizadas.
    public async Task<bool> ItineraryHasReservationsAsync(
        int itineraryId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.reservation
                WHERE itinerary_id = @itinerary_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Borra primero la tabla puente y luego el encabezado.
    public async Task DeleteAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);

        const string deleteFlightsSql = """
            DELETE FROM tecair.flight_in_itinerary
            WHERE itinerary_id = @itinerary_id;
            """;

        await using (var command = new NpgsqlCommand(deleteFlightsSql, connection))
        {
            command.Parameters.AddWithValue("itinerary_id", itineraryId);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        const string deleteItinerarySql = """
            DELETE FROM tecair.itinerary
            WHERE itinerary_id = @itinerary_id;
            """;

        await using (var command = new NpgsqlCommand(deleteItinerarySql, connection))
        {
            command.Parameters.AddWithValue("itinerary_id", itineraryId);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }
    }

    private static PromotionResponse? MapPromotionResponseOrNull(NpgsqlDataReader reader)
    {
        if (reader.IsDBNull(3))
        {
            return null;
        }

        return new PromotionResponse
        {
            PromotionCode = reader.GetString(3),
            ItineraryId = reader.GetInt32(4),
            ImageUrl = reader.IsDBNull(5) ? null : reader.GetString(5),
            StartDate = reader.GetFieldValue<DateOnly>(6),
            EndDate = reader.GetFieldValue<DateOnly>(7),
            DiscountPercent = reader.GetDecimal(8),
            PromoPrice = reader.GetInt32(9)
        };
    }

    private static ItineraryFlightResponse MapItineraryFlightResponse(NpgsqlDataReader reader)
    {
        return new ItineraryFlightResponse
        {
            ItineraryFlightId = reader.GetInt32(10),
            FlightOrder = reader.GetInt32(11),
            FlightId = reader.GetInt32(12),
            PlanePlate = reader.GetString(13),
            DepartureAirportName = reader.GetString(14),
            DepartureCode = reader.GetString(15),
            DepartureCity = reader.GetString(16),
            ArrivalAirportName = reader.GetString(17),
            ArrivalCode = reader.GetString(18),
            ArrivalCity = reader.GetString(19),
            DepartureDatetime = reader.GetDateTime(20),
            ArrivalDatetime = reader.GetDateTime(21),
            Miles = reader.GetInt32(22),
            Gate = reader.IsDBNull(23) ? null : reader.GetString(23),
            State = reader.GetString(24)
        };
    }
}
