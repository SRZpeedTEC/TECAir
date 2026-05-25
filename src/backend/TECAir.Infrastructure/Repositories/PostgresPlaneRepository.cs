using Npgsql;
using TECAir.Application.DTOs.Planes;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio de aviones en PostgreSQL.
// Mantiene la busqueda con parametros para evitar concatenar texto recibido por HTTP.
// El query tiene Cast explicito a text para que Postgres infiera el tipo cuando @plate llega NULL
public sealed class PostgresPlaneRepository(NpgsqlDataSource dataSource) : IPlaneRepository
{
    public async Task<IReadOnlyList<PlaneResponse>> SearchAsync(
        string? plate,
        CancellationToken cancellationToken = default)
    {

        const string sql = """
            SELECT
                plate,
                model,
                capacity
            FROM tecair.plane
            WHERE
                @plate::text IS NULL
                OR LOWER(plate) LIKE '%' || LOWER(@plate::text) || '%'
            ORDER BY plate ASC;
            """;

        var planes = new List<PlaneResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("plate", (object?)plate ?? DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            planes.Add(new PlaneResponse
            {
                Plate = reader.GetString(0),
                Model = reader.GetString(1),
                Capacity = reader.GetInt32(2)
            });
        }

        return planes;
    }
}
