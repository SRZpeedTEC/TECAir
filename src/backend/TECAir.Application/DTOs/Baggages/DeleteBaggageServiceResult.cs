namespace TECAir.Application.DTOs.Baggages;

// Resultado del borrado de maletas.
public class DeleteBaggageServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }

    public static DeleteBaggageServiceResult Success()
    {
        return new DeleteBaggageServiceResult
        {
            IsSuccess = true
        };
    }

    public static DeleteBaggageServiceResult NotFound(string errorMessage)
    {
        return new DeleteBaggageServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static DeleteBaggageServiceResult Conflict(string errorMessage)
    {
        return new DeleteBaggageServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
