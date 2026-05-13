namespace TECAir.Application.DTOs.CheckIns;

// Resultado de la consulta de check-ins por reservacion.
public class GetCheckInsByReservationServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public string? ErrorMessage { get; private init; }
    public IReadOnlyList<CheckInResponse> CheckIns { get; private init; } = [];

    public static GetCheckInsByReservationServiceResult Success(IReadOnlyList<CheckInResponse> checkIns)
    {
        return new GetCheckInsByReservationServiceResult
        {
            IsSuccess = true,
            CheckIns = checkIns
        };
    }

    public static GetCheckInsByReservationServiceResult NotFound(string errorMessage)
    {
        return new GetCheckInsByReservationServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }
}
