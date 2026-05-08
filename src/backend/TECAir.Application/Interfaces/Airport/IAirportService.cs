using TECAir.Application.DTOs.Airports;

namespace TECAir.Application.Interfaces;

// Contrato del servicio de aeropuertos que consumen los controllers.
public interface IAirportService
{
    // Busca aeropuertos y devuelve DTOs listos para la respuesta HTTP.
    Task<IReadOnlyList<AirportSearchResponse>> SearchAsync(string term, CancellationToken cancellationToken = default);
}
