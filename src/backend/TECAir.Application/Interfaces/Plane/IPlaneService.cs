using TECAir.Application.DTOs.Planes;

namespace TECAir.Application.Interfaces;

// Contrato del caso de uso de consulta de aviones.
public interface IPlaneService
{
    // Devuelve todos los aviones o filtra por coincidencia parcial de placa.
    Task<IReadOnlyList<PlaneResponse>> SearchAsync(string? plate, CancellationToken cancellationToken = default);
}
