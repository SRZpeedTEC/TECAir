using TECAir.Application.DTOs.Airports;

namespace TECAir.Application.Interfaces;

// Contrato que define las consultas de aeropuertos disponibles para la aplicacion.
public interface IAirportRepository
{
    // Busca aeropuertos por un texto ya validado por capas superiores.
    Task<IReadOnlyList<AirportSearchResponse>> SearchAsync(string term, CancellationToken cancellationToken = default);
}
