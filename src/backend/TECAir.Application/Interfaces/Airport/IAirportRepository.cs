using TECAir.Application.DTOs.Airports;

namespace TECAir.Application.Interfaces;

// Contrato que define las consultas de aeropuertos disponibles para la aplicacion.
public interface IAirportRepository
{
    // Busca aeropuertos por un texto ya validado por capas superiores.
    Task<IReadOnlyList<AirportSearchResponse>> SearchAsync(string term, CancellationToken cancellationToken = default);

    // Devuelve la conexion configurada entre dos aeropuertos (distancia y duracion).
    // Devuelve null si no hay registro para ese par.
    Task<AirportConnectionResponse?> GetConnectionAsync(
        string departureCode,
        string arrivalCode,
        CancellationToken cancellationToken = default);
}
