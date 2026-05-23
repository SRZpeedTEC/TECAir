namespace TECAir.Application.DTOs.Itineraries;

// Resultado del caso de uso de disponibilidad de itinerario.
public class ItineraryAvailabilityServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public string? ErrorMessage { get; private init; }
    public ItineraryAvailabilityResponse? Availability { get; private init; }

    public static ItineraryAvailabilityServiceResult Success(ItineraryAvailabilityResponse availability)
    {
        return new ItineraryAvailabilityServiceResult
        {
            IsSuccess = true,
            Availability = availability
        };
    }

    public static ItineraryAvailabilityServiceResult ValidationError(string errorMessage)
    {
        return new ItineraryAvailabilityServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static ItineraryAvailabilityServiceResult NotFound(string errorMessage)
    {
        return new ItineraryAvailabilityServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }
}
