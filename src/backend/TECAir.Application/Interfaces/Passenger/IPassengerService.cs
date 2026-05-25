using TECAir.Application.DTOs.Passengers;

namespace TECAir.Application.Interfaces;

// Contrato del caso de uso de pasajeros.
public interface IPassengerService
{
    // Crea un pasajero validando los datos de aplicacion antes de guardar.
    Task<CreatePassengerServiceResult> CreateAsync(
        CreatePassengerRequest request,
        CancellationToken cancellationToken = default);
}
