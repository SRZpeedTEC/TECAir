using Npgsql;
using TECAir.Application.DTOs.Flights;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

public sealed class PostgresFlightRepository(NpgsqlDataSource dataSource) : IFlightRepository
{
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
