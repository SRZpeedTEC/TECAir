using Npgsql;
using TECAir.Application.DTOs.Baggages;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio de maletas usando SQL manual con Npgsql.
public sealed class PostgresBaggageRepository(NpgsqlDataSource dataSource) : IBaggageRepository
{
    public async Task<BaggageResponse?> GetByBagNumberAsync(
        int bagNumber,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                bag_number,
                confirmation_number,
                weight,
                color
            FROM tecair.baggage
            WHERE bag_number = @bag_number;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("bag_number", bagNumber);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapBaggageResponse(reader);
    }

    public async Task<IReadOnlyList<BaggageResponse>> GetByConfirmationNumberAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                bag_number,
                confirmation_number,
                weight,
                color
            FROM tecair.baggage
            WHERE confirmation_number = @confirmation_number
            ORDER BY bag_number ASC;
            """;

        var baggages = new List<BaggageResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("confirmation_number", confirmationNumber);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            baggages.Add(MapBaggageResponse(reader));
        }

        return baggages;
    }

    public async Task<BaggageResponse> CreateAsync(
        CreateBaggageRequest request,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO tecair.baggage (
                confirmation_number,
                weight,
                color
            )
            VALUES (
                @confirmation_number,
                @weight,
                @color
            )
            RETURNING
                bag_number,
                confirmation_number,
                weight,
                color;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("confirmation_number", request.ConfirmationNumber);
        command.Parameters.AddWithValue("weight", request.Weight);
        command.Parameters.AddWithValue("color", request.Color);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to create the baggage.");
        }

        return MapBaggageResponse(reader);
    }

    public async Task<BaggageResponse> UpdateAsync(
        int bagNumber,
        UpdateBaggageRequest request,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE tecair.baggage
            SET
                weight = @weight,
                color = @color
            WHERE bag_number = @bag_number
            RETURNING
                bag_number,
                confirmation_number,
                weight,
                color;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("bag_number", bagNumber);
        command.Parameters.AddWithValue("weight", request.Weight);
        command.Parameters.AddWithValue("color", request.Color);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to update the baggage.");
        }

        return MapBaggageResponse(reader);
    }

    public async Task DeleteAsync(int bagNumber, CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM tecair.baggage
            WHERE bag_number = @bag_number;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("bag_number", bagNumber);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<bool> BaggageExistsAsync(int bagNumber, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.baggage
                WHERE bag_number = @bag_number
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("bag_number", bagNumber);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> CheckInExistsAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.check_in
                WHERE confirmation_number = @confirmation_number
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("confirmation_number", confirmationNumber);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    private static BaggageResponse MapBaggageResponse(NpgsqlDataReader reader)
    {
        return new BaggageResponse
        {
            BagNumber = reader.GetInt32(0),
            ConfirmationNumber = reader.GetInt32(1),
            Weight = reader.GetDecimal(2),
            Color = reader.GetString(3)
        };
    }
}
