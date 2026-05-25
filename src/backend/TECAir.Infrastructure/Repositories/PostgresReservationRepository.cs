using Npgsql;
using NpgsqlTypes;
using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.DTOs.Reservations;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio de reservaciones usando SQL parametrizado con Npgsql.
public sealed class PostgresReservationRepository(NpgsqlDataSource dataSource) : IReservationRepository
{
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

    public async Task<string?> GetItineraryStateAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT state
            FROM tecair.itinerary
            WHERE itinerary_id = @itinerary_id;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result as string;
    }

    public async Task<IReadOnlyList<ItineraryFlightAvailabilityData>> GetItineraryFlightAvailabilityAsync(
        int itineraryId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            WITH reservation_counts AS (
                SELECT
                    itinerary_id,
                    COUNT(*)::INTEGER AS reserved_seats
                FROM tecair.reservation
                WHERE itinerary_id = @itinerary_id
                GROUP BY itinerary_id
            )
            SELECT
                f.flight_id,
                f.state,
                f.plane_plate,
                p.capacity,
                COALESCE(rc.reserved_seats, 0) AS reserved_seats,
                p.capacity - COALESCE(rc.reserved_seats, 0) AS available_seats
            FROM tecair.flight_in_itinerary fii
            INNER JOIN tecair.flight f
                ON f.flight_id = fii.flight_id
            INNER JOIN tecair.plane p
                ON p.plate = f.plane_plate
            LEFT JOIN reservation_counts rc
                ON rc.itinerary_id = fii.itinerary_id
            WHERE fii.itinerary_id = @itinerary_id
            ORDER BY fii.flight_order;
            """;

        var flights = new List<ItineraryFlightAvailabilityData>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            flights.Add(new ItineraryFlightAvailabilityData
            {
                FlightId = reader.GetInt32(0),
                FlightState = reader.GetString(1),
                PlanePlate = reader.GetString(2),
                PlaneCapacity = reader.GetInt32(3),
                ReservedSeats = reader.GetInt32(4),
                AvailableSeats = reader.GetInt32(5)
            });
        }

        return flights;
    }

    public async Task CloseItineraryAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            UPDATE tecair.itinerary
            SET state = 'CLOSED'
            WHERE itinerary_id = @itinerary_id;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", itineraryId);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<bool> UserExistsAsync(string email, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.app_user
                WHERE LOWER(email) = LOWER(@email)
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("email", email);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> PassengerExistsAsync(string passengerId, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.passenger
                WHERE passport_id = @passenger_id
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("passenger_id", passengerId);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<bool> PaymentReferenceExistsAsync(
        string paymentReference,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT EXISTS (
                SELECT 1
                FROM tecair.reservation
                WHERE payment_reference = @payment_reference
            );
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("payment_reference", paymentReference);

        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is true;
    }

    public async Task<ReservationResponse> CreateAsync(
        CreateReservationRequest request,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            INSERT INTO tecair.reservation (
                itinerary_id,
                user_email,
                state,
                payment_reference,
                passenger_id
            )
            VALUES (
                @itinerary_id,
                @user_email,
                @state,
                @payment_reference,
                @passenger_id
            )
            RETURNING
                reservation_id,
                itinerary_id,
                user_email,
                passenger_id,
                state,
                payment_reference;
            """;

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("itinerary_id", request.ItineraryId);
        command.Parameters.AddWithValue("user_email", request.UserEmail);
        command.Parameters.AddWithValue("state", request.State);
        command.Parameters.AddWithValue("payment_reference", request.PaymentReference);
        command.Parameters.AddWithValue("passenger_id", request.PassengerId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            throw new InvalidOperationException("Failed to create the reservation.");
        }

        return MapReservationResponse(reader);
    }

    public async Task<IReadOnlyList<ReservationSearchResponse>> SearchAsync(
        int? reservationId,
        string? passengerId,
        string? name,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                r.reservation_id,
                r.itinerary_id,
                r.user_email,
                r.passenger_id,
                CONCAT(p.name, ' ', p.Lname) AS passenger_name,
                r.state,
                r.payment_reference
            FROM tecair.reservation r
            INNER JOIN tecair.passenger p
                ON p.passport_id = r.passenger_id
            INNER JOIN tecair.app_user u
                ON u.email = r.user_email
            INNER JOIN tecair.itinerary i
                ON i.itinerary_id = r.itinerary_id
            WHERE
                (@reservation_id IS NOT NULL AND r.reservation_id = @reservation_id)
                OR (@passenger_id IS NOT NULL AND r.passenger_id = @passenger_id)
                OR (
                    @name IS NOT NULL
                    AND (
                        LOWER(p.name) LIKE '%' || LOWER(@name) || '%'
                        OR LOWER(p.Lname) LIKE '%' || LOWER(@name) || '%'
                        OR LOWER(CONCAT_WS(' ', p.name, p.Lname)) LIKE '%' || LOWER(@name) || '%'
                    )
                )
            ORDER BY r.reservation_id ASC;
            """;

        var reservations = new List<ReservationSearchResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.Add("reservation_id", NpgsqlDbType.Integer).Value =
            (object?)reservationId ?? DBNull.Value;
        command.Parameters.Add("passenger_id", NpgsqlDbType.Varchar).Value =
            (object?)passengerId ?? DBNull.Value;
        command.Parameters.Add("name", NpgsqlDbType.Varchar).Value = (object?)name ?? DBNull.Value;

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            reservations.Add(new ReservationSearchResponse
            {
                ReservationId = reader.GetInt32(0),
                ItineraryId = reader.GetInt32(1),
                UserEmail = reader.GetString(2),
                PassengerId = reader.GetString(3),
                PassengerName = reader.GetString(4),
                State = reader.GetString(5),
                PaymentReference = reader.IsDBNull(6) ? null : reader.GetString(6)
            });
        }

        return reservations;
    }

    public async Task<IReadOnlyList<ReservationSearchResponse>> GetByUserEmailAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                r.reservation_id,
                r.itinerary_id,
                r.user_email,
                r.passenger_id,
                CONCAT_WS(' ', p.name, p.Lname) AS passenger_name,
                r.state,
                r.payment_reference
            FROM tecair.reservation r
            LEFT JOIN tecair.passenger p
                ON p.passport_id = r.passenger_id
            WHERE LOWER(r.user_email) = LOWER(@user_email)
            ORDER BY r.reservation_id DESC;
            """;

        var reservations = new List<ReservationSearchResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("user_email", email);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            reservations.Add(new ReservationSearchResponse
            {
                ReservationId = reader.GetInt32(0),
                ItineraryId = reader.GetInt32(1),
                UserEmail = reader.GetString(2),
                PassengerId = reader.IsDBNull(3) ? string.Empty : reader.GetString(3),
                PassengerName = reader.IsDBNull(4) ? string.Empty : reader.GetString(4),
                State = reader.GetString(5),
                PaymentReference = reader.IsDBNull(6) ? null : reader.GetString(6)
            });
        }

        return reservations;
    }

    private static ReservationResponse MapReservationResponse(NpgsqlDataReader reader)
    {
        return new ReservationResponse
        {
            ReservationId = reader.GetInt32(0),
            ItineraryId = reader.GetInt32(1),
            UserEmail = reader.GetString(2),
            PassengerId = reader.GetString(3),
            State = reader.GetString(4),
            PaymentReference = reader.GetString(5)
        };
    }
}
