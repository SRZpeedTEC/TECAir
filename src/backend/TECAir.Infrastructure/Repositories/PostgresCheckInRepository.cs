using Npgsql;
using NpgsqlTypes;
using TECAir.Application.DTOs.CheckIns;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio de check-in usando SQL manual con Npgsql.
public sealed class PostgresCheckInRepository(NpgsqlDataSource dataSource) : ICheckInRepository
{
    public async Task<CheckInResponse?> GetByConfirmationNumberAsync(
        int confirmationNumber,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                confirmation_number,
                reservation_id,
                itinerary_flight_id,
                plane_plate,
                seat_number
            FROM tecair.check_in
            WHERE confirmation_number = @confirmation_number;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("confirmation_number", confirmationNumber);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapCheckInResponse(reader);
    }

    public async Task<IReadOnlyList<CheckInResponse>> GetByReservationIdAsync(
        int reservationId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                confirmation_number,
                reservation_id,
                itinerary_flight_id,
                plane_plate,
                seat_number
            FROM tecair.check_in
            WHERE reservation_id = @reservation_id
            ORDER BY itinerary_flight_id ASC, confirmation_number ASC;
            """;

        var checkIns = new List<CheckInResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("reservation_id", reservationId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            checkIns.Add(MapCheckInResponse(reader));
        }

        return checkIns;
    }

    public async Task<CheckInResponse> CreateAsync(
        CreateCheckInRequest request,
        CancellationToken cancellationToken = default)
    {
        await using var connection = await dataSource.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);

        const string insertSql = """
            INSERT INTO tecair.check_in (
                reservation_id,
                itinerary_flight_id,
                plane_plate,
                seat_number
            )
            VALUES (
                @reservation_id,
                @itinerary_flight_id,
                @plane_plate,
                @seat_number
            )
            RETURNING
                confirmation_number,
                reservation_id,
                itinerary_flight_id,
                plane_plate,
                seat_number;
            """;

        CheckInResponse checkIn;
        await using (var command = new NpgsqlCommand(insertSql, connection, transaction))
        {
            command.Parameters.AddWithValue("reservation_id", request.ReservationId);
            command.Parameters.AddWithValue("itinerary_flight_id", request.ItineraryFlightId);
            command.Parameters.AddWithValue("plane_plate", request.PlanePlate);
            command.Parameters.AddWithValue("seat_number", request.SeatNumber);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                throw new InvalidOperationException("Failed to create the check-in.");
            }

            checkIn = MapCheckInResponse(reader);
        }

        const string updateReservationSql = """
            UPDATE tecair.reservation
            SET state = 'CHECKED'
            WHERE reservation_id = @reservation_id
                AND state <> 'CHECKED';
            """;

        await using (var command = new NpgsqlCommand(updateReservationSql, connection, transaction))
        {
            command.Parameters.AddWithValue("reservation_id", request.ReservationId);
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
        return checkIn;
    }

    public async Task<CheckInResponse> UpdateSeatAsync(
        int confirmationNumber,
        UpdateCheckInSeatRequest request,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE tecair.check_in
            SET
                plane_plate = @plane_plate,
                seat_number = @seat_number
            WHERE confirmation_number = @confirmation_number
            RETURNING
                confirmation_number,
                reservation_id,
                itinerary_flight_id,
                plane_plate,
                seat_number;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("confirmation_number", confirmationNumber);
        command.Parameters.AddWithValue("plane_plate", request.PlanePlate);
        command.Parameters.AddWithValue("seat_number", request.SeatNumber);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to update the check-in.");
        }

        return MapCheckInResponse(reader);
    }

    public async Task DeleteAsync(int confirmationNumber, CancellationToken cancellationToken = default)
    {
        const string sql = """
            DELETE FROM tecair.check_in
            WHERE confirmation_number = @confirmation_number;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("confirmation_number", confirmationNumber);

        await command.ExecuteNonQueryAsync(cancellationToken);
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

    public async Task<bool> ReservationExistsAsync(int reservationId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.reservation
                WHERE reservation_id = @reservation_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("reservation_id", reservationId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> ItineraryFlightExistsAsync(
        int itineraryFlightId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight_in_itinerary
                WHERE itinerary_flight_id = @itinerary_flight_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_flight_id", itineraryFlightId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> SeatExistsAsync(
        string planePlate,
        string seatNumber,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.seat
                WHERE
                    plane_plate = @plane_plate
                    AND seat_number = @seat_number
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("plane_plate", planePlate);
        command.Parameters.AddWithValue("seat_number", seatNumber);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> SeatAlreadyTakenAsync(
        int itineraryFlightId,
        string planePlate,
        string seatNumber,
        int? excludingConfirmationNumber = null,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.check_in
                WHERE
                    itinerary_flight_id = @itinerary_flight_id
                    AND plane_plate = @plane_plate
                    AND seat_number = @seat_number
                    AND (
                        @excluding_confirmation_number IS NULL
                        OR confirmation_number <> @excluding_confirmation_number
                    )
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_flight_id", itineraryFlightId);
        command.Parameters.AddWithValue("plane_plate", planePlate);
        command.Parameters.AddWithValue("seat_number", seatNumber);
        command.Parameters.Add("excluding_confirmation_number", NpgsqlDbType.Integer).Value =
            (object?)excludingConfirmationNumber ?? DBNull.Value;

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> ReservationAlreadyCheckedForFlightAsync(
        int reservationId,
        int itineraryFlightId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.check_in
                WHERE
                    reservation_id = @reservation_id
                    AND itinerary_flight_id = @itinerary_flight_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("reservation_id", reservationId);
        command.Parameters.AddWithValue("itinerary_flight_id", itineraryFlightId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> ItineraryFlightBelongsToReservationItineraryAsync(
        int reservationId,
        int itineraryFlightId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.reservation r
                INNER JOIN tecair.flight_in_itinerary fii
                    ON fii.itinerary_id = r.itinerary_id
                WHERE
                    r.reservation_id = @reservation_id
                    AND fii.itinerary_flight_id = @itinerary_flight_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("reservation_id", reservationId);
        command.Parameters.AddWithValue("itinerary_flight_id", itineraryFlightId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> SeatBelongsToFlightPlaneAsync(
        int itineraryFlightId,
        string planePlate,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.flight_in_itinerary fii
                INNER JOIN tecair.flight f
                    ON f.flight_id = fii.flight_id
                WHERE
                    fii.itinerary_flight_id = @itinerary_flight_id
                    AND f.plane_plate = @plane_plate
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_flight_id", itineraryFlightId);
        command.Parameters.AddWithValue("plane_plate", planePlate);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    private static CheckInResponse MapCheckInResponse(NpgsqlDataReader reader)
    {
        return new CheckInResponse
        {
            ConfirmationNumber = reader.GetInt32(0),
            ReservationId = reader.GetInt32(1),
            ItineraryFlightId = reader.GetInt32(2),
            PlanePlate = reader.GetString(3),
            SeatNumber = reader.GetString(4)
        };
    }
}
