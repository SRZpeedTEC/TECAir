namespace TECAir.Application.DTOs.CheckIns;

// Resultado del borrado de check-in.
public class DeleteCheckInServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }

    public static DeleteCheckInServiceResult Success()
    {
        return new DeleteCheckInServiceResult
        {
            IsSuccess = true
        };
    }

    public static DeleteCheckInServiceResult NotFound(string errorMessage)
    {
        return new DeleteCheckInServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static DeleteCheckInServiceResult Conflict(string errorMessage)
    {
        return new DeleteCheckInServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
