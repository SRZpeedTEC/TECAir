namespace TECAir.Application.DTOs.Itineraries;

// Resultado de busqueda de itinerarios con validacion de filtros.
public class ItinerarySearchServiceResult
{
    public bool IsSuccess { get; private init; }
    public string? ErrorMessage { get; private init; }
    public IReadOnlyList<ItinerarySearchResponse> Itineraries { get; private init; } = [];

    public static ItinerarySearchServiceResult Success(IReadOnlyList<ItinerarySearchResponse> itineraries)
    {
        return new ItinerarySearchServiceResult
        {
            IsSuccess = true,
            Itineraries = itineraries
        };
    }

    public static ItinerarySearchServiceResult ValidationError(string errorMessage)
    {
        return new ItinerarySearchServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }
}
