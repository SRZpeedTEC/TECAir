using TECAir.Application.DTOs.Planes;

namespace TECAir.Application.Interfaces;

// Contrato que aisla las consultas de aviones de los detalles de PostgreSQL.
public interface IPlaneRepository
{
    // Busca aviones por placa opcional ya normalizada por el servicio.
    Task<IReadOnlyList<PlaneResponse>> SearchAsync(string? plate, CancellationToken cancellationToken = default);
}
