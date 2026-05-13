namespace TECAir.Application.DTOs.Baggages;

// Resultado del caso de uso de creacion de maletas.
public class CreateBaggageServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public BaggageResponse? Baggage { get; private init; }

    public static CreateBaggageServiceResult Success(BaggageResponse baggage)
    {
        return new CreateBaggageServiceResult
        {
            IsSuccess = true,
            Baggage = baggage
        };
    }

    public static CreateBaggageServiceResult ValidationError(string errorMessage)
    {
        return new CreateBaggageServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static CreateBaggageServiceResult NotFound(string errorMessage)
    {
        return new CreateBaggageServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static CreateBaggageServiceResult Conflict(string errorMessage)
    {
        return new CreateBaggageServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
