using TECAir.Application.DTOs.Passengers;

namespace TECAir.Application.Interfaces;

// Contrato de persistencia para pasajeros.
public interface IPassengerRepository
{
    // Valida la existencia por pasaporte antes de crear reservas o pasajeros nuevos.
    Task<bool> ExistsAsync(string passportId, CancellationToken cancellationToken = default);

    // Inserta el pasajero y devuelve la fila creada.
    Task<PassengerResponse> CreateAsync(CreatePassengerRequest request, CancellationToken cancellationToken = default);
}
