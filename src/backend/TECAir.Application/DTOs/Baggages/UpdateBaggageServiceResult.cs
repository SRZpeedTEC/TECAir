namespace TECAir.Application.DTOs.Baggages;

// Resultado del caso de uso de actualizacion de maletas.
public class UpdateBaggageServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public BaggageResponse? Baggage { get; private init; }

    public static UpdateBaggageServiceResult Success(BaggageResponse baggage)
    {
        return new UpdateBaggageServiceResult
        {
            IsSuccess = true,
            Baggage = baggage
        };
    }

    public static UpdateBaggageServiceResult ValidationError(string errorMessage)
    {
        return new UpdateBaggageServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateBaggageServiceResult NotFound(string errorMessage)
    {
        return new UpdateBaggageServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateBaggageServiceResult Conflict(string errorMessage)
    {
        return new UpdateBaggageServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
