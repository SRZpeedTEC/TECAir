namespace TECAir.Application.DTOs.Itineraries;

public class CreateItineraryServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public CreateItineraryResponse? Itinerary { get; private init; }

    public static CreateItineraryServiceResult Success(CreateItineraryResponse itinerary)
    {
        return new CreateItineraryServiceResult
        {
            IsSuccess = true,
            Itinerary = itinerary
        };
    }

    public static CreateItineraryServiceResult ValidationError(string errorMessage)
    {
        return new CreateItineraryServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static CreateItineraryServiceResult NotFound(string errorMessage)
    {
        return new CreateItineraryServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static CreateItineraryServiceResult Conflict(string errorMessage)
    {
        return new CreateItineraryServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
