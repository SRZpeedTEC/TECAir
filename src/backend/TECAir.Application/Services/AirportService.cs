using TECAir.Application.DTOs.Airports;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

public class AirportService(IAirportRepository airportRepository) : IAirportService
{
    public Task<IReadOnlyList<AirportSearchResponse>> SearchAsync(
        string term,
        CancellationToken cancellationToken = default)
    {
        return airportRepository.SearchAsync(term.Trim(), cancellationToken);
    }
}
