namespace TECAir.Application.DTOs.CheckIns;

// Resultado del caso de uso de creacion de check-in.
public class CreateCheckInServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public CheckInResponse? CheckIn { get; private init; }

    public static CreateCheckInServiceResult Success(CheckInResponse checkIn)
    {
        return new CreateCheckInServiceResult
        {
            IsSuccess = true,
            CheckIn = checkIn
        };
    }

    public static CreateCheckInServiceResult ValidationError(string errorMessage)
    {
        return new CreateCheckInServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static CreateCheckInServiceResult NotFound(string errorMessage)
    {
        return new CreateCheckInServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static CreateCheckInServiceResult Conflict(string errorMessage)
    {
        return new CreateCheckInServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
