using TECAir.Application.DTOs.Airports;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

// Servicio de aplicacion para busquedas de aeropuertos.
// Normaliza el texto recibido antes de pedir datos al repositorio.
public class AirportService(IAirportRepository airportRepository) : IAirportService
{
    // Busca coincidencias por termino. El controller valida que no venga vacio.
    public Task<IReadOnlyList<AirportSearchResponse>> SearchAsync(
        string term,
        CancellationToken cancellationToken = default)
    {
        return airportRepository.SearchAsync(term.Trim(), cancellationToken);
    }

    // Normaliza los codigos antes de consultar la tabla de referencia.
    public Task<AirportConnectionResponse?> GetConnectionAsync(
        string departureCode,
        string arrivalCode,
        CancellationToken cancellationToken = default)
    {
        return airportRepository.GetConnectionAsync(
            departureCode.Trim().ToUpperInvariant(),
            arrivalCode.Trim().ToUpperInvariant(),
            cancellationToken);
    }
}
