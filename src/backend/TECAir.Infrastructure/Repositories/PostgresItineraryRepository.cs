using Npgsql;
using NpgsqlTypes;
using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.DTOs.Promotions;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio encargado de consultar y crear itinerarios en PostgreSQL.
public sealed class PostgresItineraryRepository(NpgsqlDataSource dataSource) : IItineraryRepository
{
    // Busca itinerarios por origen y destino usando el primer y ultimo vuelo de cada ruta.
    public async Task<IReadOnlyList<ItinerarySearchResponse>> SearchAsync(
        string originCode,
        string destinationCode,
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
            )
            SELECT
                i.itinerary_id,
                i.price,
                i.state,
                departure_airport.code AS origin_code,
                arrival_airport.code AS destination_code,
                bounds.total_flights,
                first_flight.departure_datetime,
                last_flight.arrival_datetime
            FROM tecair.itinerary i
            LEFT JOIN tecair.promotion p
                ON p.itinerary_id = i.itinerary_id
            INNER JOIN itinerary_bounds bounds
                ON bounds.itinerary_id = i.itinerary_id
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
                departure_airport.code = @origin_code
                AND arrival_airport.code = @destination_code
            ORDER BY first_flight.departure_datetime, i.itinerary_id;
            """;

        var itineraries = new List<ItinerarySearchResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("origin_code", originCode);
        command.Parameters.AddWithValue("destination_code", destinationCode);

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
                DepartureDatetime = reader.GetDateTime(6),
                ArrivalDatetime = reader.GetDateTime(7)
            });
        }

        return itineraries;
    }

    public async Task<IReadOnlyList<ItinerarySummaryResponse>> GetAllOriginDestAsync(
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
            )
            SELECT
                i.itinerary_id,
                i.price,
                i.state,
                first_flight.airport_departs_from_id AS origin_code,
                last_flight.airport_arrives_to_id AS destination_code,
                first_flight.departure_datetime,
                last_flight.arrival_datetime,
                bounds.total_flights
            FROM tecair.itinerary i
            INNER JOIN itinerary_bounds bounds
                ON bounds.itinerary_id = i.itinerary_id
            INNER JOIN tecair.flight_in_itinerary first_link
                ON first_link.itinerary_id = i.itinerary_id
               AND first_link.flight_order = bounds.first_flight_order
            INNER JOIN tecair.flight first_flight
                ON first_flight.flight_id = first_link.flight_id
            INNER JOIN tecair.flight_in_itinerary last_link
                ON last_link.itinerary_id = i.itinerary_id
               AND last_link.flight_order = bounds.last_flight_order
            INNER JOIN tecair.flight last_flight
                ON last_flight.flight_id = last_link.flight_id
            ORDER BY first_flight.departure_datetime, i.itinerary_id;
            """;

        var itineraries = new List<ItinerarySummaryResponse>();

        await using var command = dataSource.CreateCommand(sql);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            itineraries.Add(MapItinerarySummaryResponse(reader));
        }

        return itineraries;
    }

    public async Task<IReadOnlyList<ItineraryWithPromotionSummaryResponse>> GetPublicWithPromotionsAsync(
        string? originCode = null,
        string? destinationCode = null,
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
            )
            SELECT
                i.itinerary_id,
                i.price,
                i.state,
                first_flight.airport_departs_from_id AS origin_code,
                last_flight.airport_arrives_to_id AS destination_code,
                first_flight.departure_datetime,
                last_flight.arrival_datetime,
                bounds.total_flights,
                p.promotion_code,
                p.itinerary_id,
                p.image_url,
                p.start_date,
                p.end_date,
                p.discount_percent,
                p.promo_price
            FROM tecair.itinerary i
            INNER JOIN itinerary_bounds bounds
                ON bounds.itinerary_id = i.itinerary_id
            INNER JOIN tecair.flight_in_itinerary first_link
                ON first_link.itinerary_id = i.itinerary_id
               AND first_link.flight_order = bounds.first_flight_order
            INNER JOIN tecair.flight first_flight
                ON first_flight.flight_id = first_link.flight_id
            INNER JOIN tecair.flight_in_itinerary last_link
                ON last_link.itinerary_id = i.itinerary_id
               AND last_link.flight_order = bounds.last_flight_order
            INNER JOIN tecair.flight last_flight
                ON last_flight.flight_id = last_link.flight_id
            LEFT JOIN tecair.promotion p
                ON p.itinerary_id = i.itinerary_id
               AND CURRENT_DATE BETWEEN p.start_date AND p.end_date
            WHERE
                i.state = 'PUBLIC'
                AND (@origin_code IS NULL OR first_flight.airport_departs_from_id = @origin_code)
                AND (@destination_code IS NULL OR last_flight.airport_arrives_to_id = @destination_code)
            ORDER BY first_flight.departure_datetime, i.itinerary_id;
            """;

        var itineraries = new List<ItineraryWithPromotionSummaryResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.Add("origin_code", NpgsqlDbType.Varchar).Value =
            (object?)originCode ?? DBNull.Value;
        command.Parameters.Add("destination_code", NpgsqlDbType.Varchar).Value =
            (object?)destinationCode ?? DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            itineraries.Add(MapItineraryWithPromotionSummaryResponse(reader));
        }

        return itineraries;
    }

    // Obtiene resumen y promocion activa opcional de un itinerario especifico.
    public async Task<ItineraryWithPromotionSummaryResponse?> GetByIdAsync(
        int itineraryId,
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
            )
            SELECT
                i.itinerary_id,
                i.price,
                i.state,
                first_flight.airport_departs_from_id AS origin_code,
                last_flight.airport_arrives_to_id AS destination_code,
                first_flight.departure_datetime,
                last_flight.arrival_datetime,
                bounds.total_flights,
                p.promotion_code,
                p.itinerary_id,
                p.image_url,
                p.start_date,
                p.end_date,
                p.discount_percent,
                p.promo_price
            FROM tecair.itinerary i
            INNER JOIN itinerary_bounds bounds
                ON bounds.itinerary_id = i.itinerary_id
            INNER JOIN tecair.flight_in_itinerary first_link
                ON first_link.itinerary_id = i.itinerary_id
               AND first_link.flight_order = bounds.first_flight_order
            INNER JOIN tecair.flight first_flight
                ON first_flight.flight_id = first_link.flight_id
            INNER JOIN tecair.flight_in_itinerary last_link
                ON last_link.itinerary_id = i.itinerary_id
               AND last_link.flight_order = bounds.last_flight_order
            INNER JOIN tecair.flight last_flight
                ON last_flight.flight_id = last_link.flight_id
            LEFT JOIN tecair.promotion p
                ON p.itinerary_id = i.itinerary_id
               AND CURRENT_DATE BETWEEN p.start_date AND p.end_date
            WHERE i.itinerary_id = @itinerary_id;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapItineraryWithPromotionSummaryResponse(reader);
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

    private static ItinerarySummaryResponse MapItinerarySummaryResponse(NpgsqlDataReader reader)
    {
        return new ItinerarySummaryResponse
        {
            ItineraryId = reader.GetInt32(0),
            Price = reader.GetDecimal(1),
            State = reader.GetString(2),
            OriginCode = reader.GetString(3),
            DestinationCode = reader.GetString(4),
            DepartureDatetime = reader.GetDateTime(5),
            ArrivalDatetime = reader.GetDateTime(6),
            TotalFlights = checked((int)reader.GetInt64(7))
        };
    }

    private static ItineraryWithPromotionSummaryResponse MapItineraryWithPromotionSummaryResponse(NpgsqlDataReader reader)
    {
        return new ItineraryWithPromotionSummaryResponse
        {
            ItineraryId = reader.GetInt32(0),
            Price = reader.GetDecimal(1),
            State = reader.GetString(2),
            OriginCode = reader.GetString(3),
            DestinationCode = reader.GetString(4),
            DepartureDatetime = reader.GetDateTime(5),
            ArrivalDatetime = reader.GetDateTime(6),
            TotalFlights = checked((int)reader.GetInt64(7)),
            Promotion = MapPromotionResponseOrNull(reader, 8)
        };
    }

    private static PromotionResponse? MapPromotionResponseOrNull(NpgsqlDataReader reader, int startIndex)
    {
        if (reader.IsDBNull(startIndex))
        {
            return null;
        }

        return new PromotionResponse
        {
            PromotionCode = reader.GetString(startIndex),
            ItineraryId = reader.GetInt32(startIndex + 1),
            ImageUrl = reader.IsDBNull(startIndex + 2) ? null : reader.GetString(startIndex + 2),
            StartDate = reader.GetFieldValue<DateOnly>(startIndex + 3),
            EndDate = reader.GetFieldValue<DateOnly>(startIndex + 4),
            DiscountPercent = reader.GetDecimal(startIndex + 5),
            PromoPrice = reader.GetInt32(startIndex + 6)
        };
    }
}
