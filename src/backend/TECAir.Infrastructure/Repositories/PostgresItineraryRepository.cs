using Npgsql;
using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio encargado de consultar y crear itinerarios en PostgreSQL.
// Centraliza los SELECT complejos y las transacciones usadas por itinerarios.
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
                departure_airport.code AS origin_code,
                arrival_airport.code AS destination_code,
                bounds.total_flights,
                first_flight.departure_datetime,
                last_flight.arrival_datetime
            FROM tecair.itinerary i
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
                OriginCode = reader.GetString(2),
                DestinationCode = reader.GetString(3),
                TotalFlights = reader.GetInt64(4) is var totalFlights ? checked((int)totalFlights) : 0,
                DepartureDatetime = reader.GetDateTime(5),
                ArrivalDatetime = reader.GetDateTime(6)
            });
        }

        return itineraries;
    }

    // Obtiene primero el encabezado del itinerario y luego sus vuelos ordenados.
    public async Task<ItineraryDetailsResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);

        const string itinerarySql = """
            SELECT
                itinerary_id,
                price
            FROM tecair.itinerary
            WHERE itinerary_id = @itinerary_id;
            """;

        await using var itineraryCommand = new NpgsqlCommand(itinerarySql, connection);
        itineraryCommand.Parameters.AddWithValue("itinerary_id", itineraryId);

        await using var itineraryReader = await itineraryCommand.ExecuteReaderAsync(cancellationToken);
        if (!await itineraryReader.ReadAsync(cancellationToken))
        {
            return null;
        }

        var itinerary = new ItineraryDetailsResponse
        {
            ItineraryId = itineraryReader.GetInt32(0),
            Price = itineraryReader.GetDecimal(1)
        };

        // Cerramos el reader antes de ejecutar otra consulta sobre la misma conexion.
        await itineraryReader.CloseAsync();

        const string flightsSql = """
            SELECT
                fii.itinerary_flight_id,
                fii.flight_order,
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
                f.gate,
                f.state
            FROM tecair.flight_in_itinerary fii
            INNER JOIN tecair.flight f
                ON f.flight_id = fii.flight_id
            INNER JOIN tecair.airport departure_airport
                ON departure_airport.code = f.airport_departs_from_id
            INNER JOIN tecair.airport arrival_airport
                ON arrival_airport.code = f.airport_arrives_to_id
            WHERE fii.itinerary_id = @itinerary_id
            ORDER BY fii.flight_order;
            """;

        await using var flightsCommand = new NpgsqlCommand(flightsSql, connection);
        flightsCommand.Parameters.AddWithValue("itinerary_id", itineraryId);

        await using var flightsReader = await flightsCommand.ExecuteReaderAsync(cancellationToken);
        while (await flightsReader.ReadAsync(cancellationToken))
        {
            itinerary.Flights.Add(new ItineraryFlightResponse
            {
                ItineraryFlightId = flightsReader.GetInt32(0),
                FlightOrder = flightsReader.GetInt32(1),
                FlightId = flightsReader.GetInt32(2),
                PlanePlate = flightsReader.GetString(3),
                DepartureAirportName = flightsReader.GetString(4),
                DepartureCode = flightsReader.GetString(5),
                DepartureCity = flightsReader.GetString(6),
                ArrivalAirportName = flightsReader.GetString(7),
                ArrivalCode = flightsReader.GetString(8),
                ArrivalCity = flightsReader.GetString(9),
                DepartureDatetime = flightsReader.GetDateTime(10),
                ArrivalDatetime = flightsReader.GetDateTime(11),
                Gate = flightsReader.IsDBNull(12) ? null : flightsReader.GetString(12),
                State = flightsReader.GetString(13)
            });
        }

        return itinerary;
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

    // Crea el itinerario y sus vuelos en una transaccion.
    // Si falla cualquier INSERT, no se guarda una ruta incompleta.
    public async Task<CreateItineraryResponse> CreateAsync(
        CreateItineraryRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        const string insertItinerarySql = """
            INSERT INTO tecair.itinerary (price)
            VALUES (@price)
            RETURNING itinerary_id, price;
            """;

        CreateItineraryResponse itinerary;
        await using (var command = new NpgsqlCommand(insertItinerarySql, connection, transaction))
        {
            command.Parameters.AddWithValue("price", request.Price);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Failed to create the itinerary.");
            }

            itinerary = new CreateItineraryResponse
            {
                ItineraryId = reader.GetInt32(0),
                Price = reader.GetDecimal(1)
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
            await using var command = new NpgsqlCommand(insertFlightSql, connection, transaction);
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

        // Commit confirma tanto el encabezado como todos los vuelos asociados.
        await transaction.CommitAsync(cancellationToken);
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

    // Actualiza el precio y reemplaza todos los vuelos asociados en una transaccion.
    // Asi no queda un itinerario parcialmente actualizado si falla algun INSERT.
    public async Task<CreateItineraryResponse> UpdateWithFlightsAsync(
        int itineraryId,
        UpdateItineraryRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        const string updateItinerarySql = """
            UPDATE tecair.itinerary
            SET price = @price
            WHERE itinerary_id = @itinerary_id
            RETURNING itinerary_id, price;
            """;

        CreateItineraryResponse itinerary;
        await using (var command = new NpgsqlCommand(updateItinerarySql, connection, transaction))
        {
            command.Parameters.AddWithValue("itinerary_id", itineraryId);
            command.Parameters.AddWithValue("price", request.Price);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Failed to update the itinerary.");
            }

            itinerary = new CreateItineraryResponse
            {
                ItineraryId = reader.GetInt32(0),
                Price = reader.GetDecimal(1)
            };
        }

        const string deleteFlightsSql = """
            DELETE FROM tecair.flight_in_itinerary
            WHERE itinerary_id = @itinerary_id;
            """;

        await using (var command = new NpgsqlCommand(deleteFlightsSql, connection, transaction))
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
            await using var command = new NpgsqlCommand(insertFlightSql, connection, transaction);
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

        await transaction.CommitAsync(cancellationToken);
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

    // Borra primero la tabla puente y luego el encabezado, todo en una transaccion.
    public async Task DeleteAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        const string deleteFlightsSql = """
            DELETE FROM tecair.flight_in_itinerary
            WHERE itinerary_id = @itinerary_id;
            """;

        await using (var command = new NpgsqlCommand(deleteFlightsSql, connection, transaction))
        {
            command.Parameters.AddWithValue("itinerary_id", itineraryId);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        const string deleteItinerarySql = """
            DELETE FROM tecair.itinerary
            WHERE itinerary_id = @itinerary_id;
            """;

        await using (var command = new NpgsqlCommand(deleteItinerarySql, connection, transaction))
        {
            command.Parameters.AddWithValue("itinerary_id", itineraryId);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
    }
}
