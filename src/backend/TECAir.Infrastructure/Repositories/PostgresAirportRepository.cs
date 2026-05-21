using Npgsql;
using TECAir.Application.DTOs.Airports;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio encargado de consultar aeropuertos en PostgreSQL con Npgsql.
// Usa busqueda parcial para que el cliente pueda autocompletar por varios campos.
public sealed class PostgresAirportRepository(NpgsqlDataSource dataSource) : IAirportRepository
{
    // Busca por nombre, ciudad, pais o codigo de aeropuerto.
    public async Task<IReadOnlyList<AirportSearchResponse>> SearchAsync(
        string term,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                airport_name,
                city,
                country,
                code
            FROM tecair.airport
            WHERE
                airport_name ILIKE @pattern
                OR city ILIKE @pattern
                OR country ILIKE @pattern
                OR code ILIKE @pattern
            ORDER BY airport_name, city, country
            LIMIT 10;
            """;

        var airports = new List<AirportSearchResponse>();

        await using var command = dataSource.CreateCommand(sql);
        // El patron con % permite coincidencias parciales usando ILIKE.
        command.Parameters.AddWithValue("pattern", $"%{term}%");

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            airports.Add(new AirportSearchResponse
            {
                AirportName = reader.GetString(0),
                City = reader.GetString(1),
                Country = reader.GetString(2),
                Code = reader.GetString(3)
            });
        }

        return airports;
    }

    // Devuelve la fila de airport_connection para un par origen/destino, o null
    // si no esta configurada. Los codigos llegan ya normalizados desde el service.
    public async Task<AirportConnectionResponse?> GetConnectionAsync(
        string departureCode,
        string arrivalCode,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                departure_airport_code,
                arrival_airport_code,
                distance_miles,
                estimated_duration_minutes
            FROM tecair.airport_connection
            WHERE
                departure_airport_code = @departure_airport_code
                AND arrival_airport_code = @arrival_airport_code;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("departure_airport_code", departureCode);
        command.Parameters.AddWithValue("arrival_airport_code", arrivalCode);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new AirportConnectionResponse
        {
            DepartureAirportCode = reader.GetString(0),
            ArrivalAirportCode = reader.GetString(1),
            DistanceMiles = reader.GetInt32(2),
            EstimatedDurationMinutes = reader.GetInt32(3)
        };
    }
}
