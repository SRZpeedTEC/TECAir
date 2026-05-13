using TECAir.Application.DTOs.Seats;

namespace TECAir.Application.Interfaces;

// Contrato de casos de uso de asientos que expone la capa de aplicacion.
public interface ISeatService
{
    // Consulta asientos disponibles para el avion del vuelo indicado.
    Task<GetAvailableSeatsServiceResult> GetAvailableSeatsAsync(
        int flightId,
        CancellationToken cancellationToken = default);
}
