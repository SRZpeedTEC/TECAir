using TECAir.Application.DTOs.Planes;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para busquedas de aviones.
// La normalizacion queda aqui para que el repositorio solo reciba criterios listos para SQL.
public class PlaneService(IPlaneRepository planeRepository) : IPlaneService
{
    public Task<IReadOnlyList<PlaneResponse>> SearchAsync(
        string? plate,
        CancellationToken cancellationToken = default)
    {
        var normalizedPlate = string.IsNullOrWhiteSpace(plate) ? null : plate.Trim();
        return planeRepository.SearchAsync(normalizedPlate, cancellationToken);
    }
}
