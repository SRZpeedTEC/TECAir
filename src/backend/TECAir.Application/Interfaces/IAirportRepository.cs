using TECAir.Application.DTOs.Airports;

namespace TECAir.Application.Interfaces;

public interface IAirportRepository
{
    Task<IReadOnlyList<AirportSearchResponse>> SearchAsync(string term, CancellationToken cancellationToken = default);
}
