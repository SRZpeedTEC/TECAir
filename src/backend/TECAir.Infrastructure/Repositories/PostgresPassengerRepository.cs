using Npgsql;
using TECAir.Application.DTOs.Passengers;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio de pasajeros usando Npgsql.
// Centraliza el SQL para que la aplicacion no dependa de PostgreSQL.
public sealed class PostgresPassengerRepository(NpgsqlDataSource dataSource) : IPassengerRepository
{
    public async Task<bool> ExistsAsync(string passportId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.passenger
                WHERE passport_id = @passport_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("passport_id", passportId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<PassengerResponse> CreateAsync(
        CreatePassengerRequest request,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO tecair.passenger (
                passport_id,
                birthday,
                gender,
                name,
                Lname
            )
            VALUES (
                @passport_id,
                @birthday,
                @gender,
                @name,
                @lname
            )
            RETURNING
                passport_id,
                birthday,
                gender,
                name,
                Lname;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("passport_id", request.PassportId);
        command.Parameters.AddWithValue("birthday", request.Birthday.ToDateTime(TimeOnly.MinValue));
        command.Parameters.AddWithValue("gender", request.Gender);
        command.Parameters.AddWithValue("name", request.Name);
        command.Parameters.AddWithValue("lname", request.Lname);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to create the passenger.");
        }

        return MapPassengerResponse(reader);
    }

    // Convierte el genero guardado en la base al formato corto usado en los ejemplos de la API.
    private static PassengerResponse MapPassengerResponse(NpgsqlDataReader reader)
    {
        return new PassengerResponse
        {
            PassportId = reader.GetString(0),
            Birthday = DateOnly.FromDateTime(reader.GetDateTime(1)),
            Gender = ToApiGender(reader.GetString(2)),
            Name = reader.GetString(3),
            Lname = reader.GetString(4)
        };
    }

    private static string ToApiGender(string gender)
    {
        return gender switch
        {
            "MALE" => "M",
            "FEMALE" => "F",
            "OTHER" => "O",
            _ => gender
        };
    }
}
