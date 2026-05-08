using TECAir.Application.DTOs.Itineraries;
using TECAir.Application.Interfaces;

namespace TECAir.Application.Services;

public class ItineraryService(IItineraryRepository itineraryRepository) : IItineraryService
{
    public Task<IReadOnlyList<ItinerarySearchResponse>> SearchAsync(
        string originCode,
        string destinationCode,
        CancellationToken cancellationToken = default)
    {
        return itineraryRepository.SearchAsync(
            originCode.Trim().ToUpperInvariant(),
            destinationCode.Trim().ToUpperInvariant(),
            cancellationToken);
    }

    public Task<ItineraryDetailsResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default)
    {
        return itineraryRepository.GetByIdAsync(itineraryId, cancellationToken);
    }
}
