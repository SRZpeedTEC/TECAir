using TECAir.Application.DTOs.Itineraries;

namespace TECAir.Application.Interfaces;

public interface IItineraryService
{
    Task<IReadOnlyList<ItinerarySearchResponse>> SearchAsync(
        string originCode,
        string destinationCode,
        CancellationToken cancellationToken = default);

    Task<ItineraryDetailsResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default);
}
