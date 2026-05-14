namespace TECAir.Application.DTOs.CheckIns;

// Resultado del caso de uso de actualizacion de asiento de check-in.
public class UpdateCheckInServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public bool IsConflict { get; private init; }
    public string? ErrorMessage { get; private init; }
    public CheckInResponse? CheckIn { get; private init; }

    public static UpdateCheckInServiceResult Success(CheckInResponse checkIn)
    {
        return new UpdateCheckInServiceResult
        {
            IsSuccess = true,
            CheckIn = checkIn
        };
    }

    public static UpdateCheckInServiceResult ValidationError(string errorMessage)
    {
        return new UpdateCheckInServiceResult
        {
            IsSuccess = false,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateCheckInServiceResult NotFound(string errorMessage)
    {
        return new UpdateCheckInServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }

    public static UpdateCheckInServiceResult Conflict(string errorMessage)
    {
        return new UpdateCheckInServiceResult
        {
            IsSuccess = false,
            IsConflict = true,
            ErrorMessage = errorMessage
        };
    }
}
