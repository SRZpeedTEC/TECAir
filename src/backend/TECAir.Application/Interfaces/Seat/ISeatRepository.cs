using TECAir.Application.DTOs.Seats;

namespace TECAir.Application.Interfaces;

// Contrato que aisla las consultas de asientos de los detalles de PostgreSQL.
public interface ISeatRepository
{
    // Verifica que el vuelo exista antes de consultar asientos asociados a su avion.
    Task<bool> FlightExistsAsync(int flightId, CancellationToken cancellationToken = default);

    // Lista asientos disponibles tomando check_in como fuente real de ocupacion.
    Task<IReadOnlyList<AvailableSeatResponse>> GetAvailableSeatsAsync(
        int flightId,
        CancellationToken cancellationToken = default);
}
