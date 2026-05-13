using TECAir.Application.DTOs.Seats;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// El servicio de asientos contiene las validaciones del caso de uso.
// No conoce HTTP ni SQL; coordina la consulta y decide si el vuelo existe.
public class SeatService(ISeatRepository seatRepository) : ISeatService
{
    // Consulta asientos libres usando check-in como fuente real de ocupacion.
    public async Task<GetAvailableSeatsServiceResult> GetAvailableSeatsAsync(
        int flightId,
        CancellationToken cancellationToken = default)
    {
        if (flightId <= 0 || !await seatRepository.FlightExistsAsync(flightId, cancellationToken))
        {
            return GetAvailableSeatsServiceResult.NotFound($"Flight '{flightId}' was not found.");
        }

        var seats = await seatRepository.GetAvailableSeatsAsync(flightId, cancellationToken);
        return GetAvailableSeatsServiceResult.Success(seats);
    }
}
