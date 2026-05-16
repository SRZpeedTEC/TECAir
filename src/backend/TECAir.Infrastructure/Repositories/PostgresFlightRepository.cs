using Npgsql;
using NpgsqlTypes;
using TECAir.Application.DTOs.Flights;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio encargado de consultar y modificar vuelos en PostgreSQL con Npgsql.
// Mantiene el SQL fuera de controllers y servicios, usando siempre parametros.
public sealed class PostgresFlightRepository(NpgsqlDataSource dataSource) : IFlightRepository
{
    // Verifica que el aeropuerto exista antes de crear vuelos que lo referencien.
    public async Task<bool> AirportExistsAsync(string airportCode, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.airport
                WHERE code = @code
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("code", airportCode);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Verifica que el avion exista para evitar insertar vuelos con una placa invalida.
    public async Task<bool> PlaneExistsAsync(string planePlate, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.plane
                WHERE plate = @plate
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("plate", planePlate);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Detecta traslapes de tiempo para un mismo avion.
    // La condicion compara rangos: un vuelo existente inicia antes de que termine
    // el nuevo y termina despues de que el nuevo ya inicio.
    public async Task<bool> PlaneHasOverlappingFlightAsync(
        string planePlate,
        DateTime departureDatetime,
        DateTime arrivalDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    plane_plate = @plane_plate
                    AND departure_datetime < @arrival_datetime
                    AND arrival_datetime > @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("plane_plate", planePlate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);
        command.Parameters.AddWithValue("arrival_datetime", arrivalDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Detecta si una puerta ya esta reservada para el mismo aeropuerto y hora de salida.
    // LOWER permite comparar la puerta sin depender de mayusculas o minusculas.
    public async Task<bool> GateHasDepartureConflictAsync(
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    airport_departs_from_id = @airport_departs_from_id
                    AND LOWER(gate) = LOWER(@gate)
                    AND departure_datetime = @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("airport_departs_from_id", airportDepartsFromId);
        command.Parameters.AddWithValue("gate", gate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Inserta el vuelo y devuelve la fila creada con el formato que usa la API.
    public async Task<FlightResponse> CreateAsync(
        CreateFlightRequest request,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO tecair.flight (
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime
            )
            VALUES (
                @plane_plate,
                @airport_departs_from_id,
                @airport_arrives_to_id,
                @state,
                @gate,
                @departure_datetime,
                @arrival_datetime
            )
            RETURNING
                flight_id,
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("plane_plate", request.PlanePlate);
        command.Parameters.AddWithValue("airport_departs_from_id", request.AirportDepartsFromId);
        command.Parameters.AddWithValue("airport_arrives_to_id", request.AirportArrivesToId);
        command.Parameters.AddWithValue("state", request.State);
        command.Parameters.AddWithValue("gate", (object?)request.Gate ?? DBNull.Value);
        command.Parameters.AddWithValue("departure_datetime", request.DepartureDatetime);
        command.Parameters.AddWithValue("arrival_datetime", request.ArrivalDatetime);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to create the flight.");
        }

        return MapFlightResponse(reader);
    }

    // Lista vuelos OPEN de un aeropuerto de salida para que puedan usarse en itinerarios.
    public async Task<IReadOnlyList<OpenFlightResponse>> GetOpenByDepartureAirportAsync(
        string departureCode,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                f.flight_id,
                f.plane_plate,
                departure_airport.airport_name,
                departure_airport.code,
                departure_airport.city,
                arrival_airport.airport_name,
                arrival_airport.code,
                arrival_airport.city,
                f.state,
                f.gate,
                f.departure_datetime,
                f.arrival_datetime
            FROM tecair.flight f
            INNER JOIN tecair.airport departure_airport
                ON departure_airport.code = f.airport_departs_from_id
            INNER JOIN tecair.airport arrival_airport
                ON arrival_airport.code = f.airport_arrives_to_id
            WHERE
                f.state = 'OPEN'
                AND LOWER(departure_airport.code) = LOWER(@departure_code)
            ORDER BY f.departure_datetime ASC, f.flight_id ASC;
            """;

        var flights = new List<OpenFlightResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("departure_code", departureCode);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            flights.Add(new OpenFlightResponse
            {
                FlightId = reader.GetInt32(0),
                PlanePlate = reader.GetString(1),
                DepartureAirportName = reader.GetString(2),
                DepartureCode = reader.GetString(3),
                DepartureCity = reader.GetString(4),
                ArrivalAirportName = reader.GetString(5),
                ArrivalCode = reader.GetString(6),
                ArrivalCity = reader.GetString(7),
                State = reader.GetString(8),
                Gate = reader.IsDBNull(9) ? null : reader.GetString(9),
                DepartureDatetime = reader.GetDateTime(10),
                ArrivalDatetime = reader.GetDateTime(11)
            });
        }

        return flights;
    }

    // Lista vuelos UPCOMING u OPEN con filtros opcionales combinados con AND.
    public async Task<IReadOnlyList<AvailableFlightResponse>> GetAvailableAsync(
        string? originCode = null,
        string? destinationCode = null,
        int? flightId = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                f.flight_id,
                f.plane_plate,
                f.airport_departs_from_id,
                f.airport_arrives_to_id,
                f.state,
                f.gate,
                f.departure_datetime,
                f.arrival_datetime
            FROM tecair.flight f
            WHERE
                f.state IN ('UPCOMING', 'OPEN')
                AND (@origin_code IS NULL OR f.airport_departs_from_id = @origin_code)
                AND (@destination_code IS NULL OR f.airport_arrives_to_id = @destination_code)
                AND (@flight_id IS NULL OR f.flight_id = @flight_id)
            ORDER BY f.departure_datetime ASC, f.flight_id ASC;
            """;

        var flights = new List<AvailableFlightResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.Add("origin_code", NpgsqlDbType.Varchar).Value =
            (object?)originCode ?? DBNull.Value;
        command.Parameters.Add("destination_code", NpgsqlDbType.Varchar).Value =
            (object?)destinationCode ?? DBNull.Value;
        command.Parameters.Add("flight_id", NpgsqlDbType.Integer).Value =
            (object?)flightId ?? DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            flights.Add(MapAvailableFlightResponse(reader));
        }

        return flights;
    }

    public async Task<bool> FlightExistsAsync(int flightId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE flight_id = @flight_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<string?> GetFlightStateAsync(int flightId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT state
            FROM tecair.flight
            WHERE flight_id = @flight_id;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result as string;
    }

    // Variante para actualizacion: ignora el vuelo actual para que no choque consigo mismo.
    public async Task<bool> PlaneHasOverlappingFlightExceptAsync(
        int excludedFlightId,
        string planePlate,
        DateTime departureDatetime,
        DateTime arrivalDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    flight_id <> @excluded_flight_id
                    AND plane_plate = @plane_plate
                    AND departure_datetime < @arrival_datetime
                    AND arrival_datetime > @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("excluded_flight_id", excludedFlightId);
        command.Parameters.AddWithValue("plane_plate", planePlate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);
        command.Parameters.AddWithValue("arrival_datetime", arrivalDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Variante para actualizacion: permite conservar la misma puerta del vuelo editado.
    public async Task<bool> GateHasDepartureConflictExceptAsync(
        int excludedFlightId,
        string airportDepartsFromId,
        string gate,
        DateTime departureDatetime,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight
                WHERE
                    flight_id <> @excluded_flight_id
                    AND airport_departs_from_id = @airport_departs_from_id
                    AND LOWER(gate) = LOWER(@gate)
                    AND departure_datetime = @departure_datetime
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("excluded_flight_id", excludedFlightId);
        command.Parameters.AddWithValue("airport_departs_from_id", airportDepartsFromId);
        command.Parameters.AddWithValue("gate", gate);
        command.Parameters.AddWithValue("departure_datetime", departureDatetime);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    // Un vuelo usado por flight_in_itinerary no debe borrarse porque ya define una ruta vendible.
    public async Task<bool> FlightIsUsedInItineraryAsync(
        int flightId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight_in_itinerary
                WHERE flight_id = @flight_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<FlightResponse> UpdateAsync(
        int flightId,
        UpdateFlightRequest request,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE tecair.flight
            SET
                plane_plate = @plane_plate,
                airport_departs_from_id = @airport_departs_from_id,
                airport_arrives_to_id = @airport_arrives_to_id,
                state = @state,
                gate = @gate,
                departure_datetime = @departure_datetime,
                arrival_datetime = @arrival_datetime
            WHERE flight_id = @flight_id
            RETURNING
                flight_id,
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);
        command.Parameters.AddWithValue("plane_plate", request.PlanePlate);
        command.Parameters.AddWithValue("airport_departs_from_id", request.AirportDepartsFromId);
        command.Parameters.AddWithValue("airport_arrives_to_id", request.AirportArrivesToId);
        command.Parameters.AddWithValue("state", request.State);
        command.Parameters.AddWithValue("gate", (object?)request.Gate ?? DBNull.Value);
        command.Parameters.AddWithValue("departure_datetime", request.DepartureDatetime);
        command.Parameters.AddWithValue("arrival_datetime", request.ArrivalDatetime);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to update the flight.");
        }

        return MapFlightResponse(reader);
    }

    public async Task<FlightResponse> UpdateStateAsync(
        int flightId,
        string state,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE tecair.flight
            SET state = @state
            WHERE flight_id = @flight_id
            RETURNING
                flight_id,
                plane_plate,
                airport_departs_from_id,
                airport_arrives_to_id,
                state,
                gate,
                departure_datetime,
                arrival_datetime;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);
        command.Parameters.AddWithValue("state", state);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to update the flight state.");
        }

        return MapFlightResponse(reader);
    }

    public async Task DeleteAsync(int flightId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM tecair.flight
            WHERE flight_id = @flight_id;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    // Convierte la fila devuelta por PostgreSQL al DTO de respuesta de vuelos.
    private static AvailableFlightResponse MapAvailableFlightResponse(NpgsqlDataReader reader)
    {
        return new AvailableFlightResponse
        {
            FlightId = reader.GetInt32(0),
            PlanePlate = reader.GetString(1),
            OriginCode = reader.GetString(2),
            DestinationCode = reader.GetString(3),
            State = reader.GetString(4),
            Gate = reader.IsDBNull(5) ? null : reader.GetString(5),
            DepartureDatetime = reader.GetDateTime(6),
            ArrivalDatetime = reader.GetDateTime(7)
        };
    }

    private static FlightResponse MapFlightResponse(NpgsqlDataReader reader)
    {
        return new FlightResponse
        {
            FlightId = reader.GetInt32(0),
            PlanePlate = reader.GetString(1),
            AirportDepartsFromId = reader.GetString(2),
            AirportArrivesToId = reader.GetString(3),
            State = reader.GetString(4),
            Gate = reader.IsDBNull(5) ? null : reader.GetString(5),
            DepartureDatetime = reader.GetDateTime(6),
            ArrivalDatetime = reader.GetDateTime(7)
        };
    }
}
