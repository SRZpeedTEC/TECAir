using TECAir.Application.DTOs.Itineraries;

namespace TECAir.Application.Interfaces;

public interface IItineraryRepository
{
    Task<IReadOnlyList<ItinerarySearchResponse>> SearchAsync(
        string originCode,
        string destinationCode,
        CancellationToken cancellationToken = default);

    Task<ItineraryDetailsResponse?> GetByIdAsync(int itineraryId, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ItineraryFlightValidationData>> GetFlightsForCreateAsync(
        IReadOnlyCollection<int> flightIds,
        CancellationToken cancellationToken = default);

    Task<CreateItineraryResponse> CreateAsync(
        CreateItineraryRequest request,
        CancellationToken cancellationToken = default);
}
