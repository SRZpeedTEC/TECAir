namespace TECAir.Application.DTOs.Baggages;

// Resultado de la consulta de maletas por check-in.
public class GetBaggagesByCheckInServiceResult
{
    public bool IsSuccess { get; private init; }
    public bool IsNotFound { get; private init; }
    public string? ErrorMessage { get; private init; }
    public IReadOnlyList<BaggageResponse> Baggages { get; private init; } = [];

    public static GetBaggagesByCheckInServiceResult Success(IReadOnlyList<BaggageResponse> baggages)
    {
        return new GetBaggagesByCheckInServiceResult
        {
            IsSuccess = true,
            Baggages = baggages
        };
    }

    public static GetBaggagesByCheckInServiceResult NotFound(string errorMessage)
    {
        return new GetBaggagesByCheckInServiceResult
        {
            IsSuccess = false,
            IsNotFound = true,
            ErrorMessage = errorMessage
        };
    }
}
