using Npgsql;
using TECAir.Application.DTOs.Seats;
using TECAir.Application.Interfaces;

namespace TECAir.Infrastructure.Repositories;

// Repositorio encargado de consultar asientos en PostgreSQL.
// Mantiene la logica SQL separada del controller y del servicio.
public sealed class PostgresSeatRepository(NpgsqlDataSource dataSource) : ISeatRepository
{
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

    // Lee los asientos del avion del vuelo y excluye los ocupados por check-in.
    // La ocupacion se resuelve por flight_in_itinerary porque check_in guarda itinerary_flight_id.
    public async Task<IReadOnlyList<AvailableSeatResponse>> GetAvailableSeatsAsync(
        int flightId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                s.plane_plate,
                s.seat_number,
                TRUE AS is_available
            FROM tecair.flight f
            INNER JOIN tecair.seat s
                ON s.plane_plate = f.plane_plate
            WHERE
                f.flight_id = @flight_id
                AND NOT EXISTS (
                    SELECT 1
                    FROM tecair.check_in ci
                    INNER JOIN tecair.flight_in_itinerary fii
                        ON fii.itinerary_flight_id = ci.itinerary_flight_id
                    WHERE
                        fii.flight_id = f.flight_id
                        AND ci.plane_plate = f.plane_plate
                        AND ci.seat_number = s.seat_number
                )
            ORDER BY
                CAST(SUBSTRING(s.seat_number FROM '^[0-9]+') AS INTEGER),
                SUBSTRING(s.seat_number FROM '[A-Z]$');
            """;

        var seats = new List<AvailableSeatResponse>();

        await using var command = dataSource.CreateCommand(sql);
        command.Parameters.AddWithValue("flight_id", flightId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            seats.Add(new AvailableSeatResponse
            {
                PlanePlate = reader.GetString(0),
                SeatNumber = reader.GetString(1),
                IsAvailable = reader.GetBoolean(2)
            });
        }

        return seats;
    }
}
