namespace TECAir.Application.DTOs.Itineraries;

// Resultado del caso de uso de actualizacion de itinerario.
// El servicio informa si hubo validacion, faltante o conflicto sin conocer HTTP.
public class UpdateItineraryServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public CreateItineraryResponse? Itinerary { get; private init; }

    public static UpdateItineraryServiceResult Success(CreateItineraryResponse itinerary)
    {
        return new UpdateItineraryServiceResult
        {
            IsSuccess = true,
            Itinerary = itinerary
        };
    }

    public static UpdateItineraryServiceResult ValidationError(string errorMessage)
    {
        return new UpdateItineraryServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateItineraryServiceResult NotFound(string errorMessage)
    {
        return new UpdateItineraryServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateItineraryServiceResult Conflict(string errorMessage)
    {
        return new UpdateItineraryServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
