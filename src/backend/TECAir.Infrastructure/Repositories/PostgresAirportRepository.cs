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
}
